-- ============================================================
-- Execute este script no SQL Editor do Supabase
-- Project Settings → SQL Editor → New Query → Cole e clique Run
-- ============================================================

-- 1. Habilita extensão de criptografia (já vem no Supabase)
create extension if not exists pgcrypto;

-- 2. Cria tabela de usuários
create table if not exists public.usuarios (
  id         uuid primary key default gen_random_uuid(),
  username   text not null unique,
  password   text not null,          -- armazenada como hash bcrypt
  nome       text,                   -- nome exibido no dashboard
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. Protege a tabela (somente service_role acessa via script/backend)
alter table public.usuarios enable row level security;

-- Nenhuma política pública — acesso só via service_role key (backend/script)
-- O frontend usa a função RPC abaixo para validar login sem expor senhas

-- 4. Função RPC para validar login (chamada pelo frontend com anon key)
--    Retorna o registro do usuário se a senha bater, null caso contrário
create or replace function public.verificar_login(
  p_username text,
  p_password text
)
returns table (
  id       uuid,
  username text,
  nome     text
)
language sql
security definer   -- roda com privilégios do owner, não do chamador
as $$
  select id, username, nome
  from public.usuarios
  where username = p_username
    and ativo = true
    and password = crypt(p_password, password);
$$;

-- 5. Permite que qualquer usuário (anon) chame a função RPC
grant execute on function public.verificar_login(text, text) to anon;

-- ============================================================
-- Inserir usuários iniciais (troque as senhas antes de rodar!)
-- ============================================================
insert into public.usuarios (username, password, nome) values
  ('admin', crypt('simpleeco', gen_salt('bf')), 'Administrador'),
  ('adm',   crypt('adm',       gen_salt('bf')), 'Usuário ADM')
on conflict (username) do nothing;
