-- ============================================================
-- BotaNaConta — Convites e triggers de integridade
-- Sprint 1: fluxo de convite correto + proteção último ADMIN
-- ============================================================

-- ── Tabela public.convites ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.convites (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id  UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  email               TEXT NOT NULL CHECK (email = lower(email)),
  perfil              public.perfil_usuario NOT NULL,
  token               TEXT NOT NULL UNIQUE,
  convidado_por       UUID NOT NULL REFERENCES public.usuarios(id),
  enviado_em          TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em           TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  status              TEXT NOT NULL DEFAULT 'PENDENTE'
                        CHECK (status IN ('PENDENTE','ACEITO','CANCELADO','EXPIRADO')),
  aceito_em           TIMESTAMPTZ,
  aceito_por_usuario  UUID REFERENCES public.usuarios(id),
  UNIQUE (estabelecimento_id, email, status) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS convites_estab_status_idx
  ON public.convites (estabelecimento_id, status);

CREATE INDEX IF NOT EXISTS convites_token_idx
  ON public.convites (token) WHERE status = 'PENDENTE';

-- ── RLS da tabela convites ───────────────────────────────────

ALTER TABLE public.convites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "convites: admin lê" ON public.convites;
CREATE POLICY "convites: admin lê"
  ON public.convites FOR SELECT
  USING (is_admin_of(estabelecimento_id));

DROP POLICY IF EXISTS "convites: admin insere" ON public.convites;
CREATE POLICY "convites: admin insere"
  ON public.convites FOR INSERT
  WITH CHECK (is_admin_of(estabelecimento_id));

DROP POLICY IF EXISTS "convites: admin atualiza" ON public.convites;
CREATE POLICY "convites: admin atualiza"
  ON public.convites FOR UPDATE
  USING (is_admin_of(estabelecimento_id));

-- ── RPC validar_convite ──────────────────────────────────────
-- Chamável sem autenticação (anon) para exibir o card antes do login.

CREATE OR REPLACE FUNCTION public.validar_convite(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  SELECT c.status, c.expira_em, c.email, c.perfil, e.nome AS estab_nome
    INTO v_row
    FROM convites c
    JOIN estabelecimentos e ON e.id = c.estabelecimento_id
   WHERE c.token = p_token
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'token_invalido');
  END IF;

  IF v_row.status <> 'PENDENTE' THEN
    RETURN jsonb_build_object('valido', false, 'motivo', lower(v_row.status));
  END IF;

  IF v_row.expira_em < now() THEN
    UPDATE convites SET status = 'EXPIRADO' WHERE token = p_token;
    RETURN jsonb_build_object('valido', false, 'motivo', 'expirado');
  END IF;

  RETURN jsonb_build_object(
    'valido',              true,
    'estabelecimento_nome', v_row.estab_nome,
    'perfil',              v_row.perfil,
    'email',               v_row.email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validar_convite(TEXT) TO anon, authenticated;

-- ── RPC aceitar_convite ──────────────────────────────────────
-- Requer autenticação. Vincula o usuário ao estabelecimento e marca o convite.

CREATE OR REPLACE FUNCTION public.aceitar_convite(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_convite    RECORD;
  v_user_id    UUID := auth.uid();
  v_user_email TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO v_convite FROM convites WHERE token = p_token LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BNC_TOKEN_INVALIDO'
      USING HINT = 'Token não encontrado';
  END IF;

  IF v_convite.status <> 'PENDENTE' THEN
    RAISE EXCEPTION 'BNC_TOKEN_INVALIDO'
      USING HINT = 'Convite já foi ' || v_convite.status;
  END IF;

  IF v_convite.expira_em < now() THEN
    UPDATE convites SET status = 'EXPIRADO' WHERE token = p_token;
    RAISE EXCEPTION 'BNC_TOKEN_EXPIRADO'
      USING HINT = 'Convite expirado';
  END IF;

  -- Valida que o email do convite bate com o usuário autenticado
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  IF lower(v_user_email) <> v_convite.email THEN
    RAISE EXCEPTION 'BNC_EMAIL_MISMATCH'
      USING HINT = 'Este convite foi enviado para outro e-mail';
  END IF;

  -- Garante registro público
  INSERT INTO usuarios (id, nome, email)
  VALUES (v_user_id, split_part(v_user_email, '@', 1), v_user_email)
  ON CONFLICT (id) DO NOTHING;

  -- Cria ou reativa o vínculo
  INSERT INTO usuario_estabelecimento (usuario_id, estabelecimento_id, perfil, ativo)
  VALUES (v_user_id, v_convite.estabelecimento_id, v_convite.perfil, true)
  ON CONFLICT (usuario_id, estabelecimento_id)
    DO UPDATE SET perfil = EXCLUDED.perfil, ativo = true;

  -- Fecha o convite
  UPDATE convites
     SET status             = 'ACEITO',
         aceito_em          = now(),
         aceito_por_usuario = v_user_id
   WHERE token = p_token;

  RETURN jsonb_build_object(
    'estabelecimento_id', v_convite.estabelecimento_id,
    'perfil',             v_convite.perfil
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.aceitar_convite(TEXT) TO authenticated;

-- ── Trigger enforce_last_admin ───────────────────────────────
-- Bloqueia UPDATE/DELETE que removeria o último ADMIN ativo de um estabelecimento.

CREATE OR REPLACE FUNCTION public.enforce_last_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Só verifica quando o registro ERA admin ativo e vai deixar de ser
    IF OLD.perfil = 'ADMIN' AND OLD.ativo = true THEN
      IF NEW.perfil <> 'ADMIN' OR NEW.ativo = false THEN
        IF (
          SELECT COUNT(*) FROM usuario_estabelecimento
           WHERE estabelecimento_id = OLD.estabelecimento_id
             AND perfil = 'ADMIN'
             AND ativo = true
             AND id <> OLD.id
        ) = 0 THEN
          RAISE EXCEPTION 'BNC_LAST_ADMIN'
            USING HINT = 'Não é possível remover o último administrador ativo';
        END IF;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.perfil = 'ADMIN' AND OLD.ativo = true THEN
      IF (
        SELECT COUNT(*) FROM usuario_estabelecimento
         WHERE estabelecimento_id = OLD.estabelecimento_id
           AND perfil = 'ADMIN'
           AND ativo = true
           AND id <> OLD.id
      ) = 0 THEN
        RAISE EXCEPTION 'BNC_LAST_ADMIN'
          USING HINT = 'Não é possível remover o último administrador ativo';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_last_admin ON public.usuario_estabelecimento;
CREATE TRIGGER trg_enforce_last_admin
  BEFORE UPDATE OR DELETE ON public.usuario_estabelecimento
  FOR EACH ROW EXECUTE FUNCTION public.enforce_last_admin();
