# Simple&Eco Link — v2.0

## O que há de novo

---

### Monitoramento de status em tempo real

O painel administrativo agora exibe se o SE Link está **Online** ou **Offline**.

Enquanto o app estiver rodando, ele envia um sinal ao servidor a cada 30 segundos. O painel detecta automaticamente se o sinal parou — sem precisar recarregar a página.

---

### Console do SE Link no painel

Tudo que aparece no log do app agora também fica salvo na nuvem e visível diretamente no painel administrativo, na seção **Banco de Dados → Console do SE Link**.

- Mensagens coloridas por nível (INFO, WARNING, ERROR)
- Atualizações em tempo real — sem precisar recarregar
- Botão para limpar o histórico de logs

---

### Sincronização forçada instantânea

O botão **Forçar Sincronização** no painel agora usa conexão WebSocket direta com o SE Link — a solicitação chega instantaneamente, sem esperar até 15 segundos como antes.

---

### Seleção de tabelas pelo painel

É possível escolher quais arquivos DBF o SE Link deve sincronizar diretamente pelo painel administrativo, sem precisar alterar nenhum arquivo no servidor.

- Cada tabela pode ser ativada ou desativada individualmente com um toggle
- O painel mostra quais arquivos foram **encontrados** na pasta local do servidor
- As alterações têm efeito na próxima sincronização

---

### 4 novas tabelas sincronizadas

Foram adicionadas 4 novas tabelas ao processo de sincronização:

| Arquivo DBF   | Dados sincronizados         |
|---------------|-----------------------------|
| `pedimate.dbf`| Materiais por pedido/item   |
| `material.dbf`| Cadastro de materiais       |
| `grades.dbf`  | Grades de numeração         |
| `talaoaux.dbf`| Sub-grupos de talão         |

O total passou de 7 para **11 tabelas** sincronizadas.

---

### Correções técnicas

- Sincronização forçada pelo painel não trava mais o monitoramento de arquivos enquanto está em andamento
- O app não fica mais preso indefinidamente ao encerrar em situações de erro
- Recursos de rede são liberados corretamente ao clicar em Parar

---

## Como usar

1. Copie esta pasta para o PC do servidor
2. Confirme que o arquivo `.env` está presente
3. Execute `SimpleEcoLink.exe`
4. Clique **Iniciar** e aponte para a pasta com os arquivos `.dbf`

**Requisitos:** Windows 10 ou superior (64-bit) · Microsoft Edge / WebView2 Runtime · Acesso à internet
