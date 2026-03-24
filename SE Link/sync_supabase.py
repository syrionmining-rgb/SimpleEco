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

import hashlib
import json
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
# group_by: campo usado para delta sync em tabelas sem PK simples
DBF_MAP = {
    "clientes":  {"table": "clientes",  "pk": "CODIGO",  "group_by": None},
    "pedidos":   {"table": "pedidos",   "pk": "CODIGO",  "group_by": None},
    "fichas":    {"table": "fichas",    "pk": "CODIGO",  "group_by": None},
    "taloes":    {"table": "taloes",    "pk": "CODIGO",  "group_by": None},
    "peditens":  {"table": "peditens",  "pk": None,      "group_by": "CODIGO"},  # agrupa por pedido
    "talsetor":  {"table": "talsetor",  "pk": None,      "group_by": "TALAO"},   # agrupa por talão
    "setores":   {"table": "setores",   "pk": "CODIGO",  "group_by": None},
    "pedimate":  {"table": "pedimate",  "pk": None,      "group_by": "CODIGO"},  # agrupa por pedido
    "material":  {"table": "material",  "pk": "CODIGO",  "group_by": None},
    "grades":    {"table": "grades",    "pk": "CODIGO",  "group_by": None},
    "talaoaux":  {"table": "talaoaux",  "pk": "CODIGO",  "group_by": None},
}

DEBOUNCE_SECONDS = 2   # aguarda N seg após última alteração antes de sincronizar

# ── Snapshot e hash de arquivo para delta sync ───────────────────────────────
# _snapshot: { nome: { chave: md5 } }  — PK tables usam pk_val, group tables usam group_val
# _file_hash: { nome: md5_do_arquivo } — skip imediato se o arquivo não mudou
_snapshot:  dict[str, dict[str, str]] = {}
_file_hash: dict[str, str]            = {}


def _rec_hash(rec: dict) -> str:
    return hashlib.md5(
        json.dumps(rec, sort_keys=True, default=str).encode()
    ).hexdigest()


def _group_hash(recs: list[dict]) -> str:
    serialized = sorted(json.dumps(r, sort_keys=True, default=str) for r in recs)
    return hashlib.md5(json.dumps(serialized).encode()).hexdigest()


def _hash_file(name: str) -> str:
    path = BASE_DIR / f"{name}.dbf"
    if not path.exists():
        return ""
    h = hashlib.md5()
    with open(str(path), "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()

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


def _pg_bulk_insert(table_name: str, records: list[dict]) -> bool:
    """Insere registros diretamente via pg8000 (sem PostgREST, sem timeout de 8s).
    Usa multi-row INSERT em lotes de 500 linhas por statement SQL.
    """
    db_url = os.getenv("DATABASE_URL", "")
    if not db_url or not records:
        return False
    try:
        import pg8000.dbapi as pgd
        m = re.match(r'postgresql://([^:]+):([^@]+)@([^:/]+):?(\d+)?/(.+)', db_url)
        if not m:
            return False
        user, password, host, port, database = m.groups()
        conn = pgd.connect(
            user=user, password=password, host=host,
            port=int(port or 5432), database=database, ssl_context=True,
        )
        cursor = conn.cursor()
        cols = list(records[0].keys())
        col_str = ', '.join(f'"{c}"' for c in cols)
        BATCH = 500
        for i in range(0, len(records), BATCH):
            batch = records[i:i + BATCH]
            row_ph = ', '.join(f"({', '.join(['%s'] * len(cols))})" for _ in batch)
            params  = [r.get(c) for r in batch for c in cols]
            cursor.execute(
                f'INSERT INTO public."{table_name}" ({col_str}) VALUES {row_ph}',
                params,
            )
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        log.warning(f"pg8000 bulk insert falhou para {table_name}: {e}")
        return False

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

        # TRUNCATE + INSERT via pg8000 direto (sem PostgREST, sem timeout)
        truncated = _truncate_table(table)
        if truncated:
            if not _pg_bulk_insert(table, records):
                # Fallback REST API se pg8000 indisponível
                BATCH = 1000
                for i in range(0, len(records), BATCH):
                    supabase.table(table).insert(records[i:i+BATCH]).execute()
        else:
            # Sem DATABASE_URL: UPSERT (PK) ou DELETE+INSERT (sem PK) via REST
            BATCH = 1000
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

        # Salva snapshot e hash do arquivo para delta sync nas próximas alterações
        _file_hash[name] = _hash_file(name)
        group_by = config.get("group_by")
        if pk:
            _snapshot[name] = {
                str(r.get(pk, "")).strip(): _rec_hash(r)
                for r in records if str(r.get(pk, "")).strip()
            }
        elif group_by:
            groups: dict[str, list] = {}
            for r in records:
                g = str(r.get(group_by, "")).strip()
                if g:
                    groups.setdefault(g, []).append(r)
            _snapshot[name] = {g: _group_hash(recs) for g, recs in groups.items()}

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


def sync_table_delta(supabase: Client, name: str, config: dict):
    """Envia apenas registros alterados desde o último sync completo.

    Fluxo:
      1. File hash — pula se o arquivo não mudou (sem custo de leitura/rede)
      2. PK table  — row-level delta: upsert alterados + delete removidos
      3. Group-by  — group-level delta: re-sincroniza só os grupos alterados
      4. Fallback  — sync completo quando não há snapshot
    """
    # 1. File hash — skip imediato se o arquivo não mudou
    new_fh = _hash_file(name)
    if new_fh and _file_hash.get(name) == new_fh:
        log.info(f"✔ {name}: arquivo sem alterações, pulando.")
        return

    pk       = config["pk"]
    group_by = config.get("group_by")
    table    = config["table"]

    # 2. PK table com snapshot → row-level delta
    if pk and name in _snapshot:
        records = read_dbf(name)
        if not records:
            return
        prev     = _snapshot[name]
        new_snap: dict[str, str] = {}
        to_upsert: list[dict]    = []
        for rec in records:
            pk_val = str(rec.get(pk, "")).strip()
            if not pk_val:
                continue
            h = _rec_hash(rec)
            new_snap[pk_val] = h
            if pk_val not in prev or prev[pk_val] != h:
                to_upsert.append(rec)
        to_delete = [v for v in prev if v not in new_snap]
        if not to_upsert and not to_delete:
            log.info(f"✔ {name}: sem alterações.")
            _file_hash[name] = new_fh
            return
        log.info(f"{name}: delta PK — +{len(to_upsert)} upsert, -{len(to_delete)} excluir")
        BATCH = 5000
        try:
            if to_upsert:
                for i in range(0, len(to_upsert), BATCH):
                    supabase.table(table).upsert(to_upsert[i:i+BATCH]).execute()
            if to_delete:
                for i in range(0, len(to_delete), 500):
                    supabase.table(table).delete().in_(pk, to_delete[i:i+500]).execute()
            _snapshot[name] = new_snap
            _file_hash[name] = new_fh
            log.info(f"✔ {name}: delta PK aplicado.")
        except Exception as e:
            log.error(f"✘ {name} delta PK: {e}")
            _snapshot.pop(name, None)
        return

    # 3. Group-by table com snapshot → group-level delta
    if group_by and name in _snapshot:
        records = read_dbf(name)
        if not records:
            return
        prev = _snapshot[name]   # {group_val: group_hash}
        # Agrupa registros atuais
        new_groups: dict[str, list[dict]] = {}
        for rec in records:
            g = str(rec.get(group_by, "")).strip()
            if g:
                new_groups.setdefault(g, []).append(rec)
        new_snap = {g: _group_hash(recs) for g, recs in new_groups.items()}
        changed = [g for g, h in new_snap.items() if prev.get(g) != h]
        deleted = [g for g in prev if g not in new_snap]
        if not changed and not deleted:
            log.info(f"✔ {name}: sem alterações.")
            _file_hash[name] = new_fh
            return
        log.info(f"{name}: delta grupo — {len(changed)} grupos alt., {len(deleted)} excluídos")
        BATCH = 5000
        try:
            to_remove = changed + deleted
            for i in range(0, len(to_remove), 500):
                supabase.table(table).delete().in_(group_by, to_remove[i:i+500]).execute()
            to_insert = [rec for g in changed for rec in new_groups[g]]
            for i in range(0, len(to_insert), BATCH):
                supabase.table(table).insert(to_insert[i:i+BATCH]).execute()
            _snapshot[name] = new_snap
            _file_hash[name] = new_fh
            log.info(f"✔ {name}: delta grupo aplicado ({len(to_insert)} registros).")
        except Exception as e:
            log.error(f"✘ {name} delta grupo: {e}")
            _snapshot.pop(name, None)
        return

    # 4. Sem snapshot → sync completo
    log.info(f"{name}: sem snapshot — sincronização completa.")
    sync_table(supabase, name, config)


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
        sync_table_delta(self.supabase, name, DBF_MAP[name])
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
