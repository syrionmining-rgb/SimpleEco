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
    "peditens":  {"table": "peditens",  "pk": None},   # chave composta
    "talsetor":  {"table": "talsetor",  "pk": None},   # chave composta
    "setores":   {"table": "setores",   "pk": "CODIGO"},
}

DEBOUNCE_SECONDS = 2   # aguarda N seg após última alteração antes de sincronizar

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


def sync_table(supabase: Client, name: str, config: dict):
    records = read_dbf(name)
    if not records:
        log.info(f"{name}: nenhum registro encontrado, pulando.")
        return

    table  = config["table"]
    pk     = config["pk"]

    try:
        if pk:
            # Deduplica pelo PK (mantém o último registro em caso de duplicatas no DBF)
            seen: dict = {}
            for rec in records:
                key = str(rec.get(pk, "")).strip()
                if key:
                    seen[key] = rec
            records = list(seen.values())

            # UPSERT: insere ou atualiza — evita DELETE lento em tabelas grandes
            for i in range(0, len(records), 1000):
                supabase.table(table).upsert(records[i:i+1000]).execute()
        else:
            # Sem PK: apaga tudo e reinsere (com retry para timeout)
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
            for i in range(0, len(records), 1000):
                supabase.table(table).insert(records[i:i+1000]).execute()

        log.info(f"✔ {name} → {table}: {len(records)} registros sincronizados")
    except Exception as e:
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


def sync_all(supabase: Client):
    from concurrent.futures import ThreadPoolExecutor, as_completed
    from supabase import create_client as _create_client
    log.info("Iniciando sincronização completa (paralela)...")

    def _sync_one(name, config):
        # Cada thread usa seu próprio client para evitar conflitos de socket
        client = _create_client(SUPABASE_URL, SUPABASE_KEY)
        sync_table(client, name, config)

    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {
            pool.submit(_sync_one, name, config): name
            for name, config in DBF_MAP.items()
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
