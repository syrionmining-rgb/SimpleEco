# Simple&Eco Link

Aplicativo desktop que sincroniza automaticamente os arquivos **DBF** do sistema Simple&Eco com o banco de dados na nuvem (**Supabase**), alimentando o dashboard web em tempo real.

---

## Início rápido — usar o executável

> Não precisa de Python instalado.

1. Abra a pasta `App\`
2. Confirme que o arquivo `.env` está presente (já vem configurado)
3. Execute `SimpleEcoLink.exe`
4. Clique **Iniciar** e aponte para a pasta que contém os arquivos `.dbf`
5. O app sincroniza tudo e passa a monitorar — qualquer alteração nos DBFs é enviada automaticamente para a nuvem

**Requisitos do PC:**
- Windows 10 ou superior (64-bit)
- Microsoft Edge / WebView2 Runtime instalado → [baixar aqui](https://developer.microsoft.com/microsoft-edge/webview2/)
- Acesso à internet

---

## Estrutura da pasta

```
SE Link/
├── App/                    ← Distribuível — copie esta pasta para o PC de destino
│   ├── SimpleEcoLink.exe
│   ├── .env                ← Credenciais do Supabase (não compartilhar)
│   └── LEIA-ME.txt
│
├── gui/                    ← Interface HTML do aplicativo (fonte)
│   └── index.html
│
├── link.py                 ← Ponto de entrada do app (PyWebView)
├── link.spec               ← Configuração do PyInstaller
├── sync_supabase.py        ← Engine de sincronização DBF → Supabase
├── CONSTRUIR_EXE.bat       ← Recompila o SimpleEcoLink.exe
├── LINK.bat                ← Roda o app direto via Python (sem compilar)
└── SELink.md               ← Este arquivo
```

---

## Recompilar o executável

Necessário após qualquer alteração no código-fonte:

```
Clique duas vezes em CONSTRUIR_EXE.bat
```

O arquivo `App\SimpleEcoLink.exe` será gerado automaticamente (~2–5 min).

---

## Tabelas sincronizadas

| Arquivo DBF   | Tabela Supabase | Chave primária | Registros aprox. |
|---------------|-----------------|----------------|------------------|
| clientes.dbf  | clientes        | CODIGO         | ~2.000           |
| pedidos.dbf   | pedidos         | CODIGO         | ~7.800           |
| fichas.dbf    | fichas          | CODIGO         | ~3.100           |
| taloes.dbf    | taloes          | CODIGO         | ~95.000          |
| setores.dbf   | setores         | CODIGO         | 44               |
| peditens.dbf  | peditens        | composta       | ~18.800          |
| talsetor.dbf  | talsetor        | composta       | ~202.000         |
| pedimate.dbf  | pedimate        | composta       | ~45.000          |
| material.dbf  | material        | CODIGO         | ~1.900           |
| grades.dbf    | grades          | CODIGO         | 154              |
| talaoaux.dbf  | talaoaux        | CODIGO         | 15               |

---

## Visão geral da arquitetura

```
┌─────────────────────┐        ┌──────────────────────┐        ┌───────────────────┐
│  Sistema Simple&Eco │  gera  │   Arquivos .dbf       │  lê   │  SimpleEcoLink    │
│  (ERP local)        │───────▶│  (clientes, pedidos…) │──────▶│  (este app)       │
└─────────────────────┘        └──────────────────────┘        └────────┬──────────┘
                                                                         │ HTTP/REST
                                                                         ▼
                                                               ┌──────────────────────┐
                                                               │  Supabase (nuvem)    │
                                                               │  PostgreSQL          │
                                                               └──────────┬───────────┘
                                                                          │
                                         WebSocket (Realtime) ◀──────────┤
                                                                          │
                                                                          ▼
                                                               ┌──────────────────────┐
                                                               │  Dashboard Web       │
                                                               │  Simple&Eco Produção │
                                                               └──────────────────────┘
```

---

## Componentes

### `link.py` — Interface do aplicativo
- Cria a janela desktop usando **PyWebView** (renderiza HTML real via Microsoft Edge)
- Expõe uma API Python ao JavaScript da interface (`class Api`)
- Gerencia o ciclo de vida do sync em thread separada
- Envia atualizações de estado e log ao frontend via `window.evaluate_js()`
- Mantém uma thread asyncio dedicada ao cliente **Realtime** (escuta comandos do painel web)

### `sync_supabase.py` — Engine de sincronização
- Lê cada arquivo `.dbf` usando a biblioteca **dbfread** (encoding latin-1)
- Sincroniza **em paralelo** (3 workers simultâneos via `ThreadPoolExecutor`)
- Cada worker cria seu próprio cliente HTTP para evitar conflitos de socket
- Tabelas com chave primária simples: usa **UPSERT** (sem apagar, apenas insere/atualiza)
- Tabelas sem PK (`peditens`, `talsetor`, `pedimate`): DELETE total + INSERT em lotes de 1000
- Monitora alterações nos DBFs em tempo real usando **watchdog** (filesystem events)
- Debounce de 2 segundos para evitar sincronizações duplicadas em rafaga

### `gui/index.html` — Interface visual
- HTML/CSS puro, sem frameworks
- Comunica com Python via `window.pywebview.api.*`
- Estados visuais: `syncing` → `synced` → `monitoring` → `stopped` / `error`
- Exibe log em tempo real com scroll automático

---

## Fluxo de sincronização

```
Usuário clica Iniciar
        │
        ▼
App lê .env → conecta ao Supabase
        │
        ▼
sync_all() → 3 threads paralelas leem os DBFs
        │
        ├── tabela com PK  →  UPSERT (lotes de 1000)
        └── tabela sem PK  →  DELETE + INSERT (com retry x3)
        │
        ▼
sync_log atualizado (timestamp da última sync)
        │
        ▼
watchdog inicia monitoramento da pasta DBF          Realtime WebSocket conecta ao Supabase
        │                                                       │
        ▼                                                       ▼
Qualquer .dbf modificado                         Painel web envia "force_sync"
        → sincroniza só aquela tabela                  → sync_all() disparado remotamente
```

---

## Sincronização Remota (Realtime)

O painel web pode solicitar uma sincronização forçada a qualquer momento. O mecanismo usa **Supabase Realtime** (WebSocket), sem polling:

1. O painel atualiza o campo `force_sync = true` na tabela `sync_log`
2. O SE Link escuta essa mudança via WebSocket (`AsyncRealtimeClient`)
3. Ao receber o evento `UPDATE`, reseta `force_sync = false` e executa `sync_all()`
4. O estado é comunicado ao frontend da janela desktop em tempo real

A escuta Realtime roda em loop `asyncio` dentro de uma thread daemon separada, em paralelo com o watchdog.

---

## Arquivo `.env`

Localizado em `App\.env`. Contém apenas:

```
SUPABASE_URL=https://whwwcgyqpaspzymhdwox.supabase.co
SUPABASE_KEY=<service_role_key>
```

A `service_role_key` tem permissão total de leitura e escrita — **não compartilhar publicamente**.

---

## Recompilar após mudanças

O arquivo `CONSTRUIR_EXE.bat` automatiza todo o processo:

1. Detecta o Python do `venv\` local ou do sistema
2. Instala/atualiza dependências (`pyinstaller`, `dbfread`, `supabase`, `watchdog`, `pywebview`, `python-dotenv`, `realtime`)
3. Limpa o build anterior
4. Compila com **PyInstaller** em modo one-file, sem console, usando o `link.spec`
5. Copia o `.env` para `App\` automaticamente

> O build temporário é gerado em `%TEMP%\se_build` para evitar problemas com o `&` no nome da pasta do projeto.

---

## Dependências principais

| Pacote         | Função                                      |
|----------------|---------------------------------------------|
| `pywebview`    | Janela desktop com renderização HTML/Edge   |
| `dbfread`      | Leitura dos arquivos .dbf (latin-1)         |
| `supabase`     | Client REST para o Supabase                 |
| `realtime`     | Client WebSocket para Supabase Realtime     |
| `watchdog`     | Monitoramento de eventos do sistema de arquivos |
| `python-dotenv`| Leitura do arquivo .env                     |
| `pyinstaller`  | Empacotamento em .exe standalone            |
