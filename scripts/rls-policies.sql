-- ============================================================
-- BotaNaConta — Row Level Security Policies
--
-- COMO USAR:
--   Supabase SQL Editor → cole e execute inteiro.
--   Pode ser re-executado sem problema (DROP IF EXISTS + CREATE).
--
-- Premissa de perfis:
--   ADMIN   → gerencia tudo do estabelecimento
--   GARCOM  → lê cardápio, abre/edita comandas
--   COZINHA → lê tickets, atualiza status de preparo
-- ============================================================

-- ── Helpers (funções reutilizáveis em policies) ───────────────

-- C-01: SET search_path = public previne SQL injection via path hijacking em SECURITY DEFINER
CREATE OR REPLACE FUNCTION is_member_of(estab_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuario_estabelecimento
    WHERE usuario_id = auth.uid()
      AND estabelecimento_id = estab_id
      AND ativo = true
  )
$$;

CREATE OR REPLACE FUNCTION is_admin_of(estab_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuario_estabelecimento
    WHERE usuario_id = auth.uid()
      AND estabelecimento_id = estab_id
      AND perfil = 'ADMIN'
      AND ativo = true
  )
$$;

-- ── 1. usuarios ───────────────────────────────────────────────

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios: leitura própria" ON public.usuarios;
CREATE POLICY "usuarios: leitura própria"
  ON public.usuarios FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "usuarios: insert próprio" ON public.usuarios;
CREATE POLICY "usuarios: insert próprio"
  ON public.usuarios FOR INSERT
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "usuarios: update próprio" ON public.usuarios;
CREATE POLICY "usuarios: update próprio"
  ON public.usuarios FOR UPDATE
  USING (id = auth.uid());

-- B-USR-03 / B-USR-01: admins precisam ler dados dos membros da sua equipe
-- (necessário para o embed usuarios!usuario_id(...) funcionar no PostgREST)
DROP POLICY IF EXISTS "usuarios: admin da equipe lê" ON public.usuarios;
CREATE POLICY "usuarios: admin da equipe lê"
  ON public.usuarios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuario_estabelecimento ue
       WHERE ue.usuario_id = usuarios.id
         AND is_admin_of(ue.estabelecimento_id)
    )
  );

-- ── 2. estabelecimentos ───────────────────────────────────────

ALTER TABLE public.estabelecimentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estabelecimentos: membros lêem" ON public.estabelecimentos;
CREATE POLICY "estabelecimentos: membros lêem"
  ON public.estabelecimentos FOR SELECT
  USING (is_member_of(id));

-- Qualquer usuário autenticado pode criar (onboarding / primeiro setup)
DROP POLICY IF EXISTS "estabelecimentos: authenticated insere" ON public.estabelecimentos;
CREATE POLICY "estabelecimentos: authenticated insere"
  ON public.estabelecimentos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "estabelecimentos: admin atualiza" ON public.estabelecimentos;
CREATE POLICY "estabelecimentos: admin atualiza"
  ON public.estabelecimentos FOR UPDATE
  USING (is_admin_of(id));

-- ── 3. usuario_estabelecimento ────────────────────────────────

ALTER TABLE public.usuario_estabelecimento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vinculo: ver próprio" ON public.usuario_estabelecimento;
CREATE POLICY "vinculo: ver próprio"
  ON public.usuario_estabelecimento FOR SELECT
  USING (usuario_id = auth.uid() OR is_admin_of(estabelecimento_id));

-- INSERT via RPC SECURITY DEFINER (setup_estabelecimento, aceitar_convite) ou service_role.
-- A policy de INSERT para authenticated foi removida: qualquer INSERT de browser
-- poderia vincular um usuário a um estabelecimento cujo UUID ele descubra.
-- Todas as rotas de criação de vínculo passam por RPCs ou Server Actions com adminClient.
DROP POLICY IF EXISTS "vinculo: insert próprio" ON public.usuario_estabelecimento;

DROP POLICY IF EXISTS "vinculo: admin gerencia" ON public.usuario_estabelecimento;
CREATE POLICY "vinculo: admin gerencia"
  ON public.usuario_estabelecimento FOR UPDATE
  USING (is_admin_of(estabelecimento_id));

DROP POLICY IF EXISTS "vinculo: admin deleta" ON public.usuario_estabelecimento;
CREATE POLICY "vinculo: admin deleta"
  ON public.usuario_estabelecimento FOR DELETE
  USING (is_admin_of(estabelecimento_id));

-- ── 4. configuracoes_estabelecimento ─────────────────────────

ALTER TABLE public.configuracoes_estabelecimento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "config: membros lêem" ON public.configuracoes_estabelecimento;
CREATE POLICY "config: membros lêem"
  ON public.configuracoes_estabelecimento FOR SELECT
  USING (is_member_of(estabelecimento_id));

DROP POLICY IF EXISTS "config: admin insere" ON public.configuracoes_estabelecimento;
CREATE POLICY "config: admin insere"
  ON public.configuracoes_estabelecimento FOR INSERT
  WITH CHECK (is_admin_of(estabelecimento_id) OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "config: admin atualiza" ON public.configuracoes_estabelecimento;
CREATE POLICY "config: admin atualiza"
  ON public.configuracoes_estabelecimento FOR UPDATE
  USING (is_admin_of(estabelecimento_id));

-- ── 5. mesas_preset ───────────────────────────────────────────

ALTER TABLE public.mesas_preset ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mesas: membros lêem" ON public.mesas_preset;
CREATE POLICY "mesas: membros lêem"
  ON public.mesas_preset FOR SELECT
  USING (is_member_of(estabelecimento_id));

DROP POLICY IF EXISTS "mesas: admin insere" ON public.mesas_preset;
CREATE POLICY "mesas: admin insere"
  ON public.mesas_preset FOR INSERT
  WITH CHECK (is_admin_of(estabelecimento_id) OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "mesas: admin atualiza" ON public.mesas_preset;
CREATE POLICY "mesas: admin atualiza"
  ON public.mesas_preset FOR UPDATE
  USING (is_admin_of(estabelecimento_id));

DROP POLICY IF EXISTS "mesas: admin deleta" ON public.mesas_preset;
CREATE POLICY "mesas: admin deleta"
  ON public.mesas_preset FOR DELETE
  USING (is_admin_of(estabelecimento_id));

-- ── 6. categorias_produto ─────────────────────────────────────

ALTER TABLE public.categorias_produto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categorias: membros lêem" ON public.categorias_produto;
CREATE POLICY "categorias: membros lêem"
  ON public.categorias_produto FOR SELECT
  USING (is_member_of(estabelecimento_id));

DROP POLICY IF EXISTS "categorias: admin gerencia" ON public.categorias_produto;
CREATE POLICY "categorias: admin gerencia"
  ON public.categorias_produto FOR ALL
  USING (is_admin_of(estabelecimento_id));

-- ── 7. produtos ───────────────────────────────────────────────

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "produtos: membros lêem" ON public.produtos;
CREATE POLICY "produtos: membros lêem"
  ON public.produtos FOR SELECT
  USING (is_member_of(estabelecimento_id));

DROP POLICY IF EXISTS "produtos: admin gerencia" ON public.produtos;
CREATE POLICY "produtos: admin gerencia"
  ON public.produtos FOR ALL
  USING (is_admin_of(estabelecimento_id));

-- ── 8. fotos_produto ──────────────────────────────────────────

ALTER TABLE public.fotos_produto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fotos: membros lêem" ON public.fotos_produto;
CREATE POLICY "fotos: membros lêem"
  ON public.fotos_produto FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM produtos p
      WHERE p.id = produto_id AND is_member_of(p.estabelecimento_id)
    )
  );

DROP POLICY IF EXISTS "fotos: admin gerencia" ON public.fotos_produto;
CREATE POLICY "fotos: admin gerencia"
  ON public.fotos_produto FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM produtos p
      WHERE p.id = produto_id AND is_admin_of(p.estabelecimento_id)
    )
  );

-- ── 9. comandas ───────────────────────────────────────────────

ALTER TABLE public.comandas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comandas: membros lêem" ON public.comandas;
CREATE POLICY "comandas: membros lêem"
  ON public.comandas FOR SELECT
  USING (is_member_of(estabelecimento_id));

DROP POLICY IF EXISTS "comandas: garcom/admin insere" ON public.comandas;
CREATE POLICY "comandas: garcom/admin insere"
  ON public.comandas FOR INSERT
  WITH CHECK (is_member_of(estabelecimento_id) AND aberta_por = auth.uid());

DROP POLICY IF EXISTS "comandas: garcom/admin atualiza" ON public.comandas;
CREATE POLICY "comandas: garcom/admin atualiza"
  ON public.comandas FOR UPDATE
  USING (is_member_of(estabelecimento_id));

-- ── 10. comanda_itens ─────────────────────────────────────────

ALTER TABLE public.comanda_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "itens: membros lêem" ON public.comanda_itens;
CREATE POLICY "itens: membros lêem"
  ON public.comanda_itens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM comandas c
      WHERE c.id = comanda_id AND is_member_of(c.estabelecimento_id)
    )
  );

-- C-04: Bloquear INSERT de itens em comanda que não está ATIVA
DROP POLICY IF EXISTS "itens: garcom insere" ON public.comanda_itens;
CREATE POLICY "itens: garcom insere"
  ON public.comanda_itens FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM comandas c
      WHERE c.id = comanda_id
        AND is_member_of(c.estabelecimento_id)
        AND c.status = 'ATIVA'    -- apenas comandas abertas recebem itens
    )
  );

DROP POLICY IF EXISTS "itens: garcom/cozinha atualiza" ON public.comanda_itens;
CREATE POLICY "itens: garcom/cozinha atualiza"
  ON public.comanda_itens FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM comandas c
      WHERE c.id = comanda_id AND is_member_of(c.estabelecimento_id)
    )
  );

-- ── 11. tickets_cozinha ───────────────────────────────────────

ALTER TABLE public.tickets_cozinha ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets: membros lêem" ON public.tickets_cozinha;
CREATE POLICY "tickets: membros lêem"
  ON public.tickets_cozinha FOR SELECT
  USING (is_member_of(estabelecimento_id));

DROP POLICY IF EXISTS "tickets: sistema insere" ON public.tickets_cozinha;
CREATE POLICY "tickets: sistema insere"
  ON public.tickets_cozinha FOR INSERT
  WITH CHECK (is_member_of(estabelecimento_id));

-- C-03: Apenas ADMIN e COZINHA podem atualizar tickets; GARCOM só leitura
DROP POLICY IF EXISTS "tickets: cozinha atualiza" ON public.tickets_cozinha;
CREATE POLICY "tickets: cozinha atualiza"
  ON public.tickets_cozinha FOR UPDATE
  USING (
    is_member_of(estabelecimento_id)
    AND EXISTS (
      SELECT 1 FROM usuario_estabelecimento ue
      WHERE ue.usuario_id = auth.uid()
        AND ue.estabelecimento_id = tickets_cozinha.estabelecimento_id
        AND ue.perfil IN ('ADMIN', 'COZINHA')
        AND ue.ativo = true
    )
  );

-- ── 12. pagamentos ────────────────────────────────────────────

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pagamentos: membros lêem" ON public.pagamentos;
CREATE POLICY "pagamentos: membros lêem"
  ON public.pagamentos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM comandas c
      WHERE c.id = comanda_id AND is_member_of(c.estabelecimento_id)
    )
  );

-- C-05: Pagamento só pode ser registrado em comanda CONTA_PEDIDA
DROP POLICY IF EXISTS "pagamentos: garcom insere" ON public.pagamentos;
CREATE POLICY "pagamentos: garcom insere"
  ON public.pagamentos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM comandas c
      WHERE c.id = comanda_id
        AND is_member_of(c.estabelecimento_id)
        AND c.status = 'CONTA_PEDIDA'   -- proteção RLS: dupla camada com trigger
    )
  );

-- ── 13. comanda_eventos ───────────────────────────────────────

ALTER TABLE public.comanda_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eventos: membros lêem" ON public.comanda_eventos;
CREATE POLICY "eventos: membros lêem"
  ON public.comanda_eventos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM comandas c
      WHERE c.id = comanda_id AND is_member_of(c.estabelecimento_id)
    )
  );

DROP POLICY IF EXISTS "eventos: membros inserem" ON public.comanda_eventos;
CREATE POLICY "eventos: membros inserem"
  ON public.comanda_eventos FOR INSERT
  WITH CHECK (
    -- Triggers de banco inserem eventos sem contexto JWT (auth.uid() IS NULL);
    -- membros autenticados podem também inserir manualmente.
    -- A política de SELECT garante que só membros vejam eventos do seu estabelecimento.
    EXISTS (
      SELECT 1 FROM public.comandas c
      WHERE c.id = comanda_id
        AND (
          auth.uid() IS NULL                    -- trigger SECURITY DEFINER sem JWT
          OR is_member_of(c.estabelecimento_id) -- membro autenticado
        )
    )
  );

-- ── Realtime: habilitar para tabelas que precisam de live updates ──
-- Usa DO block para evitar erro 42710 "already member of publication" na re-execução.

DO $$
DECLARE
  tabelas TEXT[] := ARRAY[
    'public.comandas',
    'public.comanda_itens',
    'public.tickets_cozinha',
    'public.comanda_eventos',
    'public.pagamentos'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname || '.' || tablename = t
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE ' || t;
    END IF;
  END LOOP;
END;
$$;

ALTER TABLE public.comanda_eventos REPLICA IDENTITY FULL;
ALTER TABLE public.pagamentos      REPLICA IDENTITY FULL;
