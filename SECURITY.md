# Security Checklist — G.Form Production Dashboard

Stack: React 18 + TypeScript · Supabase (PostgreSQL) · Vite · Vercel

---

## Autenticação & Sessão

- [ ] **SEC-01** — Tokens de sessão têm tempo de expiração definido na RPC `criar_sessao_login`
- [ ] **SEC-02** — `revogar_sessao_login` invalida o token no banco imediatamente (não apenas no client)
- [ ] **SEC-03** — Tokens não são expostos em URLs, logs ou `console.log` em produção
- [ ] **SEC-04** — `localStorage` vs `sessionStorage` é escolhido corretamente conforme "Manter conectado" — dados sensíveis não persistem sem consentimento
- [ ] **SEC-05** — Senhas nunca trafegam em texto puro — verificar se `criar_sessao_login` recebe hash ou compara via `crypt()` no PostgreSQL

## Autorização & Row Level Security

- [ ] **SEC-06** — RLS (Row Level Security) habilitado em todas as tabelas nativas (`usuarios`, `login_sessions`, `prod_items`, `prod_etapas`, `pedido_fluxo`)
- [ ] **SEC-07** — Tabelas DBF (`taloes`, `pedidos`, `clientes`, etc.) têm políticas RLS que impedem escrita não autorizada
- [ ] **SEC-08** — A chave `SUPABASE_ANON_KEY` não permite acesso direto a `usuarios.senha_hash` sem autenticação
- [ ] **SEC-09** — Rotas protegidas (`/admin`, `/`) verificam token no servidor via `validar_sessao_login` — não apenas no client (`ProtectedRoute`)
- [ ] **SEC-10** — Usuários comuns não conseguem chamar RPCs administrativas diretamente via Supabase client

## Variáveis de Ambiente & Secrets

- [ ] **SEC-11** — `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão no `.env` e o arquivo está no `.gitignore`
- [ ] **SEC-12** — Nenhuma service key (`supabase.service_role`) está exposta no código frontend
- [ ] **SEC-13** — Variáveis de ambiente estão configuradas no painel da Vercel (não hardcoded no build)

## Entrada de Dados & Injeção

- [ ] **SEC-14** — Todas as queries ao Supabase usam o client SDK (queries parametrizadas) — sem concatenação manual de SQL
- [ ] **SEC-15** — Campos de busca e filtros no AdminPanel sanitizam entrada antes de enviar ao Supabase
- [ ] **SEC-16** — Upload ou entrada de arquivos (se houver) valida tipo e tamanho no servidor

## Frontend & XSS

- [ ] **SEC-17** — Nenhum uso de `dangerouslySetInnerHTML` com dados externos não sanitizados
- [ ] **SEC-18** — Headers de segurança configurados na Vercel: `X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy`

## Infraestrutura & Deploy

- [ ] **SEC-19** — SE Link (sync DBF) roda em rede local isolada — porta WebSocket não exposta para internet
- [ ] **SEC-20** — Logs de acesso (`login_sessions`) são revisados periodicamente para detectar acessos suspeitos (IPs, dispositivos desconhecidos)

---

## Como usar

Marque cada item com `[x]` conforme for validado. Itens críticos: **SEC-01, SEC-06, SEC-08, SEC-11, SEC-12**.

> Última revisão: 2026-03-29
