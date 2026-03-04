-- ============================================================
-- SCHEMA COMPLETO — Execute no Supabase SQL Editor
-- Painel → SQL Editor → New query → Cole tudo → Run
-- ============================================================

-- Extensões necessárias
create extension if not exists pgcrypto;

-- ============================================================
-- TABELAS RAW (espelho dos DBFs)
-- O script sync_supabase.py na máquina da empresa alimenta estas tabelas
-- ============================================================

create table if not exists public.clientes (
  "CODIGO"   text primary key,
  "NOME"     text,
  "FANTASIA" text,
  "CGC"      text,
  "ATIVO"    boolean,
  synced_at  timestamptz default now()
);

create table if not exists public.pedidos (
  "CODIGO"    text primary key,
  "CLIENTE"   text,
  "PREVISAO"  date,
  "REMESSA"   text,
  "SALDO"     numeric,
  "PRIORIDADE" numeric,
  "CANCELADO" boolean,
  "FATURADO"  boolean,
  synced_at   timestamptz default now()
);

create table if not exists public.fichas (
  "CODIGO" text primary key,
  "NOME"   text,
  synced_at timestamptz default now()
);

create table if not exists public.setores (
  "CODIGO"  text primary key,
  "NOME"    text,
  "ORDEM"   numeric,
  synced_at timestamptz default now()
);

create table if not exists public.taloes (
  "CODIGO"     text primary key,
  "PEDIDO"     text,
  "ITEM"       text,
  "REFERENCIA" text,
  "TOTAL"      numeric,
  "CANCELADO"  boolean,
  "FATURADO"   boolean,
  synced_at    timestamptz default now()
);

create table if not exists public.peditens (
  "CODIGO"     text,
  "ITEM"       text,
  "REFERENCIA" text,
  "COR"        text,
  primary key ("CODIGO", "ITEM"),
  synced_at    timestamptz default now()
);

create table if not exists public.talsetor (
  "REMESSA"  text,
  "TALAO"    text,
  "SETOR"    text,
  "NOMESET"  text,
  "DATA"     date,
  "QTDE"     numeric,
  primary key ("REMESSA", "TALAO", "SETOR"),
  synced_at  timestamptz default now()
);

-- ============================================================
-- SEGURANÇA — Acesso somente via service_role (script de sync)
-- O frontend usa as funções RPC abaixo (seguras via anon key)
-- ============================================================

alter table public.clientes  enable row level security;
alter table public.pedidos   enable row level security;
alter table public.fichas    enable row level security;
alter table public.setores   enable row level security;
alter table public.taloes    enable row level security;
alter table public.peditens  enable row level security;
alter table public.talsetor  enable row level security;

-- Bloqueia acesso direto anônimo a todas as tabelas raw
drop policy if exists "sem_acesso_anonimo" on public.clientes;
drop policy if exists "sem_acesso_anonimo" on public.pedidos;
drop policy if exists "sem_acesso_anonimo" on public.fichas;
drop policy if exists "sem_acesso_anonimo" on public.setores;
drop policy if exists "sem_acesso_anonimo" on public.taloes;
drop policy if exists "sem_acesso_anonimo" on public.peditens;
drop policy if exists "sem_acesso_anonimo" on public.talsetor;
create policy "sem_acesso_anonimo" on public.clientes  for all using (false);
create policy "sem_acesso_anonimo" on public.pedidos   for all using (false);
create policy "sem_acesso_anonimo" on public.fichas    for all using (false);
create policy "sem_acesso_anonimo" on public.setores   for all using (false);
create policy "sem_acesso_anonimo" on public.taloes    for all using (false);
create policy "sem_acesso_anonimo" on public.peditens  for all using (false);
create policy "sem_acesso_anonimo" on public.talsetor  for all using (false);

-- ============================================================
-- FUNÇÃO RPC — retorna os dados do dashboard já processados
-- O frontend chama: supabase.rpc('get_dashboard', { p_sector: '' })
-- ============================================================

create or replace function public.get_dashboard(p_sector text default '')
returns json
language plpgsql
security definer
as $$
declare
  result json;
  v_today date := current_date;
  v_cutoff date := current_date - interval '120 days';
begin
  with
  -- Mapa de setores por talão
  talao_setores as (
    select "TALAO", array_agg(distinct "SETOR") as setor_cods
    from public.talsetor
    group by "TALAO"
  ),
  -- Talões ativos
  ativos as (
    select "CODIGO" from public.taloes
    where ("CANCELADO" is null or "CANCELADO" = false)
      and ("FATURADO"  is null or "FATURADO"  = false)
  ),
  -- Último registro por talão (pedidos em atraso)
  ultimo_setor as (
    select distinct on (ts."TALAO")
      ts."TALAO", ts."REMESSA", ts."SETOR", ts."NOMESET", ts."DATA", ts."QTDE"
    from public.talsetor ts
    join ativos a on a."CODIGO" = ts."TALAO"
    where ts."DATA" >= v_cutoff
      and ts."DATA" <  v_today
    order by ts."TALAO", ts."DATA" desc
  ),
  -- Talões do dia atual
  hoje as (
    select ts."REMESSA", ts."TALAO", ts."SETOR", ts."NOMESET", ts."DATA", ts."QTDE"
    from public.talsetor ts
    join ativos a on a."CODIGO" = ts."TALAO"
    where ts."DATA" = v_today
  )
  select json_build_object(
    'synced_at', (select max(synced_at) from public.talsetor)
  ) into result;

  return result;
end;
$$;

-- ============================================================
-- TABELA DE USUÁRIOS (login)
-- Já criada em supabase_login_schema.sql — incluída aqui por completude
-- ============================================================

create table if not exists public.usuarios (
  id            uuid primary key default gen_random_uuid(),
  username      text not null unique,
  nome          text not null,
  password_hash text not null,
  ativo         boolean not null default true,
  created_at    timestamptz not null default now()
);

alter table public.usuarios enable row level security;
drop policy if exists "sem_acesso_anonimo_usuarios" on public.usuarios;
drop policy if exists "nao_acesso_anonimo" on public.usuarios;
create policy "sem_acesso_anonimo_usuarios" on public.usuarios for all using (false);

insert into public.usuarios (username, nome, password_hash) values
  ('admin', 'Administrador', crypt('simpleeco', gen_salt('bf'))),
  ('adm',   'ADM',           crypt('adm',       gen_salt('bf')))
on conflict (username) do nothing;

create or replace function public.verificar_login(p_username text, p_password text)
returns table (id uuid, username text, nome text)
language sql security definer as $$
  select id, username, nome from public.usuarios
  where ativo = true
    and usuarios.username = p_username
    and password_hash = crypt(p_password, password_hash);
$$;

-- ============================================================
-- BLOCO DE SESSAO DE LOGIN (modelo atual)
-- ============================================================

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

alter table public.login_sessions enable row level security;
drop policy if exists "sem_acesso_anonimo_sessoes" on public.login_sessions;
create policy "sem_acesso_anonimo_sessoes" on public.login_sessions for all using (false);

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

grant execute on function public.criar_sessao_login(text, text) to anon;
grant execute on function public.validar_sessao_login(text) to anon;
grant execute on function public.revogar_sessao_login(text) to anon;
