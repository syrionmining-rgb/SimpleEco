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

Veja [`COMO_FUNCIONA.md`](COMO_FUNCIONA.md) para detalhes técnicos.
