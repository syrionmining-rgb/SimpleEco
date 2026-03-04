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
└── README.md
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

| Arquivo DBF   | Tabela Supabase | Chave primária |
|---------------|-----------------|----------------|
| clientes.dbf  | clientes        | CODIGO         |
| pedidos.dbf   | pedidos         | CODIGO         |
| fichas.dbf    | fichas          | CODIGO         |
| taloes.dbf    | taloes          | CODIGO         |
| setores.dbf   | setores         | CODIGO         |
| peditens.dbf  | peditens        | composta       |
| talsetor.dbf  | talsetor        | composta       |

---

Veja [`COMO_FUNCIONA.md`](COMO_FUNCIONA.md) para detalhes técnicos.
