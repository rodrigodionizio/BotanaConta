-- ============================================================
-- BotaNaConta — Função de setup inicial do estabelecimento
--
-- Executa atomicamente (dentro de uma transação) com
-- permissões de SECURITY DEFINER, evitando problemas de
-- RLS no onboarding (chicken-and-egg).
--
-- Chamada via: supabase.rpc('setup_estabelecimento', { nome_estab: '...' })
-- ============================================================

CREATE OR REPLACE FUNCTION public.setup_estabelecimento(nome_estab TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID  := auth.uid();
  v_user_email TEXT;
  v_user_nome  TEXT;
  v_estab_id  UUID  := gen_random_uuid();
BEGIN
  -- Precisa estar autenticado
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- B-SETUP-03: impede duplo-setup (duplo clique ou reload)
  IF EXISTS (
    SELECT 1 FROM usuario_estabelecimento
     WHERE usuario_id = v_user_id AND ativo = true
  ) THEN
    RAISE EXCEPTION 'BNC_VINCULO_EXISTE'
      USING HINT = 'Usuário já possui vínculo ativo com um estabelecimento';
  END IF;

  -- Pega dados do auth
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  v_user_nome := split_part(v_user_email, '@', 1);

  -- 1. Usuário público (se não existir)
  INSERT INTO public.usuarios (id, nome, email)
  VALUES (v_user_id, v_user_nome, v_user_email)
  ON CONFLICT (id) DO NOTHING;

  -- 2. Estabelecimento
  INSERT INTO public.estabelecimentos (id, nome, ativo)
  VALUES (v_estab_id, nome_estab, true);

  -- 3. Vínculo ADMIN
  INSERT INTO public.usuario_estabelecimento (usuario_id, estabelecimento_id, perfil, ativo)
  VALUES (v_user_id, v_estab_id, 'ADMIN', true);

  -- 4. Configurações padrão
  INSERT INTO public.configuracoes_estabelecimento (
    estabelecimento_id,
    taxa_servico_pct, taxa_servico_ativa, moeda,
    tempo_ticket_pronto_visivel_min,
    permite_garcom_fechar_conta,
    permite_garcom_aplicar_desconto,
    alerta_sonoro_cozinha
  ) VALUES (
    v_estab_id,
    10, false, 'BRL',
    5, true, false, true
  );

  -- 5. 10 mesas padrão
  INSERT INTO public.mesas_preset (estabelecimento_id, nome, ativa, ordem_exibicao)
  SELECT
    v_estab_id,
    'Mesa ' || LPAD(n::text, 2, '0'),
    true,
    n
  FROM generate_series(1, 10) AS n;

  -- Retorna o estabelecimento criado
  RETURN (
    SELECT row_to_json(e)
    FROM public.estabelecimentos e
    WHERE e.id = v_estab_id
  );
END;
$$;

-- Garante que usuários autenticados podem chamar a função
GRANT EXECUTE ON FUNCTION public.setup_estabelecimento(TEXT) TO authenticated;
