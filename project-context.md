# SimpleEco — Project Context

## Visão Geral

**SimpleEco Production Dashboard** é uma SPA (Single Page Application) React para gestão de produção e pedidos de uma empresa industrial. Exibe métricas de produção em tempo real, pedidos atrasados, produção do dia e metas semanais/mensais, com filtragem por setor. Possui painel administrativo completo para gestão de pedidos, talões, clientes, fluxo de produção e sincronização DBF.

**Versão atual: 2.0**

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Framework | React 18.3.1 + TypeScript |
| Build | Vite 5.3.4 |
| Estilização | Tailwind CSS 3.4.7 + CSS Variables |
| Roteamento | React Router DOM 7.13.1 |
| Ícones | Lucide React 0.400.0 |
| Backend/DB | Supabase (PostgreSQL) |
| Deploy | Vercel |

---

## Estrutura de Diretórios

```
src/
├── components/
│   ├── Header.tsx              # Navbar: logo, data/hora, tema, admin, logout, versão
│   ├── MetricCard.tsx          # Cards de KPI (atrasados, em produção, eficiência)
│   ├── ProductionCard.tsx      # Meta diária de produção com barra de progresso
│   ├── GoalCard.tsx            # Cards de meta semanal e mensal
│   ├── DelayedOrdersTable.tsx  # Tabela de pedidos atrasados
│   ├── ScheduledOrdersTable.tsx# Tabela de produção do dia
│   ├── WeeklyChart.tsx         # Gráfico semanal produção vs meta
│   └── ProtectedRoute.tsx      # HOC de autenticação
├── context/
│   └── AuthContext.tsx         # Autenticação com token via Supabase RPC
├── services/
│   └── api.ts                  # Camada de dados: busca e transforma ~7 tabelas Supabase
├── lib/
│   └── supabase.ts             # Inicialização do cliente Supabase
├── pages/
│   ├── LoginPage.tsx           # Formulário de login
│   └── AdminPanel.tsx          # Painel administrativo completo
├── types/
│   └── index.ts                # Interfaces TypeScript
├── App.tsx                     # Layout principal do dashboard
├── main.tsx                    # Entry point: roteamento + AuthContext
└── index.css                   # Variáveis de tema (light/dark)
```

---

## Banco de Dados (Supabase / PostgreSQL)

### Tabelas DBF (espelho sincronizado via SE Link)

| Tabela | Conteúdo |
|--------|---------|
| `taloes` | Lotes de produção: CODIGO, PEDIDO, ITEM, REFERENCIA, REMESSA, NUMEROS, CANCELADO, FATURADO, TOTAL |
| `talsetor` | Histórico de setores por talão: TALAO, SETOR, NOMESET, DATA, REMESSA, QTDE |
| `pedidos` | Pedidos: CODIGO, CLIENTE, PREVISAO (entrega), SALDO, PEDCLIENTE (O.C.) |
| `clientes` | Cadastro: CODIGO, FANTASIA, NOME |
| `peditens` | Itens de pedido (opcional): CODIGO, ITEM, REFERENCIA → liga talão à ficha |
| `fichas` | Ficha do produto: CODIGO, NOME, REFER, MATRIZ, NAVALHA, NOMECOR, OBS |
| `setores` | Setores de produção: CODIGO, NOME |
| `sync_log` | Controle de sincronização: id, ultima_sync |

### Tabelas Nativas (criadas no Supabase)

| Tabela | Conteúdo |
|--------|---------|
| `usuarios` | Usuários do sistema: username, nome, senha_hash |
| `login_sessions` | Sessões de acesso com device/IP/browser |
| `prod_items` | Itens de fluxo de produção: id, nome, descricao, ativo |
| `prod_etapas` | Etapas de cada fluxo: id, item_id, nome, ordem |
| `pedido_fluxo` | Vínculo pedido ↔ fluxo de produção: id, pedido_codigo, item_id |

### Cadeia de Resolução de Dados do Talão

```
TALOES.CODIGO
  ├─ TALOES.PEDIDO → PEDIDOS.CODIGO
  │    ├─ PEDIDOS.PEDCLIENTE = "O.C." (ordem do cliente)
  │    └─ PEDIDOS.CLIENTE → CLIENTES
  ├─ TALOES.REMESSA (código da remessa)
  ├─ TALOES.REFERENCIA → FICHAS.CODIGO (direto, quando preenchido)
  │    OU
  │    TALOES.PEDIDO + TALOES.ITEM → PEDITENS.REFERENCIA → FICHAS.CODIGO
  │         └─ FICHAS: MATRIZ, NAVALHA, NOMECOR, OBS
  └─ TALSETOR (histórico de setores passados)
       └─ NOMESET contém "expedi" → talão finalizado
```

### RPC Functions (PostgreSQL)

```sql
criar_sessao_login(p_username, p_password)  → token
validar_sessao_login(p_token)               → session info
revogar_sessao_login(p_token)               → logout
registrar_device_sessao(p_token, p_ip, ...) → log de dispositivo
```

---

## Painel Administrativo (`src/pages/AdminPanel.tsx`)

### Módulos

| Módulo | ID | Funcionalidade |
|--------|----|----------------|
| Dashboard | `dashboard` | Atividades recentes, resumo do sistema |
| Pedidos | `orders` | Lista pedidos/remessas, detalhe com talões, grade, histórico, fluxo de produção |
| Fluxo de Produção | `sectors` | CRUD de itens e etapas do fluxo de produção |
| Produtos | `products` | Listagem de fichas/produtos |
| Clientes | `clients` | Cadastro de clientes |
| Banco de Dados | `database` | Sincronização DBF, status, force sync |
| Configurações | `settings` | Configurações gerais |
| Logs | `logs` | Histórico de acessos por dispositivo |

### Funcionalidades do Módulo de Pedidos

- **Lista esquerda (380px)**: pedidos ou remessas, busca, badge de status (Finalizado/Saldo) no canto inferior direito, O.C. visível
- **Detalhe direito**: cabeçalho com cliente, status, O.C., previsão de entrega, produtos distintos
- **Fluxo de Produção**: selector de fluxo → pipeline visual de etapas com detecção automática de conclusão via `talsetor`
- **Grade do Pedido**: soma agregada de todos os talões por numeração
- **Filtro de talões**: busca por código/referência/produto + filtro por status
- **Card do talão**:
  - Badge "Talão XXXXXXXX" com barra lateral colorida por status
  - Meta strip: Item, Ref, Remessa, O.C.
  - Linha de ficha: Matriz, Navalha, Cor (via PEDITENS → FICHAS quando disponível)
  - OBS da ficha
  - Materiais (M1/M2/M3) — mock atualmente, aguardando tabela `fichmat` no Supabase
  - Grade de numeração
  - Histórico de setores (talsetor)
- **Status do talão**: Cancelado (vermelho) / Finalizado (verde, inclui passagem por expedição) / Em produção (laranja)

### Lógica de Status

```typescript
// Talão finalizado se:
const passouExpedicao = talsetorByTalao.get(tc).some(mv =>
  /expedi/i.test(mv.NOMESET + mv.SETOR)
)
const finalizado = !canc && (fat || passouExpedicao)
```

---

## Lógica de Negócio Principal (`src/services/api.ts`)

- **Pedido Atrasado**: `talsetor.DATA` < hoje + `pedidos.SALDO` > 0
- **Produção do Dia**: `talsetor.DATA` = hoje
- **Status**: setor "FATURAMENTO" → Finalizado; "EXPEDI" → Em produção
- **Prioridade**: setor "001" ou campo `PRIORIDADE`
- **Datas**: parseia múltiplos formatos (YYYY-MM-DD, DD/MM/YYYY, YYYYMMDD)
- **Paginação**: 1000 linhas por requisição (limite Supabase)
- **Cache**: 5 minutos via sessionStorage + fallback em memória

---

## Autenticação

1. Login em `/login` → `criar_sessao_login` RPC → token
2. Token salvo em `localStorage` ("lembrar") ou `sessionStorage`
3. Na carga da app: `validar_sessao_login` valida o token
4. Rotas protegidas via `ProtectedRoute` redirecionam para `/login`
5. Logout: `revogar_sessao_login` + limpeza do storage

**Storage keys:**
- `se_auth_token` — token de sessão
- `se_user` — usuário atual
- `se_auth_storage` — tipo de storage (local/session)
- `se_theme` — preferência de tema

---

## Sistema de Tema

CSS Variables em `src/index.css`, alternadas via classe `.dark` no `<html>`:

| Token | Light | Dark |
|-------|-------|------|
| `--th-page` | `#f3f4f6` | `#0e0e0e` |
| `--th-card` | `#ffffff` | `#111111` |
| `--th-subtle` | `#f9fafb` | `rgba(255,255,255,0.03)` |
| `--th-txt-1` | `#111827` | `#ffffff` |
| `--th-border` | `#e5e7eb` | `rgba(255,255,255,0.10)` |

**Cores de acento:** `#FF8C00` (laranja), `#D81B60` (rosa/magenta)

---

## Pendências / Próximos Passos

| Item | Status |
|------|--------|
| Tabela `peditens` populada no Supabase | ⏳ Aguardando sync |
| Tabela `fichmat` (M1/M2/M3 materiais) | ⏳ Aguardando criação + sync |
| Materiais do talão (M1/M2/M3) | 🔶 Mock atualmente |
| Script sync DBF → `peditens` e `fichmat` | ⏳ Pendente |

---

## Scripts Utilitários (`scripts/`)

| Script | Função |
|--------|--------|
| `migrate_pedido_fluxo.py` | Cria tabela `pedido_fluxo` no Supabase |
| `probe.py` / `probe2.py` | Leitura e join de arquivos DBF |
| `analyze_pedidos.py` | Análise de pedidos no banco |
| `db_dump/` | Dumps CSV/JSON das tabelas Supabase |

---

## Responsive / PWA

- Mobile-first com breakpoints: `sm` (640px), `md` (768px), `lg` (1024px)
- PWA: `manifest.json` configurado, ícones para iOS e Android
- Tema aplicado via script inline antes da hidratação React (evita flash)

---

## Deploy

- **Plataforma**: Vercel
- **Build output**: `dist/`
- **SPA routing**: `/* → /index.html` (configurado em `vercel.json`)

---

## Arquivos de Referência Rápida

| Propósito | Arquivo |
|-----------|---------|
| Layout principal | [src/App.tsx](src/App.tsx) |
| Entry point | [src/main.tsx](src/main.tsx) |
| Painel admin | [src/pages/AdminPanel.tsx](src/pages/AdminPanel.tsx) |
| Header | [src/components/Header.tsx](src/components/Header.tsx) |
| Camada de dados | [src/services/api.ts](src/services/api.ts) |
| Cliente Supabase | [src/lib/supabase.ts](src/lib/supabase.ts) |
| Autenticação | [src/context/AuthContext.tsx](src/context/AuthContext.tsx) |
| Estilos globais | [src/index.css](src/index.css) |
| Schema completo | [schema.sql](schema.sql) |
