-- ============================================================
-- Execute este SQL no Supabase:
-- Painel → SQL Editor → New query → Cole e clique em Run
-- ============================================================

-- 1. Tabela de usuários
create table if not exists public.usuarios (
  id         uuid primary key default gen_random_uuid(),
  username   text not null unique,
  nome       text not null,
  -- senha armazenada com hash bcrypt (nunca texto puro)
  password_hash text not null,
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Extensão para hash de senha (já vem ativa no Supabase)
create extension if not exists pgcrypto;

-- 3. Inserir usuários iniciais (senha: simpleeco)
insert into public.usuarios (username, nome, password_hash) values
  ('admin', 'Administrador', crypt('simpleeco', gen_salt('bf'))),
  ('adm',   'ADM',           crypt('adm',       gen_salt('bf')))
on conflict (username) do nothing;

-- 4. Função RPC que verifica login — chamada pelo frontend
--    Retorna a linha do usuário se credenciais corretas, senão vazio.
create or replace function public.verificar_login(
  p_username text,
  p_password text
)
returns table (id uuid, username text, nome text)
language sql
security definer   -- roda como superuser, sem expor a tabela via anon
as $$
  select id, username, nome
  from public.usuarios
  where
    ativo = true
    and usuarios.username = p_username
    and password_hash = crypt(p_password, password_hash);
$$;

-- 5. Segurança: bloquear acesso direto à tabela via anon key
alter table public.usuarios enable row level security;

-- Apenas o service_role (backend/scripts) pode ler/escrever
drop policy if exists "nao_acesso_anonimo" on public.usuarios;
create policy "nao_acesso_anonimo" on public.usuarios
  for all using (false);

-- A função RPC acima ainda funciona pois usa security definer
