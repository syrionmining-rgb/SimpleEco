"""
Gera o SQL correto para o Supabase lendo as colunas reais dos arquivos DBF.
Execute: python gerar_schema.py
Isso cria/atualiza o arquivo supabase_dbf_schema.sql
"""

import datetime
from pathlib import Path
from dbfread import DBF

DBF_DIR = Path(__file__).parent.parent / "DBF"

PKS = {
    "clientes": "CODIGO",
    "pedidos":  "CODIGO",
    "fichas":   "CODIGO",
    "taloes":   "CODIGO",
    "setores":  "CODIGO",
    "peditens": None,   # chave composta
    "talsetor": None,   # chave composta
}


def pg_type(value):
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, int):
        return "bigint"
    if isinstance(value, float):
        return "numeric"
    if isinstance(value, (datetime.date, datetime.datetime)):
        return "date"
    return "text"


def get_columns(name: str):
    path = DBF_DIR / f"{name}.dbf"
    if not path.exists():
        print(f"  FALTANDO: {path}")
        return []
    tbl = DBF(str(path), ignore_missing_memofile=True, encoding="latin-1")
    # Lê tipos do campo via metadados do DBF
    col_types = {}
    for field in tbl.fields:
        if field.name == "DeletionFlag":
            continue
        # Tipo bruto do DBF: N=numérico, D=data, L=lógico, C=caractere, F=float
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
        "-- ATENÇÃO: faz DROP das tabelas existentes e recria do zero",
        "-- ============================================================",
        "",
        "-- Extensão necessária para crypt() no login",
        'create extension if not exists "pgcrypto";',
        "",
    ]

    for name, pk in PKS.items():
        print(f"Processando {name}.dbf ...")
        col_types = get_columns(name)
        if not col_types:
            continue

        col_defs = []
        for col, typ in col_types.items():
            col_defs.append(f'  "{col}" {typ}')

        if pk:
            pk_line = f',\n  primary key ("{pk}")'
        else:
            pk_line = ""

        lines += [
            f"-- ── {name} ──────────────────────────────────────────────────",
            f"drop table if exists public.{name} cascade;",
            f"create table public.{name} (",
            ",\n".join(col_defs) + pk_line,
            ");",
            f"alter table public.{name} enable row level security;",
            f'drop policy if exists "leitura_anonima" on public.{name};',
            f'create policy "leitura_anonima" on public.{name} for select using (true);',
            "",
        ]
        print(f"  → {len(col_defs)} colunas, PK: {pk or 'composta'}")

    # Tabela de login (mantém a mesma)
    lines += [
        "-- ── usuarios (login) ────────────────────────────────────────",
        "create table if not exists public.usuarios (",
        '  id            uuid primary key default gen_random_uuid(),',
        '  username      text unique not null,',
        '  nome          text not null,',
        '  password_hash text not null,',
        '  ativo         boolean default true',
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
        "create or replace function public.verificar_login(p_username text, p_password text)",
        "returns table (id uuid, username text, nome text)",
        "language sql security definer as $$",
        "  select id, username, nome from public.usuarios",
        "  where ativo = true",
        "    and usuarios.username = p_username",
        "    and password_hash = crypt(p_password, password_hash);",
        "$$;",
    ]

    return "\n".join(lines)


if __name__ == "__main__":
    sql = build_sql()
    out = Path(__file__).parent / "supabase_dbf_schema.sql"
    out.write_text(sql, encoding="utf-8")
    print(f"\n✔ Schema gerado em: {out}")
    print("  Cole o conteúdo no SQL Editor do Supabase e execute.")
