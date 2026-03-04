-- ============================================================
-- Execute este script no SQL Editor do Supabase
-- ============================================================

create extension if not exists pgcrypto;

-- 1) Tabela de usuarios
create table if not exists public.usuarios (
  id            uuid primary key default gen_random_uuid(),
  username      text not null unique,
  password_hash text not null,
  nome          text,
  ativo         boolean not null default true,
  created_at    timestamptz not null default now()
);

-- 2) Tabela de sessoes de login (token hash no banco)
create table if not exists public.login_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.usuarios(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_login_sessions_user_id on public.login_sessions(user_id);
create index if not exists idx_login_sessions_expires_at on public.login_sessions(expires_at);

-- 3) Seguranca de tabelas (acesso apenas por funcoes security definer)
alter table public.usuarios enable row level security;
alter table public.login_sessions enable row level security;

drop policy if exists "sem_acesso_anonimo_usuarios" on public.usuarios;
create policy "sem_acesso_anonimo_usuarios" on public.usuarios for all using (false);

drop policy if exists "sem_acesso_anonimo_sessoes" on public.login_sessions;
create policy "sem_acesso_anonimo_sessoes" on public.login_sessions for all using (false);

-- 4) Cria sessao a partir de usuario/senha validos
create or replace function public.criar_sessao_login(
  p_username text,
  p_password text
)
returns table (
  token text,
  username text,
  nome text,
  expires_at timestamptz
)
language plpgsql
security definer
as $$
declare
  v_user public.usuarios%rowtype;
  v_token text;
  v_expires_at timestamptz;
begin
  select *
  into v_user
  from public.usuarios
  where usuarios.username = p_username
    and usuarios.ativo = true
    and usuarios.password_hash = crypt(p_password, usuarios.password_hash)
  limit 1;

  if not found then
    return;
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '7 days';

  insert into public.login_sessions (user_id, token_hash, expires_at)
  values (v_user.id, crypt(v_token, gen_salt('bf')), v_expires_at);

  return query
  select v_token, v_user.username, v_user.nome, v_expires_at;
end;
$$;

-- 5) Valida token de sessao
create or replace function public.validar_sessao_login(
  p_token text
)
returns table (
  user_id uuid,
  username text,
  nome text,
  expires_at timestamptz
)
language sql
security definer
as $$
  select u.id, u.username, u.nome, ls.expires_at
  from public.login_sessions ls
  join public.usuarios u on u.id = ls.user_id
  where ls.revoked_at is null
    and ls.expires_at > now()
    and u.ativo = true
    and ls.token_hash = crypt(p_token, ls.token_hash)
  order by ls.created_at desc
  limit 1;
$$;

-- 6) Revoga sessao
create or replace function public.revogar_sessao_login(
  p_token text
)
returns void
language sql
security definer
as $$
  update public.login_sessions
  set revoked_at = now()
  where revoked_at is null
    and token_hash = crypt(p_token, token_hash);
$$;

-- 7) Permissoes RPC para anon
revoke all on table public.usuarios from anon;
revoke all on table public.login_sessions from anon;

grant execute on function public.criar_sessao_login(text, text) to anon;
grant execute on function public.validar_sessao_login(text) to anon;
grant execute on function public.revogar_sessao_login(text) to anon;

-- 8) Usuarios iniciais (troque as senhas antes de rodar)
insert into public.usuarios (username, password_hash, nome) values
  ('admin', crypt('simpleeco', gen_salt('bf')), 'Administrador'),
  ('adm',   crypt('adm',       gen_salt('bf')), 'Usuario ADM')
on conflict (username) do nothing;
