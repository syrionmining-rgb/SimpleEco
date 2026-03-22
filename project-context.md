# SimpleEco — Project Context

## Visão Geral

**SimpleEco Production Dashboard** é uma SPA (Single Page Application) React para gestão de produção e pedidos de uma empresa industrial. Exibe métricas de produção em tempo real, pedidos atrasados, produção do dia e metas semanais/mensais, com filtragem por setor.

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
│   ├── Header.tsx              # Navbar: logo, data/hora, tema, admin, logout
│   ├── MetricCard.tsx          # Cards de KPI (atrasados, em produção, eficiência)
│   ├── ProductionCard.tsx      # Meta diária de produção com barra de progresso
│   ├── GoalCard.tsx            # Cards de meta semanal e mensal
│   ├── DelayedOrdersTable.tsx  # Tabela de pedidos atrasados
│   ├── ScheduledOrdersTable.tsx# Tabela de produção do dia
│   ├── WeeklyChart.tsx         # Gráfico semanal produção vs meta
│   ├── MonthlyChart.tsx        # Gráfico mensal
│   ├── SectorSelector.tsx      # Dropdown para filtrar por setor
│   ├── ControlsCard.tsx        # Controles adicionais
│   ├── MobileNavbar.tsx        # Navegação mobile
│   └── ProtectedRoute.tsx      # HOC de autenticação
├── context/
│   └── AuthContext.tsx         # Autenticação com token via Supabase RPC
├── services/
│   └── api.ts                  # Camada de dados: busca e transforma ~7 tabelas Supabase
├── lib/
│   └── supabase.ts             # Inicialização do cliente Supabase
├── pages/
│   ├── LoginPage.tsx           # Formulário de login
│   └── AdminPanel.tsx          # Painel admin (implementação parcial)
├── types/
│   └── index.ts                # Interfaces TypeScript
├── App.tsx                     # Layout principal do dashboard
├── main.tsx                    # Entry point: roteamento + AuthContext
└── index.css                   # Variáveis de tema (light/dark)
```

---

## Banco de Dados (Supabase / PostgreSQL)

### Tabelas

| Tabela | Conteúdo |
|--------|---------|
| `taloes` | Lotes de produção (talões): CODIGO, PEDIDO, ITEM, CANCELADO, FATURADO |
| `talsetor` | Alocação de talões por setor: TALAO, SETOR, NOMESET, DATA, REMESSA, QTDE |
| `pedidos` | Pedidos de clientes: CODIGO, CLIENTE, PREVISAO, SALDO, PRIORIDADE |
| `clientes` | Cadastro de clientes: CODIGO, FANTASIA, NOME |
| `peditens` | Itens de pedido: CODIGO, ITEM, REFERENCIA |
| `fichas` | Ficha do produto (cor/modelo): CODIGO, NOME |
| `setores` | Setores de produção: CODIGO, NOME |
| `sync_log` | Controle de sincronização: id, ultima_sync |

### RPC Functions (PostgreSQL)

```sql
criar_sessao_login(p_username, p_password)  → token
validar_sessao_login(p_token)               → session info
revogar_sessao_login(p_token)               → logout
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
- **Deduplicação**: previne requisições duplicadas em paralelo

---

## Tipos TypeScript (`src/types/index.ts`)

```typescript
DelayedOrder    // pedido atrasado com dias de atraso, setor, prioridade
TodayOrder      // produção do dia com status e flag isTodayProgrammed
Sector          // { cod, nome }
DayData         // { day, produced, goal, pct }
MonthDayData    // { day, scheduled, done, pct, future }
Metrics         // { delayed_count, in_production_count, efficiency }
DashboardData   // agregado completo do dashboard
```

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
- `se_dashboard_v10` — cache do dashboard

---

## Variáveis de Ambiente

| Variável | Uso |
|----------|-----|
| `VITE_SUPABASE_URL` | URL do projeto Supabase (frontend) |
| `VITE_SUPABASE_ANON` | Chave anon pública (frontend) |
| `VITE_USE_MOCK` | Ativa dados mock para desenvolvimento |
| `SUPABASE_URL` / `SUPABASE_KEY` | Backend only (não usados no setup atual) |

---

## Sistema de Tema

CSS Variables em `src/index.css`, alternadas via classe `.dark` no `<html>`:

| Token | Light | Dark |
|-------|-------|------|
| `--th-page` | `#f3f4f6` | `#0e0e0e` |
| `--th-card` | `#ffffff` | `#111111` |
| `--th-txt-1` | `#111827` | `#ffffff` |
| `--th-border` | `#e5e7eb` | `rgba(255,255,255,0.10)` |

**Cores de acento:** `#FF8C00` (laranja), `#D81B60` (rosa/magenta)

---

## Responsive / PWA

- Mobile-first com breakpoints: `sm` (640px/landscape), `md` (768px), `lg` (1024px), `xl` (1280px), `2xl` (1536px)
- PWA: `manifest.json` configurado, ícones para iOS e Android
- Tema aplicado via script inline antes da hidratação React (evita flash)

---

## Scripts Disponíveis

```bash
npm run dev      # Servidor de desenvolvimento (localhost:5173)
npm run build    # TypeScript check + build de produção
npm run preview  # Preview do build local
```

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
| Camada de dados | [src/services/api.ts](src/services/api.ts) |
| Cliente Supabase | [src/lib/supabase.ts](src/lib/supabase.ts) |
| Autenticação | [src/context/AuthContext.tsx](src/context/AuthContext.tsx) |
| Tipos | [src/types/index.ts](src/types/index.ts) |
| Estilos globais | [src/index.css](src/index.css) |
| Config Vite | [vite.config.ts](vite.config.ts) |
| Config Tailwind | [tailwind.config.js](tailwind.config.js) |
| Deploy | [vercel.json](vercel.json) |
