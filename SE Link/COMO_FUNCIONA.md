# Como Funciona — Simple&Eco Link

Guia técnico da arquitetura e do fluxo de dados.

---

## Visão geral

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

### `sync_supabase.py` — Engine de sincronização
- Lê cada arquivo `.dbf` usando a biblioteca **dbfread** (encoding latin-1)
- Sincroniza **em paralelo** (3 workers simultâneos via `ThreadPoolExecutor`)
- Cada worker cria seu próprio cliente HTTP para evitar conflitos de socket
- Tabelas com chave primária: usa **UPSERT** (sem apagar, apenas insere/atualiza)
- Tabelas sem PK (`peditens`, `talsetor`): DELETE total + INSERT em lotes de 1000
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
watchdog inicia monitoramento da pasta DBF
        │
        ▼
Qualquer .dbf modificado → sincroniza só aquela tabela
```

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
2. Instala/atualiza dependências (`pyinstaller`, `dbfread`, `supabase`, `watchdog`, `pywebview`, `python-dotenv`)
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
| `watchdog`     | Monitoramento de eventos do sistema de arquivos |
| `python-dotenv`| Leitura do arquivo .env                     |
| `pyinstaller`  | Empacotamento em .exe standalone            |
