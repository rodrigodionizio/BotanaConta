-- ============================================================
-- BotaNaConta — Patch v1.1
-- Correções de segurança, integridade e performance
--
-- Baseado em: audit-bota-na-conta.md (Abril 2026)
-- Execute no SQL Editor do Supabase (service_role) APÓS o schema base.
-- Pode ser re-executado sem efeitos colaterais (CREATE OR REPLACE / IF NOT EXISTS).
-- ============================================================

-- ============================================================
-- A-01 · Máquina de estados da comanda
-- Impede transições ilegais: FECHADA→qualquer, CANCELADA→qualquer,
-- CONTA_PEDIDA→ATIVA (reversão proibida).
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_validar_transicao_status_comanda()
RETURNS trigger
LANGUAGE plpgsql AS $func$
BEGIN
  -- Impede reverter CONTA_PEDIDA de volta para ATIVA
  IF OLD.status = 'CONTA_PEDIDA' AND NEW.status = 'ATIVA' THEN
    RAISE EXCEPTION 'Não é permitido reverter comanda de CONTA_PEDIDA para ATIVA.';
  END IF;

  -- Comanda encerrada é imutável
  IF OLD.status IN ('FECHADA', 'CANCELADA') THEN
    RAISE EXCEPTION 'Comanda % já está %. Nenhuma alteração de status é permitida.',
      OLD.id, OLD.status;
  END IF;

  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_validar_transicao_status_comanda ON public.comandas;
CREATE TRIGGER trg_validar_transicao_status_comanda
  BEFORE UPDATE ON public.comandas
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.fn_validar_transicao_status_comanda();

-- ============================================================
-- A-02 · Bloquear remoção de item que está EM_PREPARO ou PRONTO
-- Garçom recebe exceção clara; admin deve cancelar pelo painel.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_validar_remocao_item()
RETURNS trigger
LANGUAGE plpgsql AS $func$
DECLARE
  v_ticket_status text;
BEGIN
  SELECT status INTO v_ticket_status
  FROM public.tickets_cozinha
  WHERE comanda_item_id = OLD.id
  LIMIT 1;

  IF v_ticket_status IN ('EM_PREPARO', 'PRONTO') THEN
    RAISE EXCEPTION
      'Item "%" está % na cozinha e não pode ser removido sem autorização do admin.',
      OLD.produto_nome_snapshot, v_ticket_status;
  END IF;

  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_validar_remocao_item ON public.comanda_itens;
CREATE TRIGGER trg_validar_remocao_item
  BEFORE UPDATE ON public.comanda_itens
  FOR EACH ROW
  WHEN (OLD.status = 'ATIVO' AND NEW.status = 'REMOVIDO')
  EXECUTE FUNCTION public.fn_validar_remocao_item();

-- ============================================================
-- A-03 · Motivos obrigatórios para desconto e cancelamento
-- ============================================================
ALTER TABLE public.comandas
  ADD CONSTRAINT IF NOT EXISTS chk_desconto_motivo_obrigatorio
    CHECK (desconto_valor = 0 OR desconto_motivo IS NOT NULL),
  ADD CONSTRAINT IF NOT EXISTS chk_cancelamento_motivo_obrigatorio
    CHECK (status <> 'CANCELADA' OR motivo_cancelamento IS NOT NULL);

-- ============================================================
-- A-04 · Audit trail: quem aplicou o desconto
-- ============================================================
ALTER TABLE public.comandas
  ADD COLUMN IF NOT EXISTS desconto_aplicado_por uuid REFERENCES public.usuarios(id);

-- ============================================================
-- A-05 · Proteger campos snapshot de comanda_itens
-- preco_unitario_snapshot, produto_nome_snapshot e vai_para_cozinha_snapshot
-- são imutáveis após inserção — qualquer tentativa lança exceção.
-- Prefixo 'trg_aaa_' garante execução antes do trigger atualizado_em.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_proteger_snapshot_item()
RETURNS trigger
LANGUAGE plpgsql AS $func$
BEGIN
  IF OLD.preco_unitario_snapshot   IS DISTINCT FROM NEW.preco_unitario_snapshot
  OR OLD.produto_nome_snapshot      IS DISTINCT FROM NEW.produto_nome_snapshot
  OR OLD.vai_para_cozinha_snapshot  IS DISTINCT FROM NEW.vai_para_cozinha_snapshot
  THEN
    RAISE EXCEPTION
      'Campos snapshot de comanda_itens são imutáveis após inserção. Item: %, comanda: %',
      OLD.produto_nome_snapshot, OLD.comanda_id;
  END IF;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_aaa_proteger_snapshot_item ON public.comanda_itens;
CREATE TRIGGER trg_aaa_proteger_snapshot_item
  BEFORE UPDATE ON public.comanda_itens
  FOR EACH ROW EXECUTE FUNCTION public.fn_proteger_snapshot_item();

-- ============================================================
-- A-06 · Bloquear edição de valores financeiros em comanda FECHADA
-- total_bruto, desconto_valor e taxa_servico_pct são imutáveis
-- após fechamento — protege integridade fiscal.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_bloquear_edicao_comanda_fechada()
RETURNS trigger
LANGUAGE plpgsql AS $func$
BEGIN
  IF OLD.status = 'FECHADA' AND (
    OLD.total_bruto       IS DISTINCT FROM NEW.total_bruto      OR
    OLD.desconto_valor    IS DISTINCT FROM NEW.desconto_valor   OR
    OLD.taxa_servico_pct  IS DISTINCT FROM NEW.taxa_servico_pct
  ) THEN
    RAISE EXCEPTION
      'Comanda % já está FECHADA. Valores financeiros não podem ser alterados.', OLD.id;
  END IF;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_bloquear_edicao_comanda_fechada ON public.comandas;
CREATE TRIGGER trg_bloquear_edicao_comanda_fechada
  BEFORE UPDATE ON public.comandas
  FOR EACH ROW EXECUTE FUNCTION public.fn_bloquear_edicao_comanda_fechada();

-- ============================================================
-- A-08 · Índice composto para query "minhas comandas abertas" (garçom)
-- Parcial: apenas linhas com status ATIVA ou CONTA_PEDIDA
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_comandas_aberta_por_status
  ON public.comandas(aberta_por, status)
  WHERE status IN ('ATIVA', 'CONTA_PEDIDA');

-- ============================================================
-- C-05 · Trigger dupla proteção: valida status antes de pagamento
-- (RLS é a 1ª camada; trigger é a 2ª)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_validar_status_para_pagamento()
RETURNS trigger
LANGUAGE plpgsql AS $func$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status
  FROM public.comandas WHERE id = NEW.comanda_id;

  IF v_status NOT IN ('CONTA_PEDIDA', 'FECHADA') THEN
    RAISE EXCEPTION
      'Pagamento só pode ser registrado quando comanda está CONTA_PEDIDA. Status atual: %',
      v_status;
  END IF;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_validar_status_para_pagamento ON public.pagamentos;
CREATE TRIGGER trg_validar_status_para_pagamento
  BEFORE INSERT ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.fn_validar_status_para_pagamento();

-- ============================================================
-- M-03 · View v_fila_cozinha
-- Encapsula lógica de expiração de tickets PRONTO com base
-- em tempo_ticket_pronto_visivel_min das configurações.
-- ============================================================
CREATE OR REPLACE VIEW public.v_fila_cozinha AS
SELECT
  t.*,
  CASE
    WHEN t.status = 'PRONTO' THEN
      GREATEST(0,
        EXTRACT(EPOCH FROM (
          t.concluido_em
          + (cfg.tempo_ticket_pronto_visivel_min * interval '1 minute')
          - now()
        ))::int
      )
    ELSE NULL
  END AS segundos_ate_ocultar
FROM public.tickets_cozinha t
JOIN public.configuracoes_estabelecimento cfg
  ON cfg.estabelecimento_id = t.estabelecimento_id
WHERE
  t.status IN ('PENDENTE', 'EM_PREPARO')
  OR (
    t.status = 'PRONTO'
    AND t.concluido_em + (cfg.tempo_ticket_pronto_visivel_min * interval '1 minute') > now()
  )
ORDER BY
  CASE t.status
    WHEN 'PENDENTE'    THEN 1
    WHEN 'EM_PREPARO'  THEN 2
    WHEN 'PRONTO'      THEN 3
  END,
  t.criado_em ASC;

COMMENT ON VIEW public.v_fila_cozinha IS
  'Fila ativa da cozinha com tempo restante para ocultar tickets PRONTO.';

-- ============================================================
-- M-05 · fn_recalcular_total_comanda com SELECT FOR UPDATE
-- Serializa recálculos concorrentes para evitar race condition.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_recalcular_total_comanda()
RETURNS trigger
LANGUAGE plpgsql AS $func$
DECLARE
  v_comanda_id uuid;
  v_novo_total numeric(10,2);
BEGIN
  v_comanda_id := COALESCE(NEW.comanda_id, OLD.comanda_id);

  -- Lock na linha da comanda para serializar recálculos concorrentes
  PERFORM id FROM public.comandas
  WHERE id = v_comanda_id FOR UPDATE;

  SELECT COALESCE(SUM(subtotal), 0.00)
  INTO v_novo_total
  FROM public.comanda_itens
  WHERE comanda_id = v_comanda_id
    AND status = 'ATIVO';

  UPDATE public.comandas
  SET total_bruto = v_novo_total
  WHERE id = v_comanda_id;

  RETURN NULL;
END;
$func$;

-- ============================================================
-- M-06 · Bloquear TRUNCATE em comanda_eventos
-- RULES não cobrem TRUNCATE — trigger é a única proteção.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_bloquear_truncate_eventos()
RETURNS trigger
LANGUAGE plpgsql AS $func$
BEGIN
  RAISE EXCEPTION 'TRUNCATE em comanda_eventos não é permitido. Tabela de log imutável.';
  RETURN NULL;
END;
$func$;

DROP TRIGGER IF EXISTS trg_bloquear_truncate_eventos ON public.comanda_eventos;
CREATE TRIGGER trg_bloquear_truncate_eventos
  BEFORE TRUNCATE ON public.comanda_eventos
  EXECUTE FUNCTION public.fn_bloquear_truncate_eventos();

REVOKE TRUNCATE ON public.comanda_eventos FROM authenticated;
REVOKE TRUNCATE ON public.comanda_eventos FROM anon;

-- ============================================================
-- M-11 · Índice GIN com unaccent para busca de produtos
-- Busca por "espetinho" encontrará "Espétinho" etc.
-- ============================================================
DROP INDEX IF EXISTS public.idx_produtos_nome_trgm;
CREATE INDEX idx_produtos_nome_trgm
  ON public.produtos USING gin(unaccent(nome) gin_trgm_ops);

-- ============================================================
-- M-12 · fn_snapshot_produto_no_item valida status da comanda
-- Segunda linha de defesa após RLS (C-04).
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_snapshot_produto_no_item()
RETURNS trigger
LANGUAGE plpgsql AS $func$
DECLARE
  v_produto      RECORD;
  v_status_cmd   text;
BEGIN
  -- Verifica produto
  SELECT nome, preco, vai_para_cozinha, tipo_preparo, disponivel
  INTO v_produto
  FROM public.produtos WHERE id = NEW.produto_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto % não encontrado.', NEW.produto_id;
  END IF;

  IF NOT v_produto.disponivel THEN
    RAISE EXCEPTION 'Produto "%" está indisponível.', v_produto.nome;
  END IF;

  -- Verifica status da comanda (segunda linha de defesa)
  SELECT status INTO v_status_cmd
  FROM public.comandas WHERE id = NEW.comanda_id;

  IF v_status_cmd <> 'ATIVA' THEN
    RAISE EXCEPTION
      'Não é possível adicionar itens a uma comanda com status %. Comanda: %',
      v_status_cmd, NEW.comanda_id;
  END IF;

  -- Preenche snapshots
  NEW.produto_nome_snapshot     := v_produto.nome;
  NEW.preco_unitario_snapshot   := v_produto.preco;
  NEW.vai_para_cozinha_snapshot := v_produto.vai_para_cozinha;
  NEW.tipo_preparo_snapshot     := v_produto.tipo_preparo;
  NEW.subtotal                  := v_produto.preco * NEW.quantidade;

  RETURN NEW;
END;
$func$;

-- ============================================================
-- B-02 · COMMENT ON TYPE para todos os ENUMs
-- ============================================================
COMMENT ON TYPE public.perfil_usuario
  IS 'Perfil de acesso: ADMIN (proprietário/gerente), GARCOM (atendente), COZINHA (preparo)';

COMMENT ON TYPE public.status_comanda
  IS 'Ciclo de vida: ATIVA → CONTA_PEDIDA → FECHADA | ATIVA/CONTA_PEDIDA → CANCELADA';

COMMENT ON TYPE public.status_ticket_cozinha
  IS 'Fila da cozinha: PENDENTE → EM_PREPARO → PRONTO | cancelável em qualquer ponto';

COMMENT ON TYPE public.tipo_preparo
  IS 'Método de preparo: FRITAR 🟠 ASSAR 🔴 COZINHAR 🔵 ESQUENTAR 🟡 MONTAR 🟢';

COMMENT ON TYPE public.forma_pagamento
  IS 'Formas aceitas: PIX | CARTAO_CREDITO | CARTAO_DEBITO | DINHEIRO | VOUCHER | CORTESIA';

COMMENT ON TYPE public.status_item_comanda
  IS 'Estado do item: ATIVO (na conta, visível) | REMOVIDO (soft-delete, preserva histórico)';

COMMENT ON TYPE public.tipo_evento_comanda
  IS 'Tipos de eventos do log imutável de cada comanda';

-- ============================================================
-- B-05 · atualizado_em em mesas_preset e categorias_produto
-- ============================================================
ALTER TABLE public.mesas_preset
  ADD COLUMN IF NOT EXISTS atualizado_em timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.categorias_produto
  ADD COLUMN IF NOT EXISTS atualizado_em timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_mesas_preset_atualizado_em ON public.mesas_preset;
CREATE TRIGGER trg_mesas_preset_atualizado_em
  BEFORE UPDATE ON public.mesas_preset
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_atualizado_em();

DROP TRIGGER IF EXISTS trg_categorias_atualizado_em ON public.categorias_produto;
CREATE TRIGGER trg_categorias_atualizado_em
  BEFORE UPDATE ON public.categorias_produto
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_atualizado_em();

-- ============================================================
-- B-06 · Revogar acesso de usuários autenticados à view de funções
-- Código-fonte das funções não deve ser exposto para authenticated.
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views
             WHERE table_schema = 'dre' AND table_name = 'v_funcoes') THEN
    REVOKE SELECT ON dre.v_funcoes FROM authenticated;
    GRANT  SELECT ON dre.v_funcoes TO service_role;
  END IF;
END
$$;

-- ============================================================
-- Verificação pós-patch
-- ============================================================
DO $$
DECLARE
  v_trigger_count int;
  v_policy_count  int;
BEGIN
  SELECT COUNT(*) INTO v_trigger_count
  FROM information_schema.triggers WHERE trigger_schema = 'public';

  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies WHERE schemaname = 'public';

  RAISE NOTICE 'Patch v1.1 aplicado. Triggers: %, Policies: %',
    v_trigger_count, v_policy_count;
END;
$$;
