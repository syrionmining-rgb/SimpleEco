"""
Gera o SQL para Supabase lendo as colunas reais dos arquivos DBF.
Execute: python gerar_schema.py
Isso cria/atualiza o arquivo supabase_dbf_schema.sql
"""

import datetime
from pathlib import Path
from dbfread import DBF

DBF_DIR = Path(__file__).parent.parent / "DBF"

PKS = {
    "clientes": "CODIGO",
    "pedidos": "CODIGO",
    "fichas": "CODIGO",
    "taloes": "CODIGO",
    "setores": "CODIGO",
    "peditens": None,
    "talsetor": None,
}


def get_columns(name: str):
    path = DBF_DIR / f"{name}.dbf"
    if not path.exists():
        print(f"  FALTANDO: {path}")
        return {}

    tbl = DBF(str(path), ignore_missing_memofile=True, encoding="latin-1")
    col_types = {}
    for field in tbl.fields:
        if field.name == "DeletionFlag":
            continue
        ft = field.type
        if ft == "L":
            col_types[field.name] = "boolean"
        elif ft == "D":
            col_types[field.name] = "date"
        elif ft == "N":
            col_types[field.name] = "numeric" if field.decimal_count > 0 else "bigint"
        elif ft == "F":
            col_types[field.name] = "numeric"
        else:
            col_types[field.name] = "text"
    return col_types


def build_sql():
    lines = [
        "-- ============================================================",
        "-- Schema gerado automaticamente de: " + str(DBF_DIR),
        "-- Execute no SQL Editor do Supabase",
        "-- ATENCAO: faz DROP das tabelas existentes e recria do zero",
        "-- ============================================================",
        "",
        "create extension if not exists \"pgcrypto\";",
        "",
    ]

    for name, pk in PKS.items():
        print(f"Processando {name}.dbf ...")
        col_types = get_columns(name)
        if not col_types:
            continue

        col_defs = [f'  "{col}" {typ}' for col, typ in col_types.items()]
        pk_line = f',\n  primary key ("{pk}")' if pk else ""

        lines += [
            f"-- -- {name} --------------------------------------------------",
            f"drop table if exists public.{name} cascade;",
            f"create table public.{name} (",
            ",\n".join(col_defs) + pk_line,
            ");",
            f"alter table public.{name} enable row level security;",
            f'drop policy if exists "leitura_anonima" on public.{name};',
            f'create policy "leitura_anonima" on public.{name} for select using (true);',
            "",
        ]
        print(f"  -> {len(col_defs)} colunas, PK: {pk or 'composta'}")

    lines += [
        "-- -- usuarios (login) -----------------------------------------",
        "create table if not exists public.usuarios (",
        "  id            uuid primary key default gen_random_uuid(),",
        "  username      text unique not null,",
        "  nome          text not null,",
        "  password_hash text not null,",
        "  ativo         boolean not null default true",
        ");",
        "alter table public.usuarios enable row level security;",
        'drop policy if exists "sem_acesso_anonimo_usuarios" on public.usuarios;',
        'create policy "sem_acesso_anonimo_usuarios" on public.usuarios for all using (false);',
        "",
        "insert into public.usuarios (username, nome, password_hash) values",
        "  ('admin', 'Administrador', crypt('simpleeco', gen_salt('bf'))),",
        "  ('adm',   'ADM',           crypt('adm',       gen_salt('bf')))",
        "on conflict (username) do nothing;",
        "",
        "create table if not exists public.login_sessions (",
        "  id         uuid primary key default gen_random_uuid(),",
        "  user_id    uuid not null references public.usuarios(id) on delete cascade,",
        "  token_hash text not null,",
        "  expires_at timestamptz not null,",
        "  revoked_at timestamptz,",
        "  created_at timestamptz not null default now()",
        ");",
        "create index if not exists idx_login_sessions_user_id on public.login_sessions(user_id);",
        "create index if not exists idx_login_sessions_expires_at on public.login_sessions(expires_at);",
        "alter table public.login_sessions enable row level security;",
        'drop policy if exists "sem_acesso_anonimo_sessoes" on public.login_sessions;',
        'create policy "sem_acesso_anonimo_sessoes" on public.login_sessions for all using (false);',
        "",
        "create or replace function public.criar_sessao_login(p_username text, p_password text)",
        "returns table (token text, username text, nome text, expires_at timestamptz)",
        "language plpgsql security definer as $$",
        "declare",
        "  v_user public.usuarios%rowtype;",
        "  v_token text;",
        "  v_expires_at timestamptz;",
        "begin",
        "  select * into v_user",
        "  from public.usuarios",
        "  where ativo = true",
        "    and usuarios.username = p_username",
        "    and password_hash = crypt(p_password, password_hash)",
        "  limit 1;",
        "",
        "  if not found then",
        "    return;",
        "  end if;",
        "",
        "  v_token := encode(gen_random_bytes(32), 'hex');",
        "  v_expires_at := now() + interval '7 days';",
        "",
        "  insert into public.login_sessions (user_id, token_hash, expires_at)",
        "  values (v_user.id, crypt(v_token, gen_salt('bf')), v_expires_at);",
        "",
        "  return query",
        "  select v_token, v_user.username, v_user.nome, v_expires_at;",
        "end;",
        "$$;",
        "",
        "create or replace function public.validar_sessao_login(p_token text)",
        "returns table (user_id uuid, username text, nome text, expires_at timestamptz)",
        "language sql security definer as $$",
        "  select u.id, u.username, u.nome, ls.expires_at",
        "  from public.login_sessions ls",
        "  join public.usuarios u on u.id = ls.user_id",
        "  where ls.revoked_at is null",
        "    and ls.expires_at > now()",
        "    and u.ativo = true",
        "    and ls.token_hash = crypt(p_token, ls.token_hash)",
        "  order by ls.created_at desc",
        "  limit 1;",
        "$$;",
        "",
        "create or replace function public.revogar_sessao_login(p_token text)",
        "returns void",
        "language sql security definer as $$",
        "  update public.login_sessions",
        "  set revoked_at = now()",
        "  where revoked_at is null",
        "    and token_hash = crypt(p_token, token_hash);",
        "$$;",
        "",
        "grant execute on function public.criar_sessao_login(text, text) to anon;",
        "grant execute on function public.validar_sessao_login(text) to anon;",
        "grant execute on function public.revogar_sessao_login(text) to anon;",
    ]

    return "\n".join(lines)


if __name__ == "__main__":
    sql = build_sql()
    out = Path(__file__).parent / "supabase_dbf_schema.sql"
    out.write_text(sql, encoding="utf-8")
    print(f"\nSchema gerado em: {out}")
    print("Cole o conteudo no SQL Editor do Supabase e execute.")
