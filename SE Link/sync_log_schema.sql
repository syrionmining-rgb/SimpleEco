-- Execute no SQL Editor do Supabase
-- Cria a tabela que guarda o timestamp da última sincronização DBF

create table if not exists public.sync_log (
  id         integer primary key,
  ultima_sync timestamptz not null default now()
);

-- Permite leitura anônima (frontend lê sem autenticação)
alter table public.sync_log enable row level security;
drop policy if exists "leitura_anonima_sync" on public.sync_log;
create policy "leitura_anonima_sync" on public.sync_log for select using (true);

-- Insere linha inicial (id=1 fixo — o script sempre faz upsert nesse id)
insert into public.sync_log (id, ultima_sync)
values (1, now())
on conflict (id) do nothing;
