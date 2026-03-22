-- ============================================================
-- SIMPLE&ECO — SCHEMA COMPLETO DO SUPABASE
-- ============================================================
-- Projeto : Simple&Eco
-- URL     : https://whwwcgyqpaspzymhdwox.supabase.co
-- DB Host : db.whwwcgyqpaspzymhdwox.supabase.co
-- DB Port : 5432
-- DB User : postgres
-- DB Pass : MpCmzoSLictY97lM
-- DB Name : postgres
-- Conn    : postgresql://postgres:MpCmzoSLictY97lM@db.whwwcgyqpaspzymhdwox.supabase.co:5432/postgres
--
-- Anon Key (frontend)   : sb_publishable_0SfEbi8VIoUboTNkczDh5w_L7pqbgfo
-- Service Role (backend): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indod3djZ3lxcGFzcHp5bWhkd294Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjM0MDg5NCwiZXhwIjoyMDg3OTE2ODk0fQ.1LWlu70R7DQbjAuDrWlbVqn2oXumPG-keu5wgBFdQhc
--
-- Para aplicar: Supabase Dashboard → SQL Editor → Cole tudo → Run
-- ============================================================

-- ── Extensões ────────────────────────────────────────────────
create extension if not exists pgcrypto;

-- ============================================================
-- TABELAS DBF (espelho dos arquivos DBF sincronizados pelo SE Link)
-- ============================================================

-- ── clientes ─────────────────────────────────────────────────
drop table if exists public.clientes cascade;
create table public.clientes (
  "CODIGO" text primary key,
  "ID" bigint,
  "NOME" text,
  "CHAVE" text,
  "TIPO" bigint,
  "ENDERECO" text,
  "NUMERO" text,
  "COMPL" text,
  "TIPO_SHOP" bigint,
  "SHOPPING" text,
  "BAIRRO" text,
  "CIDADE" text,
  "ESTADO" text,
  "PAIS" text,
  "CEP" text,
  "CNPJ" text,
  "INSCRICAO" text,
  "UF_ISENTO" text,
  "CIC" text,
  "CI" text,
  "INSC_MUNIC" text,
  "ID_ESTRANG" text,
  "SUFRAMA" text,
  "NATOP" text,
  "TELEFONE" text,
  "FONE_CHAVE" text,
  "FAX" text,
  "EMAIL" text,
  "EMAIL_NFE" text,
  "HOMEPAGE" text,
  "CONTATO" text,
  "COB_NOME" text,
  "COB_ENDERE" text,
  "COB_BAIRRO" text,
  "COB_CIDADE" text,
  "COB_ESTADO" text,
  "COB_CEP" text,
  "COB_CNPJ" text,
  "COB_INSCR" text,
  "COB_FONE" text,
  "COB_EMAIL" text,
  "COB_CONTAT" text,
  "ENT_NOME" text,
  "ENT_ENDERE" text,
  "ENT_NUMERO" text,
  "ENT_COMPL" text,
  "ENT_BAIRRO" text,
  "ENT_CIDADE" text,
  "ENT_ESTADO" text,
  "ENT_CEP" text,
  "ENT_CNPJ" text,
  "ENT_INSCR" text,
  "ENT_CPF" text,
  "ENT_FONE" text,
  "ENT_EMAIL" text,
  "TRANSPOR" text,
  "VENDEDOR" text,
  "BANCO" text,
  "TIPOFRET" text,
  "VIATRANS" text,
  "REDESPACHO" text,
  "MARCA" text,
  "CAIXA" text,
  "CARISOLASN" bigint,
  "CARISOLANO" text,
  "PALMILHA" bigint,
  "MARCPALM" text,
  "COR_M_PALM" text,
  "LIB_BLOQ" bigint,
  "LB_OPER" text,
  "LB_DATA" date,
  "LB_MOTIV" text,
  "COMISSAO" numeric,
  "COMIS_NF" numeric,
  "COMIS_DP" numeric,
  "PDESCOMISS" numeric,
  "PDESCONTO" numeric,
  "DESCONTONF" numeric,
  "DESNF_ICMS" boolean,
  "DESCPEDIDO" numeric,
  "BASECOMISS" numeric,
  "REDUCAO" numeric,
  "TAB_PRECO" text,
  "PERC_PRECO" numeric,
  "COND_PGTO" text,
  "OBS_FAT" text,
  "OBS_PED" text,
  "FANTASIA" text,
  "CODREDE" text,
  "REDE" text,
  "LOJA" text,
  "CONTSOCIAL" numeric,
  "CVSOFT" text,
  "CCUSTOS" text,
  "CCUSTOSN" text,
  "MALADIRETA" text,
  "EXCL_2432" boolean,
  "OPER_INC" text,
  "INCLUIDO" date,
  "HORA_INC" text,
  "OPER_ALT" text,
  "CLIE_WEB" boolean,
  "ATUALIZADO" date,
  "HORA_ATU" text,
  "DIASAGENDA" bigint,
  "LISTAPRECO" text,
  "FICHA3VLRS" bigint,
  "E_DAFITI" boolean,
  "E_LEPOSTIC" boolean,
  "SIMPLES" boolean,
  "TIPO_EMP" bigint,
  "RAMO_ATIV" bigint,
  "PESQ_SIMPL" date,
  "PASTAFOTOS" text,
  "CONS_FINAL" bigint,
  "ACRESCIMO" numeric,
  "NASCIMENTO" date,
  "CST_ICMS" text,
  "SDO_ANTECI" numeric,
  "INDIEDEST" bigint,
  "BLOQ_BORDE" boolean,
  "FABRICA" text,
  "FONE_OK" boolean,
  "LANCAR_GRD" boolean,
  "LANCAR_OC" boolean,
  "METAL_PC" boolean,
  "NFSE" boolean,
  "NFSE_BOLET" boolean,
  "NFSE_VCTO" bigint,
  "NFSE_VALOR" numeric,
  "AGRUP_REF" boolean,
  "EXIG_XPED" boolean,
  "LOGO_ETIQ" text,
  "OBS_PADRAO" text,
  "NF_END_CAD" boolean,
  "PLACON" text,
  "CONCEITO" bigint
);
alter table public.clientes enable row level security;
drop policy if exists "leitura_anonima" on public.clientes;
create policy "leitura_anonima" on public.clientes for select using (true);

-- ── pedidos ───────────────────────────────────────────────────
drop table if exists public.pedidos cascade;
create table public.pedidos (
  "CODIGO" text primary key,
  "NOME" text,
  "CLIENTE" text,
  "VENDEDOR" text,
  "VENDEDOR2" text,
  "COND_PGTO" text,
  "TIPODOCTO" bigint,
  "TIPOPEDIDO" bigint,
  "PRAZOMEDIO" bigint,
  "DESCONTO" numeric,
  "DESCONTO2" numeric,
  "VENDA" date,
  "PREVISAO" date,
  "PREVPROD" date,
  "ATRASO1" date,
  "ATRASO2" date,
  "ATRASO_TXT" text,
  "SEMANA" text,
  "REMESSA" date,
  "PROGRAMADO" date,
  "TOTAL" bigint,
  "PRODUCAO" bigint,
  "EXPEDICAO" bigint,
  "FATURADOS" bigint,
  "INFORMAFAT" boolean,
  "SALDO" bigint,
  "PEDCLIENTE" text,
  "OC" text,
  "PLANOFAB" text,
  "COMISSAO" numeric,
  "COMISSAO2" numeric,
  "COMIS_NF" numeric,
  "NFOBS" text,
  "OBS_EXPED" text,
  "OPERADOR" text,
  "DIGITACAO" date,
  "HORA" text,
  "OPER_ALT" text,
  "ATUALIZADO" date,
  "HORA_ATU" text,
  "FABRICA" date,
  "DIGITANDO" date,
  "ANALISE" date,
  "ACEITE" date,
  "REPROVACAO" date,
  "MOTIVO" text,
  "PRONTAENTR" boolean,
  "EPPRESERVA" boolean,
  "EPP_R_ANT" boolean,
  "EPPPROD" boolean,
  "EPP_P_ANT" boolean,
  "MARC_REMES" boolean,
  "STATUS" text,
  "NET" boolean,
  "WEB_ID" bigint,
  "FAB_ID" bigint,
  "PERC_NF" numeric,
  "DOCTO_PGTO" bigint,
  "BASECOMISS" numeric,
  "EPP" bigint,
  "BLOQ_243D" bigint,
  "LOJA" text,
  "NAO_COMPRA" boolean,
  "NAO_REMESS" boolean,
  "NAO_CONSUL" boolean,
  "TRANSPORT" text,
  "TIPOFRETE" text,
  "VENDALOJA" boolean,
  "N_ITENS" bigint,
  "OPCAO34" bigint,
  "MERCADO" bigint,
  "EMBARQUEI" date,
  "EMBARQUEF" date,
  "LEPOSTICHE" boolean,
  "SEMST" boolean,
  "PRIORIDADE" bigint,
  "DATA_FABR" date,
  "HORA_FABR" text,
  "IMP_ROTULO" boolean,
  "NPED_INT" bigint
);
alter table public.pedidos enable row level security;
drop policy if exists "leitura_anonima" on public.pedidos;
create policy "leitura_anonima" on public.pedidos for select using (true);

-- ── fichas ────────────────────────────────────────────────────
drop table if exists public.fichas cascade;
create table public.fichas (
  "CODIGO" text primary key,
  "NOME" text,
  "DESCFAT" text,
  "DESCDAFITI" text,
  "ADMATDESC" boolean,
  "ADCORDESC" boolean,
  "FABRICA" text,
  "MERCADO" bigint,
  "SITUACAO" boolean,
  "CONSTRUC" text,
  "SALTO" text,
  "PALMILHA" text,
  "FORMA" text,
  "REFER" text,
  "NUMCOR" bigint,
  "LINHA" text,
  "TIPOPROD" text,
  "TIPO16" bigint,
  "COLECAO" text,
  "ACO" bigint,
  "CENTRIFUGA" bigint,
  "CAVIDADE" bigint,
  "PRECO" numeric,
  "PRECO2" numeric,
  "PRECO3" numeric,
  "PRECO_FAB" numeric,
  "COMISSAO" numeric,
  "CUSTOS" text,
  "COMBINAC" text,
  "CUST_ADIC" numeric,
  "CUST_TAREF" numeric,
  "CODFISC" text,
  "CODIFISC" text,
  "GRADE" text,
  "MARCAR" text,
  "GRD_TALAO" bigint,
  "MATESTOQUE" text,
  "NMEDIOGRAD" bigint,
  "FOTOGRAFIA" text,
  "RISCO" text,
  "OBS_FOTO" text,
  "OBS" text,
  "CAPASALTO" bigint,
  "TAB_CAPA" text,
  "BEIRASOLA" text,
  "PESO" numeric,
  "CORRUGADO" bigint,
  "CORR_CHAVE" text,
  "CLASFISC" text,
  "SOLA" text,
  "CARIMBO" text,
  "FORRO" text,
  "EAN13" text,
  "SEL01" boolean, "SEL02" boolean, "SEL03" boolean, "SEL04" boolean, "SEL05" boolean,
  "SEL06" boolean, "SEL07" boolean, "SEL08" boolean, "SEL09" boolean, "SEL10" boolean,
  "SEL11" boolean, "SEL12" boolean, "SEL13" boolean, "SEL14" boolean, "SEL15" boolean,
  "SEL16" boolean, "SEL17" boolean, "SEL18" boolean, "SEL19" boolean, "SEL20" boolean,
  "COR01" text, "COR02" text, "COR03" text, "COR04" text, "COR05" text,
  "COR06" text, "COR07" text,
  "MATRIZ" text,
  "NAVALHA" text,
  "OPERADOR" text,
  "DIGITACAO" date,
  "HORA" text,
  "ATUALIZADO" date,
  "HORA_ATU" text,
  "INTERNET" text,
  "NET" boolean,
  "LARGURA" text,
  "BLOQ_246F" boolean,
  "ITEM_BRIO" text,
  "TIRAPOLIND" boolean,
  "REFPALMA" boolean,
  "REFTOTAL" boolean,
  "REFCOSTRED" boolean,
  "REFCOSTPOL" boolean,
  "C_VIES" boolean,
  "C_ELASTICO" boolean,
  "QTDE_TALAO" bigint,
  "UNID_TALAO" bigint,
  "DTA_DESENV" date,
  "DT_ULT_FAT" date,
  "COR_AD_01" text,
  "COR_AD_02" text,
  "SEGUIR" text,
  "MATER_CXA" text,
  "QTDEVOL" bigint,
  "GRADELIVRE" boolean,
  "CAP_PRODUT" bigint,
  "ROYALTIE" bigint,
  "CODI_ROY" text,
  "NOME_ROY" text,
  "COMIS_ROY" numeric,
  "CLIENTE" text,
  "TIPOPALM" bigint,
  "MARCPALM" text,
  "CORPALM" text,
  "PROD_VAL" bigint,
  "PROD_TXT" text,
  "PROCES_VAL" bigint,
  "PROCES_TXT" text,
  "CFOP" text,
  "SETORPALM" text,
  "COMB_COR" text,
  "MODELOCOML" text,
  "TIPOCARIMB" text,
  "PERC_AGREG" numeric,
  "SEM_AGREG" bigint,
  "MFACE1" text,
  "CFACE1" text,
  "MAT_ECO" text,
  "COR_ECO" text,
  "TORNO" numeric,
  "FINAL" numeric,
  "REFILAR" numeric,
  "MFACE2" text,
  "CFACE2" text,
  "SEQUENCIA" text,
  "ESTOQUE" numeric,
  "DISPONIVEL" numeric,
  "CODCOR" text,
  "NOMECOR" text,
  "MARCADO" boolean,
  "NSUBCAT" bigint,
  "SUBCAT" text,
  "REFERCLIE" text,
  "SEGMENTO" text,
  "SPEED_CLAS" bigint,
  "SPEED_CODI" text
);
alter table public.fichas enable row level security;
drop policy if exists "leitura_anonima" on public.fichas;
create policy "leitura_anonima" on public.fichas for select using (true);

-- ── taloes ────────────────────────────────────────────────────
drop table if exists public.taloes cascade;
create table public.taloes (
  "CODIGO" text primary key,
  "NOME" text,
  "PEDIDO" text,
  "ITEM" text,
  "REFERENCIA" text,
  "MATERIAL" text,
  "GRADE" text,
  "NUMEROS" text,
  "TOTAL" bigint,
  "REMESSA" text,
  "LOTE" text,
  "MI" text,
  "PRODUCAO" date,
  "ULTSETOR" text,
  "DTULTSETOR" date,
  "EXPEDICAO" date,
  "FATURADO" date,
  "NFISCAL" text,
  "SERIE" text,
  "ITEMNF" text,
  "IMPRESSO" boolean,
  "CANCELADO" boolean,
  "EMPROD" boolean,
  "AGRUPADO" boolean,
  "ATUALIZADO" date,
  "HORA_ATU" text,
  "IMP_ETIQ" boolean,
  "BLOQ_2469" boolean,
  "SETORESTOQ" text,
  "DE_ESTOQUE" boolean,
  "QUEBORIGEM" text,
  "QTDE_ETIQ" bigint,
  "DE_ATE" text
);
alter table public.taloes enable row level security;
drop policy if exists "leitura_anonima" on public.taloes;
create policy "leitura_anonima" on public.taloes for select using (true);

-- ── setores ───────────────────────────────────────────────────
drop table if exists public.setores cascade;
create table public.setores (
  "CODIGO" text primary key,
  "NOME" text,
  "ATUSDASET" text,
  "OPCAOSET1" bigint,
  "ATUSDASET2" text,
  "OPCAOSET2" bigint,
  "IMPRIMIR" boolean,
  "SDA_ENT" boolean,
  "PREFABRIC" boolean,
  "ORDEM" bigint,
  "ABREVIAT" text,
  "QTDE_DIA" bigint,
  "HORAS" bigint,
  "IBAMA" boolean,
  "USAR_IWD" boolean,
  "USAR_GRAF" boolean,
  "PALMILHA" boolean,
  "CABEDAL" boolean,
  "SOLA" boolean,
  "EMBALAGEM" boolean
);
alter table public.setores enable row level security;
drop policy if exists "leitura_anonima" on public.setores;
create policy "leitura_anonima" on public.setores for select using (true);

-- ── peditens ──────────────────────────────────────────────────
drop table if exists public.peditens cascade;
create table public.peditens (
  "CODIGO" text,
  "ITEM" text,
  "PREVISAO" date,
  "PREVPROD" date,
  "REFERENCIA" text,
  "FABRICA" text,
  "FABRCLIE" text,
  "GRADE" text,
  "FIXAR_GRD" boolean,
  "GRADEPAD" text,
  "GRD_PADRAO" bigint,
  "NOME_GPAD" text,
  "NUMEROS" text,
  "MATERIAL" text,
  "COR" text,
  "JA4DIGITOS" boolean,
  "COORDENAR" boolean,
  "PRECO" numeric,
  "PRECO_FAB" numeric,
  "PRECOCDESC" numeric,
  "OBS" text,
  "TOTAL" bigint,
  "PROGRAMADO" bigint,
  "PRODUCAO" bigint,
  "EXPEDICAO" bigint,
  "FATURADO" bigint,
  "PROGRAMA" text,
  "REMESSA" text,
  "LOTE" text,
  "PROG_CUSTO" text,
  "MARCA" text,
  "CAIXA" text,
  "CARISOLASN" bigint,
  "CARISOLANO" text,
  "CORCARIMBO" text,
  "PALMILHA" bigint,
  "MARCPALM" text,
  "CORPALM" text,
  "CAPASALTO" bigint,
  "INF_CAPAS" boolean,
  "SALTO" text,
  "FORMA" text,
  "BEIRASOLA" text,
  "CORMETAIS" text,
  "CANCELADO" boolean,
  "EMPROD" boolean,
  "CORRUGADO" bigint,
  "CORR_CHAVE" text,
  "TALAOAGRUP" text,
  "MODELOCLIE" text,
  "SELMODCLIE" boolean,
  "CUSTOS" text,
  "COMIS_ITEM" numeric,
  "OPERADOR" text,
  "DIGITACAO" date,
  "HORA" text,
  "STATUS" bigint,
  "EPP" text,
  "EPPI" text,
  "NEGOCIOS" text,
  "ATRASO1" date,
  "ATRASO2" date,
  "ATRASO_TXT" text,
  "DATA_EXPED" date,
  "HORA_EXPED" text,
  "TIRAPOLIND" boolean,
  "REFPALMA" boolean,
  "REFTOTAL" boolean,
  "REFCOSTRED" boolean,
  "REFCOSTPOL" boolean,
  "C_ELASTICO" boolean,
  "C_VIES" boolean,
  "ITEMAREZZO" text,
  "ORD_AREZZO" text,
  "EPPFAT221" text,
  "WEB_ID" bigint,
  "FAB_ID" bigint,
  "GRD_CLIE" text,
  "COR_CLIE" text,
  "DESC_CLIE" text,
  "UNIDADE" bigint,
  "ITEMPED" text,
  "OPCAO34" bigint,
  "PRIVALMC" text,
  "ROYALTIE" bigint,
  "CODI_ROY" text,
  "NOME_ROY" text,
  "COMIS_ROY" numeric,
  "REMES_CLIE" text,
  "BLOQ_232" boolean,
  "LSTPRMAT" text,
  "MAT_ESP" text,
  "COR_ESP" text,
  "MAT_FACE2" text,
  "COR_FACE2" text,
  "TORNO" numeric,
  "FINAL" numeric,
  "REFILAR" numeric,
  "LARG_M2" numeric,
  "LARG_MT" numeric,
  "QTDE_ME" bigint,
  "BLOQ_236A" boolean,
  "REFER_U" text,
  "PERSONAL" text,
  "VLR_GRAVAC" numeric,
  "ORDEM_FOTO" text,
  "REFERCLIE" text,
  primary key ("CODIGO", "ITEM")
);
alter table public.peditens enable row level security;
drop policy if exists "leitura_anonima" on public.peditens;
create policy "leitura_anonima" on public.peditens for select using (true);

-- ── talsetor ──────────────────────────────────────────────────
drop table if exists public.talsetor cascade;
create table public.talsetor (
  "REMESSA" text,
  "LOTE" text,
  "SETOR" text,
  "NOMESET" text,
  "TALAO" text,
  "DATA" date,
  "QTDE" bigint
);
alter table public.talsetor enable row level security;
drop policy if exists "leitura_anonima" on public.talsetor;
create policy "leitura_anonima" on public.talsetor for select using (true);

-- ============================================================
-- SYNC LOG (controle de sincronização SE Link)
-- ============================================================
create table if not exists public.sync_log (
  id          integer primary key,
  ultima_sync timestamptz not null default now(),
  force_sync  boolean not null default false
);
alter table public.sync_log enable row level security;
drop policy if exists "leitura_anonima_sync" on public.sync_log;
create policy "leitura_anonima_sync" on public.sync_log for select using (true);

-- Linha inicial (id=1 fixo — o SE Link sempre faz upsert nesse id)
insert into public.sync_log (id, ultima_sync, force_sync)
values (1, now(), false)
on conflict (id) do nothing;

-- ============================================================
-- AUTENTICAÇÃO (usuários + sessões de login)
-- ============================================================

-- ── usuarios ──────────────────────────────────────────────────
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
create policy "sem_acesso_anonimo_usuarios" on public.usuarios for all using (false);

insert into public.usuarios (username, nome, password_hash) values
  ('admin', 'Administrador', crypt('simpleeco', gen_salt('bf'))),
  ('adm',   'ADM',           crypt('adm',       gen_salt('bf')))
on conflict (username) do nothing;

-- ── login_sessions ────────────────────────────────────────────
create table if not exists public.login_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.usuarios(id) on delete cascade,
  token_hash  text not null,
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now(),
  -- device info (preenchido via RPC registrar_device_sessao após login)
  ip          text,
  user_agent  text,
  device_type text,
  os          text,
  browser     text
);
create index if not exists idx_login_sessions_user_id    on public.login_sessions(user_id);
create index if not exists idx_login_sessions_expires_at on public.login_sessions(expires_at);

alter table public.login_sessions enable row level security;
drop policy if exists "sem_acesso_anonimo_sessoes" on public.login_sessions;
create policy "sem_acesso_anonimo_sessoes" on public.login_sessions for all using (false);

-- ── funções de autenticação ───────────────────────────────────
create or replace function public.criar_sessao_login(p_username text, p_password text)
returns table (token text, username text, nome text, expires_at timestamptz)
language plpgsql security definer as $$
declare
  v_user       public.usuarios%rowtype;
  v_token      text;
  v_expires_at timestamptz;
begin
  select * into v_user
  from public.usuarios
  where usuarios.username = p_username
    and usuarios.ativo = true
    and usuarios.password_hash = crypt(p_password, usuarios.password_hash)
  limit 1;

  if not found then return; end if;

  v_token      := encode(gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '7 days';

  insert into public.login_sessions (user_id, token_hash, expires_at)
  values (v_user.id, crypt(v_token, gen_salt('bf')), v_expires_at);

  return query select v_token, v_user.username, v_user.nome, v_expires_at;
end;
$$;

create or replace function public.validar_sessao_login(p_token text)
returns table (user_id uuid, username text, nome text, expires_at timestamptz)
language sql security definer as $$
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

create or replace function public.revogar_sessao_login(p_token text)
returns void
language sql security definer as $$
  update public.login_sessions
  set revoked_at = now()
  where revoked_at is null
    and token_hash = crypt(p_token, token_hash);
$$;

-- ── funções de device / logs ──────────────────────────────────

-- Atualiza device info na sessão após login
create or replace function public.registrar_device_sessao(
  p_token text, p_ip text, p_user_agent text, p_device_type text, p_os text, p_browser text
)
returns void language sql security definer as $$
  update public.login_sessions
  set ip = p_ip, user_agent = p_user_agent, device_type = p_device_type, os = p_os, browser = p_browser
  where token_hash = crypt(p_token, token_hash)
    and revoked_at is null and expires_at > now();
$$;

-- Retorna histórico de acessos para o painel (sem token_hash)
create or replace function public.get_login_activity()
returns table (
  id uuid, username text, nome text, ip text, user_agent text,
  device_type text, os text, browser text,
  created_at timestamptz, expires_at timestamptz, revoked_at timestamptz, status text
)
language sql security definer as $$
  select ls.id, u.username, u.nome, ls.ip, ls.user_agent, ls.device_type, ls.os, ls.browser,
    ls.created_at, ls.expires_at, ls.revoked_at,
    case when ls.revoked_at is not null then 'logout'
         when ls.expires_at < now()     then 'expirado'
         else 'ativo' end as status
  from public.login_sessions ls
  join public.usuarios u on u.id = ls.user_id
  order by ls.created_at desc;
$$;

-- Limpa todo o histórico de sessões
create or replace function public.limpar_historico_sessoes()
returns void language sql security definer as $$
  delete from public.login_sessions where id is not null;
$$;

-- ── permissões RPC para anon ──────────────────────────────────
revoke all on table public.usuarios       from anon;
revoke all on table public.login_sessions from anon;

grant execute on function public.criar_sessao_login(text, text)                          to anon;
grant execute on function public.validar_sessao_login(text)                              to anon;
grant execute on function public.revogar_sessao_login(text)                              to anon;
grant execute on function public.registrar_device_sessao(text,text,text,text,text,text)  to anon;
grant execute on function public.get_login_activity()                                    to anon, authenticated;
grant execute on function public.limpar_historico_sessoes()                              to anon, authenticated;
