"""
Simple&Eco Link - Sincronizador DBF -> Supabase
Interface construida com PyWebView (HTML + CSS real)

Executar: python link.py  (dentro da pasta ETL/)
"""

import json
import logging
import os
import queue
import sys
import threading
import time
from pathlib import Path

import webview

# ── Localiza o diretorio real do exe (funciona frozen e em dev) ──────────────
if getattr(sys, 'frozen', False):
    # Rodando como .exe gerado pelo PyInstaller
    _EXE_DIR = Path(sys.executable).parent
else:
    # Rodando como script Python normal
    _EXE_DIR = Path(__file__).parent

# Carrega .env do diretorio do exe ANTES de qualquer import que precise das vars
from dotenv import load_dotenv
load_dotenv(_EXE_DIR / '.env', override=True)

os.chdir(str(_EXE_DIR))

DBF_DIR_FILE = _EXE_DIR / ".dbf_dir"

# Referencia global a janela — populada em main()
_window: webview.Window = None
# Cliente Supabase ativo — setado em _run_sync para persistir logs na nuvem
_log_client = None
# Fila de logs para inserção em lote no Supabase
_log_queue: queue.Queue = queue.Queue()


# ── Helpers para comunicar com o frontend ────────────────────────────────────

def _push_log(level: str, msg: str):
    """Envia linha de log ao frontend JS e enfileira para persistência em lote."""
    if _window:
        payload = json.dumps({"level": level, "msg": msg})
        _window.evaluate_js(f"window.appendLog({payload})")
    if _log_client:
        _log_queue.put({"level": level, "message": msg})


def _log_batch_worker():
    """Drena _log_queue e insere lotes de até 50 entradas no Supabase a cada 1 s."""
    batch: list = []
    deadline = time.time() + 1.0
    while True:
        remaining = max(0.05, deadline - time.time())
        try:
            item = _log_queue.get(timeout=remaining)
            if item is None:            # sentinel: encerra
                break
            batch.append(item)
        except queue.Empty:
            pass

        flush = time.time() >= deadline or len(batch) >= 50
        if flush and batch:
            client = _log_client
            if client:
                try:
                    client.table("se_link_logs").insert(batch).execute()
                except Exception:
                    pass
            batch.clear()
            deadline = time.time() + 1.0

    # flush final ao encerrar
    if batch:
        client = _log_client
        if client:
            try:
                client.table("se_link_logs").insert(batch).execute()
            except Exception:
                pass


def _push_sync_time(ts: str):
    """Envia o timestamp de ultima sync ao frontend."""
    if _window:
        payload = json.dumps(ts)
        _window.evaluate_js(f"window.setSyncTime({payload})")


def _push_state(state: str):
    """Envia estado visual ao frontend: syncing | synced | monitoring | stopped | error."""
    if _window:
        payload = json.dumps(state)
        _window.evaluate_js(f"window.setState({payload})")


def _push_status(text: str, running: bool):
    """Atualiza barra de status no frontend."""
    if _window:
        payload = json.dumps({"text": text, "running": running})
        _window.evaluate_js(f"window.setStatus({payload})")


class _FrontendLogHandler(logging.Handler):
    def emit(self, record):
        _push_log(record.levelname, self.format(record))


# ── API exposta ao JavaScript via pywebview.api ──────────────────────────────

class Api:
    def __init__(self):
        self._stop_event  = threading.Event()
        self._running     = False
        self._sync_thread = None

        saved   = DBF_DIR_FILE.read_text().strip() if DBF_DIR_FILE.exists() else ""
        default = str(Path(__file__).parent.parent / "DBF")
        self._dbf_dir = saved or default

    # -- chamado pelo JS ao carregar a pagina
    def get_dbf_dir(self) -> str:
        return self._dbf_dir

    # -- busca ultimo sync do Supabase
    def get_last_sync(self) -> str:
        try:
            load_dotenv(_EXE_DIR / '.env', override=True)
            import sync_supabase as ss
            from supabase import create_client
            if not ss.SUPABASE_KEY:
                return ""
            client = create_client(ss.SUPABASE_URL, ss.SUPABASE_KEY)
            res = client.table("sync_log").select("ultima_sync").eq("id", 1).single().execute()
            ts = res.data.get("ultima_sync", "") if res.data else ""
            if ts:
                from datetime import datetime, timezone
                d = datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone()
                return d.strftime("%d/%m/%Y %H:%M:%S")
        except Exception:
            pass
        return ""

    # -- abre dialogo de pasta nativo
    def escolher_pasta(self):
        result = _window.create_file_dialog(
            webview.FileDialog.FOLDER,
            directory=self._dbf_dir,
            allow_multiple=False,
        )
        if result and len(result) > 0:
            chosen = result[0]
            self._dbf_dir = chosen
            DBF_DIR_FILE.write_text(chosen)
            _push_log("INFO", f"Pasta DBF definida: {chosen}")
            return chosen
        return None

    # -- inicia sincronizacao
    def iniciar(self):
        if self._running:
            return
        self._stop_event.clear()
        self._running = True
        _push_state("syncing")
        _push_status("Sincronizando...", True)
        self._sync_thread = threading.Thread(target=self._run_sync, daemon=True)
        self._sync_thread.start()

    # -- para sincronizacao
    def parar(self):
        self._stop_event.set()
        self._running = False
        _push_state("stopped")
        _push_status("Sincronizador pausado.", False)
        _push_log("WARNING", "Sincronizador encerrado pelo usuario.")

    # -- loop principal de sync (roda em thread separada)
    def _run_sync(self):
        global _log_client
        try:
            load_dotenv(_EXE_DIR / '.env', override=True)

            import sync_supabase as ss
            from importlib import reload
            reload(ss)

            ss.BASE_DIR = Path(self._dbf_dir)

            from supabase import create_client
            from watchdog.observers import Observer

            if not ss.SUPABASE_KEY:
                _push_log("ERROR",
                    "CHAVE NAO CONFIGURADA — abra o arquivo .env e adicione SUPABASE_KEY.")
                self._running = False
                _push_status("Erro de configuracao.", False)
                return

            client = create_client(ss.SUPABASE_URL, ss.SUPABASE_KEY)
            _log_client = client
            _push_log("INFO", f"Conectado ao Supabase: {ss.SUPABASE_URL}")

            # Reporta DBFs disponíveis na pasta e lê mapa ativo do painel
            ss.report_available_dbfs(client, ss.BASE_DIR)
            active_map = ss.get_active_dbf_map(client)

            _push_state("syncing")
            _push_status("Sincronizando...", True)
            ss.sync_all(client, active_map)

            # atualiza timestamp na GUI
            try:
                res = client.table("sync_log").select("ultima_sync").eq("id", 1).single().execute()
                ts = res.data.get("ultima_sync", "") if res.data else ""
                if ts:
                    from datetime import datetime
                    d = datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone()
                    _push_sync_time(d.strftime("%d/%m/%Y %H:%M:%S"))
            except Exception:
                pass

            _push_state("synced")
            _push_status("Sincronizado!", True)
            time.sleep(2)

            # subclasse que notifica a GUI ao detectar alteracoes
            stop_ref = self._stop_event
            class _GUIDBFHandler(ss.DBFHandler):
                def on_modified(self, event):
                    is_dbf = (not event.is_directory
                              and event.src_path.lower().endswith(".dbf"))
                    if is_dbf:
                        _push_state("syncing")
                        _push_status("Sincronizando...", True)
                    try:
                        super().on_modified(event)
                    except Exception as exc:
                        _push_log("ERROR", f"Erro ao sincronizar: {exc}")
                        if is_dbf:
                            _push_state("error")
                            _push_status("Sem conexao — tentara novamente na proxima alteracao.", False)
                        return
                    if is_dbf:
                        _push_state("synced")
                        _push_status("Sincronizado!", True)
                        time.sleep(2)
                        if not stop_ref.is_set():
                            _push_state("monitoring")
                            _push_status("Monitorando...", True)

            handler  = _GUIDBFHandler(client)
            observer = Observer()
            observer.schedule(handler, str(ss.BASE_DIR), recursive=False)
            observer.start()

            _push_state("monitoring")
            _push_status("Monitorando...", True)
            _push_log("INFO", f"Monitorando {ss.BASE_DIR} — aguardando alteracoes...")

            # Realtime: escuta force_sync via WebSocket (sem polling)
            import asyncio
            from realtime import AsyncRealtimeClient

            client_ref = client

            async def _realtime_loop():
                from datetime import datetime, timezone as tz
                # A lib monta `<url>/websocket`, por isso passamos já com /realtime/v1
                _rt_url = ss.SUPABASE_URL.rstrip("/") + "/realtime/v1"
                rt = AsyncRealtimeClient(_rt_url, ss.SUPABASE_KEY, auto_reconnect=True)

                async def _heartbeat():
                    while not stop_ref.is_set():
                        try:
                            ts = datetime.now(tz.utc).isoformat()
                            client_ref.table("sync_log").update({"last_heartbeat": ts}).eq("id", 1).execute()
                        except Exception:
                            pass
                        await asyncio.sleep(30)

                heartbeat_task = asyncio.create_task(_heartbeat())

                def _do_remote_sync():
                    """Executa sync remoto em thread separada — nao bloqueia o loop asyncio."""
                    _push_log("INFO", "Sync remoto solicitado pelo painel — iniciando...")
                    _push_state("syncing")
                    _push_status("Sincronizando (remoto)...", True)
                    try:
                        # Reseta a flag antes de sincronizar (evita disparo duplo)
                        client_ref.table("sync_log").update({"force_sync": False}).eq("id", 1).execute()
                        current_map = ss.get_active_dbf_map(client_ref)
                        ss.sync_all(client_ref, current_map)
                        _push_log("INFO", "Sync remoto concluido.")
                    except Exception as exc:
                        _push_log("ERROR", f"Erro no sync remoto: {exc}")
                    finally:
                        if not stop_ref.is_set():
                            _push_state("monitoring")
                            _push_status("Monitorando...", True)

                def _on_force_sync(payload):
                    new = payload.get("new", {}) if isinstance(payload, dict) else {}
                    if not new.get("force_sync"):
                        return
                    # Despacha para thread separada para nao travar o loop asyncio
                    threading.Thread(target=_do_remote_sync, daemon=True).start()

                channel = rt.channel("force_sync_watch")
                channel.on_postgres_changes(
                    event="UPDATE",
                    schema="public",
                    table="sync_log",
                    filter="id=eq.1",
                    callback=_on_force_sync,
                )
                await channel.subscribe()
                _push_log("INFO", "Realtime ativo — aguardando comando do painel...")

                while not stop_ref.is_set():
                    await asyncio.sleep(0.5)

                heartbeat_task.cancel()
                try:
                    await heartbeat_task
                except asyncio.CancelledError:
                    pass
                await channel.unsubscribe()

            def _run_realtime():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    loop.run_until_complete(_realtime_loop())
                except Exception as exc:
                    _push_log("WARNING", f"Realtime encerrado: {exc}")
                finally:
                    loop.close()

            rt_thread = threading.Thread(target=_run_realtime, daemon=True)
            rt_thread.start()

            # Aguarda parada (watchdog continua rodando em paralelo)
            stop_ref.wait()

            observer.stop()
            observer.join(timeout=5)
            rt_thread.join(timeout=5)

        except Exception as exc:
            _push_log("ERROR", f"ERRO: {exc}")
            self._running = False
            _push_state("error")
            _push_status(f"Erro: {exc}", False)
        finally:
            _log_client = None


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    global _window

    # Redireciona logging global para o frontend
    handler = _FrontendLogHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s  %(message)s", "%H:%M:%S"))
    logging.getLogger().addHandler(handler)
    logging.getLogger().setLevel(logging.INFO)

    # Suprime logs HTTP internos (httpx / httpcore) — só WARNING ou acima
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    # Inicia worker de inserção em lote de logs no Supabase
    threading.Thread(target=_log_batch_worker, daemon=True, name="log-batch").start()

    api      = Api()
    html_uri = (Path(__file__).parent / "gui" / "index.html").as_uri()

    _window = webview.create_window(
        title            = "Simple&Eco Link",
        url              = html_uri,
        js_api           = api,
        width            = 780,
        height           = 640,
        min_size         = (680, 520),
        background_color = "#0e0e0e",
        easy_drag        = False,
    )

    # No Windows Server 2016 o WebView2 pode não estar disponível.
    # Tenta EdgeChromium primeiro; se falhar, cai no mshtml (IE/Trident).
    try:
        webview.start(debug=False)
    except Exception:
        webview.start(debug=False, gui='mshtml')


if __name__ == "__main__":
    main()
