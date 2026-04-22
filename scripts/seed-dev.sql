-- ============================================================
-- BotaNaConta — Seed de desenvolvimento / primeiro setup
-- 
-- COMO USAR:
--   1. Abra o Supabase SQL Editor em:
--      https://supabase.com/dashboard/project/idzsatexactvsogildpc/sql
--   2. Substitua <SEU_USER_ID> pelo seu UID do Supabase Auth:
--      Dashboard → Authentication → Users → copie a coluna "UID"
--   3. Execute o script inteiro (Run)
--
-- Este script:
--   • Cria um registro em `usuarios` (caso trigger não exista)
--   • Cria um estabelecimento "Meu Bar"
--   • Vincula seu usuário como ADMIN
--   • Insere configurações padrão
--   • Cria 12 mesas pré-configuradas
--   • Cria 3 categorias e 10 produtos de exemplo
-- ============================================================

-- ── CONFIGURAR: substitua pelo seu UID ───────────────────────
DO $$
DECLARE
  v_user_id   UUID := '<SEU_USER_ID>';   -- ← AUTH UID aqui
  v_user_email TEXT := '<SEU_EMAIL>';    -- ← email aqui
  v_estab_id  UUID := gen_random_uuid();
  v_cat1_id   UUID := gen_random_uuid();
  v_cat2_id   UUID := gen_random_uuid();
  v_cat3_id   UUID := gen_random_uuid();
BEGIN
  -- A-07: Validar que os placeholders foram substituídos antes de qualquer INSERT
  IF v_user_id::text = '<SEU_USER_ID>' THEN
    RAISE EXCEPTION
      'Substitua <SEU_USER_ID> pelo UID real do Supabase Auth antes de executar este script. '
      'Dashboard → Authentication → Users → copie a coluna "UID".';
  END IF;

  IF v_user_email = '<SEU_EMAIL>' THEN
    RAISE EXCEPTION
      'Substitua <SEU_EMAIL> pelo e-mail real do usuário antes de executar este script.';
  END IF;

  -- Validar que o UID existe em auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION
      'UID % não encontrado em auth.users. '
      'Verifique o valor de v_user_id e certifique-se de que o usuário foi criado no Supabase Auth.',
      v_user_id;
  END IF;

  -- 1. Usuário público (caso trigger on auth.users não exista)
  INSERT INTO public.usuarios (id, nome, email)
  VALUES (v_user_id, 'Administrador', v_user_email)
  ON CONFLICT (id) DO NOTHING;

  -- 2. Estabelecimento
  INSERT INTO public.estabelecimentos (id, nome, ativo)
  VALUES (v_estab_id, 'Meu Bar', true);

  -- 3. Vínculo admin
  INSERT INTO public.usuario_estabelecimento (usuario_id, estabelecimento_id, perfil, ativo)
  VALUES (v_user_id, v_estab_id, 'ADMIN', true);

  -- 4. Configurações padrão
  INSERT INTO public.configuracoes_estabelecimento (
    estabelecimento_id,
    taxa_servico_pct,
    taxa_servico_ativa,
    moeda,
    tempo_ticket_pronto_visivel_min,
    permite_garcom_fechar_conta,
    permite_garcom_aplicar_desconto,
    alerta_sonoro_cozinha
  ) VALUES (
    v_estab_id,
    10,        -- 10% taxa de serviço
    false,     -- desativada por padrão
    'BRL',
    5,
    false,
    false,
    true
  );

  -- 5. Mesas (1–12)
  INSERT INTO public.mesas_preset (estabelecimento_id, nome, ativa, ordem_exibicao)
  VALUES
    (v_estab_id, 'Mesa 01',  true,  1),
    (v_estab_id, 'Mesa 02',  true,  2),
    (v_estab_id, 'Mesa 03',  true,  3),
    (v_estab_id, 'Mesa 04',  true,  4),
    (v_estab_id, 'Mesa 05',  true,  5),
    (v_estab_id, 'Mesa 06',  true,  6),
    (v_estab_id, 'Mesa 07',  true,  7),
    (v_estab_id, 'Mesa 08',  true,  8),
    (v_estab_id, 'Mesa 09',  true,  9),
    (v_estab_id, 'Mesa 10',  true, 10),
    (v_estab_id, 'Balcão',   true, 11),
    (v_estab_id, 'Delivery', true, 12);

  -- 6. Categorias
  INSERT INTO public.categorias_produto (id, estabelecimento_id, nome, vai_para_cozinha_padrao, ordem_exibicao, ativa)
  VALUES
    (v_cat1_id, v_estab_id, 'Bebidas',  false, 1, true),
    (v_cat2_id, v_estab_id, 'Porções',  true,  2, true),
    (v_cat3_id, v_estab_id, 'Pratos',   true,  3, true);

  -- 7. Produtos de exemplo
  -- Nota: vai_para_cozinha=true exige tipo_preparo preenchido (chk_produto_tipo_preparo_obrigatorio)
  INSERT INTO public.produtos (estabelecimento_id, categoria_id, nome, descricao, preco, vai_para_cozinha, tipo_preparo, disponivel, ordem_exibicao)
  VALUES
    -- Bebidas (não vão para cozinha → tipo_preparo NULL)
    (v_estab_id, v_cat1_id, 'Cerveja Long Neck',  '350ml gelada',           9.90,  false, NULL,      true, 1),
    (v_estab_id, v_cat1_id, 'Refrigerante Lata',  'Coca, Pepsi ou Guaraná', 6.00,  false, NULL,      true, 2),
    (v_estab_id, v_cat1_id, 'Água Mineral',       'Com ou sem gás 500ml',   4.00,  false, NULL,      true, 3),
    (v_estab_id, v_cat1_id, 'Caipirinha',         'Limão ou maracujá',      18.00, false, NULL,      true, 4),
    -- Porções (vão para cozinha → tipo_preparo obrigatório)
    (v_estab_id, v_cat2_id, 'Frango à Passarinho', 'Porção 400g',           32.00, true,  'FRITAR',  true, 1),
    (v_estab_id, v_cat2_id, 'Batata Frita',        'Crocante, 300g',        22.00, true,  'FRITAR',  true, 2),
    (v_estab_id, v_cat2_id, 'Calabresa Acebolada', 'Acebolada na brasa',    28.00, true,  'ASSAR',   true, 3),
    -- Pratos (vão para cozinha → tipo_preparo obrigatório)
    (v_estab_id, v_cat3_id, 'PF do Dia',          'Arroz, feijão, carne e salada', 28.00, true, 'COZINHAR', true, 1),
    (v_estab_id, v_cat3_id, 'Bife Acebolado',     'Com fritas e salada',   38.00, true,  'ASSAR',   true, 2),
    (v_estab_id, v_cat3_id, 'Misto Quente',       'Pão de forma grelhado', 12.00, true,  'MONTAR',  true, 3);

  RAISE NOTICE 'Seed concluído! estab_id = %', v_estab_id;
END $$;
