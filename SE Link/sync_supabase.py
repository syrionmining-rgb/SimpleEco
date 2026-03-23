"""
DBF → Supabase sync
Monitora os arquivos DBF do Simple&Eco e sincroniza com o Supabase em tempo real.

Dependências:
    pip install dbfread supabase watchdog python-dotenv

Configuração:
    Crie um arquivo .env na raiz do projeto com:
        SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
        SUPABASE_KEY=sua_service_role_key_aqui
"""

import os
import re
import time
import logging
from datetime import date, datetime
from pathlib import Path
from dotenv import load_dotenv
from dbfread import DBF
from supabase import create_client, Client
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# ── Config ──────────────────────────────────────────────────────────────────
load_dotenv()

# URL já configurada — TI só precisa preencher a SUPABASE_KEY abaixo
# ou criar um arquivo .env na mesma pasta com:
#   SUPABASE_KEY=sua_service_role_key_aqui

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://whwwcgyqpaspzymhdwox.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")   # ← TI: cola a service_role key aqui

BASE_DIR = Path(__file__).parent.parent / "DBF"

# Mapeamento: arquivo DBF → tabela Supabase → campo chave primária
DBF_MAP = {
    "clientes":  {"table": "clientes",  "pk": "CODIGO"},
    "pedidos":   {"table": "pedidos",   "pk": "CODIGO"},
    "fichas":    {"table": "fichas",    "pk": "CODIGO"},
    "taloes":    {"table": "taloes",    "pk": "CODIGO"},
    "peditens":  {"table": "peditens",  "pk": None},   # chave composta (CODIGO, ITEM)
    "talsetor":  {"table": "talsetor",  "pk": None},   # chave composta
    "setores":   {"table": "setores",   "pk": "CODIGO"},
    "pedimate":  {"table": "pedimate",  "pk": None},   # chave composta (CODIGO, ITEM, ORDEM)
    "material":  {"table": "material",  "pk": "CODIGO"},
    "grades":    {"table": "grades",    "pk": "CODIGO"},
    "talaoaux":  {"table": "talaoaux",  "pk": "CODIGO"},
}

DEBOUNCE_SECONDS = 2   # aguarda N seg após última alteração antes de sincronizar

# ── Conexão direta PostgreSQL (para DDL e TRUNCATE) ──────────────────────────
# Adicione ao .env:  DATABASE_URL=postgresql://postgres:<senha>@db.<ref>.supabase.co:5432/postgres

_DBF_TO_PG = {
    'C': 'TEXT', 'M': 'TEXT', 'G': 'TEXT',
    'N': 'DOUBLE PRECISION', 'F': 'DOUBLE PRECISION',
    'B': 'DOUBLE PRECISION', 'Y': 'DOUBLE PRECISION',
    'I': 'BIGINT', '0': 'BIGINT',
    'D': 'DATE', 'T': 'TIMESTAMPTZ',
    'L': 'BOOLEAN',
}


def _pg_conn():
    """Abre uma conexão pg8000 usando DATABASE_URL do .env. Retorna None se não configurado."""
    db_url = os.getenv("DATABASE_URL", "")
    if not db_url:
        return None
    try:
        import pg8000.native as pg
        m = re.match(r'postgresql://([^:]+):([^@]+)@([^:/]+):?(\d+)?/(.+)', db_url)
        if not m:
            log.warning("DATABASE_URL com formato inválido.")
            return None
        user, password, host, port, database = m.groups()
        return pg.Connection(
            user=user, password=password, host=host,
            port=int(port or 5432), database=database, ssl_context=True,
        )
    except Exception as e:
        log.warning(f"Não foi possível conectar ao PostgreSQL: {e}")
        return None


def auto_create_table(name: str, pk: str | None) -> bool:
    """Lê a estrutura do DBF e cria a tabela no Supabase caso ela não exista."""
    path = BASE_DIR / f"{name}.dbf"
    if not path.exists():
        log.warning(f"auto_create_table: {path} não encontrado.")
        return False
    conn = _pg_conn()
    if not conn:
        log.warning(f"DATABASE_URL não configurado — não é possível criar '{name}' automaticamente.")
        return False
    try:
        table = DBF(str(path), ignore_missing_memofile=True, encoding="latin-1")
        col_defs = []
        for field in table.fields:
            pg_type = _DBF_TO_PG.get(field.type, 'TEXT')
            col = field.name.upper()
            if col == pk:
                col_defs.append(f'"{col}" TEXT PRIMARY KEY')
            else:
                col_defs.append(f'"{col}" {pg_type}')
        ddl = f'CREATE TABLE IF NOT EXISTS public."{name}" ({", ".join(col_defs)})'
        conn.run(ddl)
        conn.run(f'ALTER TABLE public."{name}" ENABLE ROW LEVEL SECURITY')
        conn.run(f'DROP POLICY IF EXISTS "{name}_open" ON public."{name}"')
        conn.run(
            f'CREATE POLICY "{name}_open" ON public."{name}" '
            f'FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)'
        )
        conn.run("NOTIFY pgrst, 'reload schema'")
        log.info(f"✔ Tabela '{name}' criada automaticamente no Supabase.")
        return True
    except Exception as e:
        log.error(f"Erro ao criar tabela '{name}': {e}")
        return False
    finally:
        conn.close()


def _truncate_table(table_name: str) -> bool:
    """Executa TRUNCATE via conexão direta. Muito mais rápido que DELETE para tabelas grandes."""
    conn = _pg_conn()
    if not conn:
        return False
    try:
        conn.run(f'TRUNCATE TABLE public."{table_name}"')
        return True
    except Exception as e:
        log.warning(f"TRUNCATE {table_name} falhou: {e}")
        return False
    finally:
        conn.close()

# ── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("sync.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger(__name__)


# ── Helpers ──────────────────────────────────────────────────────────────────
def serialize(value):
    """Converte tipos DBF para JSON-serializáveis."""
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, bytes):
        return value.decode("latin-1", errors="replace")
    return value


def read_dbf(name: str) -> list[dict]:
    path = BASE_DIR / f"{name}.dbf"
    if not path.exists():
        log.warning(f"Arquivo não encontrado: {path}")
        return []
    try:
        table = DBF(str(path), ignore_missing_memofile=True, encoding="latin-1")
        records = []
        for rec in table:
            if getattr(rec, "deleted", False) or rec.get("DeletionFlag"):
                continue
            records.append({k: serialize(v) for k, v in dict(rec).items()})
        return records
    except Exception as e:
        log.error(f"Erro ao ler {name}.dbf: {e}")
        return []


def sync_table(supabase: Client, name: str, config: dict, _retry: bool = False):
    records = read_dbf(name)
    if not records:
        log.info(f"{name}: nenhum registro encontrado, pulando.")
        return

    table = config["table"]
    pk    = config["pk"]

    try:
        # Deduplica pelo PK quando existe
        if pk:
            seen: dict = {}
            for rec in records:
                key = str(rec.get(pk, "")).strip()
                if key:
                    seen[key] = rec
            records = list(seen.values())

        # TRUNCATE via conexão direta (sem timeout) + INSERT em lotes via REST
        # Muito mais rápido que UPSERT ou DELETE para tabelas grandes
        BATCH = 5000   # lotes maiores = menos requests HTTP ao Supabase
        truncated = _truncate_table(table)
        if truncated:
            for i in range(0, len(records), BATCH):
                supabase.table(table).insert(records[i:i+BATCH]).execute()
        else:
            # Fallback sem DATABASE_URL: UPSERT (PK) ou DELETE+INSERT (sem PK)
            if pk:
                for i in range(0, len(records), BATCH):
                    supabase.table(table).upsert(records[i:i+BATCH]).execute()
            else:
                first_col = list(records[0].keys())[0]
                for attempt in range(3):
                    try:
                        supabase.table(table).delete().neq(first_col, "__impossivel__").execute()
                        break
                    except Exception as e:
                        if attempt < 2:
                            log.warning(f"Retry {attempt+1} DELETE {name}: {e}")
                            time.sleep(3)
                        else:
                            raise
                for i in range(0, len(records), BATCH):
                    supabase.table(table).insert(records[i:i+BATCH]).execute()

        log.info(f"✔ {name} → {table}: {len(records)} registros sincronizados")

    except Exception as e:
        err = str(e)
        # Tabela não existe no schema cache → tentar criar automaticamente
        if not _retry and ('PGRST205' in err or 'schema cache' in err.lower()):
            log.warning(f"{name}: tabela não encontrada — criando automaticamente...")
            if auto_create_table(name, pk):
                time.sleep(4)  # aguarda PostgREST recarregar o schema
                sync_table(supabase, name, config, _retry=True)
                return
        log.error(f"✘ Erro ao sincronizar {name}: {e}")


def update_sync_log(supabase: Client):
    """Grava timestamp da última sincronização na tabela sync_log."""
    try:
        from datetime import timezone
        ts = datetime.now(timezone.utc).isoformat()
        supabase.table("sync_log").upsert({"id": 1, "ultima_sync": ts}).execute()
        log.info(f"sync_log atualizado: {ts}")
    except Exception as e:
        log.warning(f"Não foi possível atualizar sync_log: {e}")


def get_active_dbf_map(supabase: Client) -> dict:
    """Lê o mapa de sincronização ativo do sync_config no Supabase.
    Retorna DBF_MAP (hardcoded) como fallback se falhar."""
    try:
        res = supabase.table("sync_config") \
            .select("dbf_name, table_name, pk_field") \
            .eq("enabled", True) \
            .execute()
        if res.data:
            active = {
                row["dbf_name"]: {"table": row["table_name"], "pk": row["pk_field"] or None}
                for row in res.data
                if row.get("table_name")
            }
            if active:
                log.info(f"sync_config: {len(active)} tabelas ativas — {', '.join(active)}")
                return active
    except Exception as e:
        log.warning(f"Não foi possível ler sync_config: {e}. Usando mapa padrão.")
    return DBF_MAP


def report_available_dbfs(supabase: Client, base_dir: Path):
    """Escaneia a pasta DBF e reporta os arquivos encontrados ao sync_config."""
    try:
        found = sorted(p.stem.lower() for p in base_dir.glob("*.dbf"))
        if not found:
            return
        ts = datetime.now().isoformat()
        rows = [{"dbf_name": name, "discovered": True, "found_at": ts} for name in found]
        supabase.table("sync_config").upsert(rows, on_conflict="dbf_name").execute()
        log.info(f"DBFs disponíveis reportados: {', '.join(found)}")
    except Exception as e:
        log.warning(f"Não foi possível reportar DBFs disponíveis: {e}")


def sync_all(supabase: Client, dbf_map: dict | None = None):
    from concurrent.futures import ThreadPoolExecutor, as_completed
    from supabase import create_client as _create_client

    active_map = dbf_map if dbf_map is not None else DBF_MAP
    log.info(f"Iniciando sincronização completa ({len(active_map)} tabelas, sequencial)...")

    def _sync_one(name, config):
        # Cada thread usa seu próprio client para evitar conflitos de socket
        client = _create_client(SUPABASE_URL, SUPABASE_KEY)
        sync_table(client, name, config)

    with ThreadPoolExecutor(max_workers=1) as pool:
        futures = {
            pool.submit(_sync_one, name, config): name
            for name, config in active_map.items()
        }
        for future in as_completed(futures):
            name = futures[future]
            try:
                future.result()
            except Exception as e:
                log.error(f"✘ Erro na thread de {name}: {e}")
    update_sync_log(supabase)
    log.info("Sincronização completa concluída.")


# ── Watchdog ─────────────────────────────────────────────────────────────────
class DBFHandler(FileSystemEventHandler):
    def __init__(self, supabase: Client):
        self.supabase   = supabase
        self._timers: dict[str, float] = {}

    def on_modified(self, event):
        if event.is_directory:
            return
        path = Path(event.src_path)
        if path.suffix.lower() != ".dbf":
            return

        name = path.stem.lower()
        if name not in DBF_MAP:
            return

        # Debounce: ignora disparos duplicados em rápida sucessão
        now = time.time()
        last = self._timers.get(name, 0)
        if now - last < DEBOUNCE_SECONDS:
            return
        self._timers[name] = now

        log.info(f"Alteração detectada: {path.name}")
        time.sleep(DEBOUNCE_SECONDS)   # aguarda o sistema liberar o arquivo
        sync_table(self.supabase, name, DBF_MAP[name])
        update_sync_log(self.supabase)


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    if not SUPABASE_KEY:
        log.error("=" * 55)
        log.error("  CHAVE NÃO CONFIGURADA!")
        log.error("  Abra o arquivo sync_supabase.py e cole a")
        log.error("  service_role key na linha:")
        log.error('  SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")')
        log.error("  OU crie um arquivo .env com:")
        log.error("  SUPABASE_KEY=sua_chave_aqui")
        log.error("=" * 55)
        input("Pressione Enter para sair...")
        return

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    log.info(f"Conectado ao Supabase: {SUPABASE_URL}")

    # Carga inicial
    sync_all(supabase)

    # Monitor contínuo
    handler  = DBFHandler(supabase)
    observer = Observer()
    observer.schedule(handler, str(BASE_DIR), recursive=False)
    observer.start()
    log.info(f"Monitorando {BASE_DIR} ... (Ctrl+C para parar)")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        log.info("Sincronizador encerrado.")
    observer.join()


if __name__ == "__main__":
    main()
