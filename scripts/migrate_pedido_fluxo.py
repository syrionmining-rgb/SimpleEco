"""
Cria a tabela pedido_fluxo no Supabase.
Execução: python scripts/migrate_pedido_fluxo.py
"""
import psycopg2

CONN = "postgresql://postgres:MpCmzoSLictY97lM@db.whwwcgyqpaspzymhdwox.supabase.co:5432/postgres"

SQL = """
create table if not exists public.pedido_fluxo (
  id          serial primary key,
  pedido_codigo text not null unique,
  item_id     integer not null references public.prod_items(id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table public.pedido_fluxo enable row level security;

drop policy if exists "pedido_fluxo_all" on public.pedido_fluxo;
create policy "pedido_fluxo_all"
  on public.pedido_fluxo for all
  using (true)
  with check (true);
"""

def main():
    print("Conectando ao Supabase...")
    conn = psycopg2.connect(CONN)
    conn.autocommit = True
    cur = conn.cursor()
    print("Criando tabela pedido_fluxo...")
    cur.execute(SQL)
    cur.execute("select count(*) from public.pedido_fluxo")
    count = cur.fetchone()[0]
    print(f"OK — tabela criada. Registros: {count}")
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
