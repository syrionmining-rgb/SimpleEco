-- ══════════════════════════════════════════════════════
-- SimpleEco — Schema completo para novo projeto Supabase
-- ══════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"  SCHEMA extensions;

-- ── 1. Auth ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.usuarios (
  id            BIGSERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  nome          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.login_sessions (
  id          TEXT PRIMARY KEY,          -- session token
  username    TEXT NOT NULL,
  nome        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  last_seen   TIMESTAMPTZ DEFAULT now(),
  ip          TEXT,
  user_agent  TEXT,
  device_type TEXT,
  os          TEXT,
  browser     TEXT
);

-- Usuário padrão adm/adm
INSERT INTO public.usuarios (username, nome, password_hash)
VALUES ('adm', 'Administrador', extensions.crypt('adm', extensions.gen_salt('bf')))
ON CONFLICT (username) DO NOTHING;

-- ── 2. SE Link infra ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sync_log (
  id             INT PRIMARY KEY DEFAULT 1,
  ultima_sync    TIMESTAMPTZ,
  force_sync     BOOLEAN DEFAULT false,
  last_heartbeat TIMESTAMPTZ
);
INSERT INTO public.sync_log (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.sync_config (
  dbf_name    TEXT PRIMARY KEY,
  table_name  TEXT,
  pk_field    TEXT,
  enabled     BOOLEAN DEFAULT false,
  discovered  BOOLEAN DEFAULT false,
  found_at    TEXT
);

CREATE TABLE IF NOT EXISTS public.se_link_logs (
  id         BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  level      TEXT NOT NULL,
  message    TEXT NOT NULL
);

-- Tabelas ativas por padrão
INSERT INTO public.sync_config (dbf_name, table_name, pk_field, enabled, discovered) VALUES
  ('clientes',  'clientes',  'CODIGO', true,  true),
  ('pedidos',   'pedidos',   'CODIGO', true,  true),
  ('fichas',    'fichas',    'CODIGO', true,  true),
  ('taloes',    'taloes',    'CODIGO', true,  true),
  ('peditens',  'peditens',  NULL,     true,  true),
  ('talsetor',  'talsetor',  NULL,     true,  true),
  ('setores',   'setores',   'CODIGO', true,  true),
  ('pedimate',  'pedimate',  NULL,     true,  true),
  ('material',  'material',  'CODIGO', true,  true),
  ('grades',    'grades',    'CODIGO', true,  true),
  ('talaoaux',  'talaoaux',  'CODIGO', true,  true)
ON CONFLICT (dbf_name) DO NOTHING;

-- ── 3. Operacionais ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.prod_items (
  id         BIGSERIAL PRIMARY KEY,
  nome       TEXT NOT NULL,
  descricao  TEXT,
  ativo      BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prod_etapas (
  id         BIGSERIAL PRIMARY KEY,
  item_id    BIGINT NOT NULL REFERENCES public.prod_items(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  ordem      INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pedido_fluxo (
  id            BIGSERIAL PRIMARY KEY,
  pedido_codigo TEXT NOT NULL UNIQUE,
  item_id       BIGINT NOT NULL REFERENCES public.prod_items(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_setores (
  id      BIGSERIAL PRIMARY KEY,
  nome    TEXT NOT NULL,
  cor     TEXT,
  ordem   INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.pedido_setores (
  id            BIGSERIAL PRIMARY KEY,
  pedido_codigo TEXT NOT NULL,
  setor_id      BIGINT REFERENCES public.admin_setores(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── 4. RLS ──────────────────────────────────────────────

ALTER TABLE public.usuarios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_config     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.se_link_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prod_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prod_etapas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_fluxo    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_setores   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_setores  ENABLE ROW LEVEL SECURITY;

-- sync_log: leitura pública, update só authenticated
CREATE POLICY sync_log_read   ON public.sync_log FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY sync_log_update ON public.sync_log FOR UPDATE TO authenticated        USING (true) WITH CHECK (true);

-- sync_config: leitura pública, escrita só authenticated
CREATE POLICY sync_config_read  ON public.sync_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY sync_config_write ON public.sync_config FOR ALL    TO authenticated        USING (true) WITH CHECK (true);

-- se_link_logs: leitura pública (service_role insere via bypass RLS)
CREATE POLICY se_link_logs_read ON public.se_link_logs FOR SELECT TO anon, authenticated USING (true);

-- prod_items / prod_etapas: leitura pública, escrita authenticated
CREATE POLICY prod_items_read  ON public.prod_items  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY prod_items_write ON public.prod_items  FOR ALL    TO authenticated        USING (true) WITH CHECK (true);
CREATE POLICY prod_etapas_read  ON public.prod_etapas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY prod_etapas_write ON public.prod_etapas FOR ALL   TO authenticated        USING (true) WITH CHECK (true);

-- pedido_fluxo / admin_setores / pedido_setores: leitura pública, escrita authenticated
CREATE POLICY pedido_fluxo_read  ON public.pedido_fluxo  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY pedido_fluxo_write ON public.pedido_fluxo  FOR ALL    TO authenticated        USING (true) WITH CHECK (true);
CREATE POLICY admin_setores_read  ON public.admin_setores  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY admin_setores_write ON public.admin_setores  FOR ALL    TO authenticated        USING (true) WITH CHECK (true);
CREATE POLICY pedido_setores_read  ON public.pedido_setores  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY pedido_setores_write ON public.pedido_setores  FOR ALL    TO authenticated        USING (true) WITH CHECK (true);

-- login_sessions: sem acesso público direto (apenas via RPC)
CREATE POLICY login_sessions_rpc ON public.login_sessions FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- usuarios: sem acesso público direto (apenas via RPC)
CREATE POLICY usuarios_rpc ON public.usuarios FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- ── 5. Funções ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.criar_sessao_login(
  p_username TEXT,
  p_password TEXT
) RETURNS TABLE(token TEXT, nome TEXT, username TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user   RECORD;
  v_token  TEXT;
BEGIN
  SELECT u.id, u.nome, u.username, u.password_hash
    INTO v_user
    FROM public.usuarios u
   WHERE u.username = lower(trim(p_username));

  IF NOT FOUND THEN RETURN; END IF;

  IF extensions.crypt(p_password, v_user.password_hash) != v_user.password_hash THEN
    RETURN;
  END IF;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  INSERT INTO public.login_sessions(id, username, nome, expires_at)
  VALUES (v_token, v_user.username, v_user.nome, now() + interval '30 days');

  RETURN QUERY SELECT v_token, v_user.nome, v_user.username;
END;
$$;

CREATE OR REPLACE FUNCTION public.validar_sessao_login(
  p_token TEXT
) RETURNS TABLE(nome TEXT, username TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.login_sessions
     SET last_seen = now()
   WHERE id = p_token
     AND revoked_at IS NULL
     AND expires_at > now();

  RETURN QUERY
    SELECT s.nome, s.username
      FROM public.login_sessions s
     WHERE s.id = p_token
       AND s.revoked_at IS NULL
       AND s.expires_at > now();
END;
$$;

CREATE OR REPLACE FUNCTION public.revogar_sessao_login(
  p_token TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.login_sessions
     SET revoked_at = now()
   WHERE id = p_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_device_sessao(
  p_token       TEXT,
  p_ip          TEXT,
  p_user_agent  TEXT,
  p_device_type TEXT,
  p_os          TEXT,
  p_browser     TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.login_sessions
     SET ip          = p_ip,
         user_agent  = p_user_agent,
         device_type = p_device_type,
         os          = p_os,
         browser     = p_browser,
         last_seen   = now()
   WHERE id = p_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.limpar_historico_sessoes()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.login_sessions
   WHERE revoked_at IS NOT NULL
      OR expires_at < now();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_login_activity()
RETURNS TABLE(
  id          TEXT,
  username    TEXT,
  nome        TEXT,
  ip          TEXT,
  device_type TEXT,
  os          TEXT,
  browser     TEXT,
  created_at  TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ,
  last_seen   TIMESTAMPTZ,
  user_agent  TEXT,
  status      TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT
      s.id, s.username, s.nome, s.ip, s.device_type, s.os, s.browser,
      s.created_at, s.expires_at, s.revoked_at, s.last_seen, s.user_agent,
      CASE
        WHEN s.revoked_at IS NOT NULL THEN 'revoked'
        WHEN s.expires_at < now()     THEN 'expired'
        ELSE 'active'
      END AS status
    FROM public.login_sessions s
   ORDER BY s.created_at DESC;
END;
$$;
