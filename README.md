# Simple&Eco — Estrutura do Banco de Dados (DBF)

> Todos os dados ficam na pasta `DBF/` como arquivos `.dbf` (formato dBASE/FoxPro).  
> Este documento foca na tela **2.6.1 · Movimentação de Talões nos SETORES de Produção** (print enviado pelo usuário), explicando de quais tabelas cada coluna é lida.

---

## Tela 2.6.1 — Movimentação de Talões nos Setores

A tela possui **três painéis**:

| Painel | Filtro aplicado |
|--------|----------------|
| TALÕES Programados no SETOR **em ATRASO** | `talsetor.DATA < DATA_DE_HOJE` e talão ainda em produção (`taloes.EXPEDICAO` vazio) |
| **ATRASO p/Data** (resumo central) | Agrupado por `talsetor.DATA`, somando `talsetor.QTDE` |
| TALÕES Programados no SETOR para **HOJE** | `talsetor.DATA = DATA_DE_HOJE` |

---

## Mapeamento de Colunas → Campos nos DBFs

### Colunas dos painéis Esquerdo e Direito

| Coluna na tela | Tabela / Campo | Descrição |
|---------------|---------------|-----------|
| **Dt Setor** | `talsetor.DATA` | Data em que o talão foi programado para entrar naquele setor |
| **Remes** | `talsetor.REMESSA` | Código da remessa (6 chars) |
| **Talão** | `talsetor.TALAO` | Número do talão (8 chars) |
| **Refer** | `peditens.REFERENCIA` | Referência do produto — obtida via `taloes.PEDIDO + taloes.ITEM → peditens` |
| **Cliente** | `clientes.NOME` (abreviado) | Nome do cliente — obtido via `pedidos.CLIENTE → clientes.CODIGO` |
| **Tam(\*)** | `grades.GRADE` / `taloes.NUMEROS` | Tamanho individual (ex: 33, 34, 35…) — o campo `NUMEROS` (81 chars) em `taloes` codifica a quantidade por posição de tamanho; cruza com `grades` para obter o número legível |
| **Qtde** | `talsetor.QTDE` | Quantidade de pares/peças programadas para o setor |

### Coluna do Painel Central (ATRASO p/Data)

| Coluna na tela | Tabela / Campo | Descrição |
|---------------|---------------|-----------|
| **Dt Setor** | `talsetor.DATA` | Data do atraso (agrupamento) |
| **Qtde** | `SUM(talsetor.QTDE)` | Total de peças em atraso naquela data |

---

## Tabelas Principais Envolvidas

### `talsetor.dbf` ⭐ Principal desta tela
Registra em qual setor e em qual data cada talão foi programado.

| Campo | Tipo | Tamanho | Descrição |
|-------|------|---------|-----------|
| REMESSA | C | 6 | Código da remessa |
| LOTE | C | 6 | Código do lote |
| SETOR | C | 3 | Código do setor → chave para `setores.CODIGO` |
| NOMESET | C | 25 | Nome do setor (desnormalizado) |
| TALAO | C | 8 | Número do talão → chave para `taloes.CODIGO` |
| DATA | D | 8 | **Data de programação no setor** (base dos filtros de atraso/hoje) |
| QTDE | N | 8 | **Quantidade programada** |

---

### `taloes.dbf`
Cada talão representa um lote de produção de um item de pedido.

| Campo | Tipo | Tamanho | Descrição |
|-------|------|---------|-----------|
| CODIGO | C | 8 | Número do talão (PK) |
| PEDIDO | C | 6 | Código do pedido → `pedidos.CODIGO` |
| ITEM | C | 3 | Item dentro do pedido → `peditens.ITEM` |
| REFERENCIA | C | 10 | Referência do produto |
| REMESSA | C | 6 | Código da remessa → `remessas.CODIGO` |
| LOTE | C | 6 | Código do lote |
| NUMEROS | C | 81 | Qtde por tamanho (81 posições codificadas) |
| TOTAL | N | 8 | Total de pares no talão |
| ULTSETOR | C | 3 | Último setor pelo qual passou |
| DTULTSETOR | D | 8 | Data do último setor |
| PRODUCAO | D | 8 | Data de entrada em produção |
| EXPEDICAO | D | 8 | Data de expedição (vazio = ainda em produção) |
| FATURADO | D | 8 | Data de faturamento |
| CANCELADO | L | 1 | Talão cancelado? |
| EMPROD | L | 1 | Em produção? |
| DE_ATE | C | 7 | Faixa de tamanhos (ex: "001-014") |

---

### `remessas.dbf`
Cabeçalho das remessas de produção.

| Campo | Tipo | Tamanho | Descrição |
|-------|------|---------|-----------|
| CODIGO | C | 6 | Código da remessa (PK) |
| NOME | C | 35 | Descrição da remessa |
| DATA | D | 8 | Data da remessa |
| SEMANA | C | 6 | Semana de produção |
| TOTAL | N | 10 | Total de pares |
| PRODUCAO | N | 10 | Total em produção |
| EXPEDICAO | N | 10 | Total expedido |
| FATURADO | N | 10 | Total faturado |
| REAL_INI | D | 8 | Data real de início |

---

### `setores.dbf`
Cadastro dos setores de produção.

| Campo | Tipo | Tamanho | Descrição |
|-------|------|---------|-----------|
| CODIGO | C | 3 | Código do setor (PK) |
| NOME | C | 25 | Nome do setor |
| ORDEM | N | 2 | Ordem de exibição no fluxo |
| ABREVIAT | C | 5 | Abreviatura |
| QTDE_DIA | N | 5 | Capacidade diária |
| HORAS | N | 5 | Horas disponíveis |
| IMPRIMIR | L | 1 | Imprime talão neste setor? |
| ATUSDASET | C | 3 | Setor para onde atualiza saída |

---

### `pedidos.dbf`
Pedidos de venda.

| Campo | Tipo | Tamanho | Descrição |
|-------|------|---------|-----------|
| CODIGO | C | 6 | Código do pedido (PK) |
| NOME | C | 35 | Nome/referência do pedido |
| CLIENTE | C | 6 | Código do cliente → `clientes.CODIGO` |
| VENDEDOR | C | 6 | Código do vendedor |
| REMESSA | D | 8 | Data prevista de remessa |
| PREVISAO | D | 8 | Data prevista de entrega |
| ATRASO1 | D | 8 | Primeira data de atraso |
| ATRASO2 | D | 8 | Segunda data de atraso |
| TOTAL | N | 9 | Total do pedido |
| STATUS | C | 30 | Status atual |

---

### `peditens.dbf`
Itens dos pedidos (produtos).

| Campo | Tipo | Tamanho | Descrição |
|-------|------|---------|-----------|
| CODIGO | C | 6 | Código do pedido (FK → `pedidos`) |
| ITEM | C | 3 | Número do item |
| REFERENCIA | C | 10 | **Referência do produto** ← coluna "Refer" na tela |
| GRADE | C | 2 | Grade de tamanhos |
| NUMEROS | C | 81 | Quantidades por tamanho |
| TOTAL | N | 8 | Total do item |
| REMESSA | C | 6 | Remessa vinculada |
| PREVISAO | D | 8 | Data prevista de entrega |
| ATRASO1 | D | 8 | Primeira data de atraso |

---

### `clientes.dbf`
Cadastro de clientes.

| Campo | Tipo | Tamanho | Descrição |
|-------|------|---------|-----------|
| CODIGO | C | 6 | Código do cliente (PK) |
| NOME | C | 35 | **Nome do cliente** ← coluna "Cliente" na tela |
| FANTASIA | C | 25 | Nome fantasia |
| CNPJ | C | 18 | CNPJ |
| CIDADE | C | 30 | Cidade |
| ESTADO | C | 2 | UF |

---

### `grades.dbf`
Grades de tamanhos (ex: 33–40, P/M/G, etc.).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| CODIGO | C | Código da grade (PK) |
| NOME | C | Nome da grade |
| GRADE | C (81) | Posições com os tamanhos codificados |
| NUMEROS | C (81) | Rótulos dos tamanhos (ex: "33 34 35 36...") |

> O campo `NUMEROS` em `taloes` e `peditens` segue o mesmo layout de 81 posições.  
> Para exibir "Tam(*)" na tela, o sistema lê posição a posição e exibe o rótulo correspondente em `grades.NUMEROS`.

---

### `prog_set.dbf`
Dias bloqueados por setor (calendário de produção).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| SETOR | C | Código do setor |
| DATA | D | Data do bloqueio |
| BLOQUEADO | L | Dia bloqueado para aquele setor? |

---

### `programa.dbf`
Programas de produção (agrupamento de remessas/semanas).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| CODIGO | C | Código do programa |
| DATA | D | Data do programa |
| TOTAL | N | Total de pares no programa |
| REMESSA | C | Remessa vinculada |

---

### `sequeset.dbf`
Sequência de setores por produto/referência.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| CODIGO | C | Código do produto/referência |
| SETOR | C | Código do setor |
| SEQ | C | Ordem na sequência de produção |
| TALAO | L | Emite talão neste setor? |

---

## Diagrama de Relacionamentos (Tela 2.6.1)

```
talsetor
├── TALAO    ──────────▶ taloes.CODIGO
│                           ├── PEDIDO ──▶ pedidos.CODIGO
│                           │                  └── CLIENTE ──▶ clientes.CODIGO
│                           └── PEDIDO+ITEM ──▶ peditens (CODIGO+ITEM)
│                                                   └── REFERENCIA
├── SETOR    ──────────▶ setores.CODIGO
├── REMESSA  ──────────▶ remessas.CODIGO
└── DATA     ← filtro: < hoje (atraso) | = hoje (hoje)
```

---

## Fluxo de Dados — Como a tela é montada

```
1. Ler talsetor WHERE DATA <= hoje AND talão não expedido
   ↓
2. Para cada registro de talsetor:
   a. Buscar taloes WHERE CODIGO = talsetor.TALAO
   b. Buscar pedidos WHERE CODIGO = taloes.PEDIDO
   c. Buscar clientes WHERE CODIGO = pedidos.CLIENTE
   d. Buscar peditens WHERE CODIGO = taloes.PEDIDO AND ITEM = taloes.ITEM
      → obtém REFERENCIA
   e. Decompor NUMEROS (81 chars) cruzando com grades
      → gera uma linha por tamanho com Tam(*) e Qtde
      
3. Separar em dois grupos:
   - DATA < DATE() → painel "EM ATRASO" (esquerdo)
   - DATA = DATE() → painel "HOJE" (direito)
   
4. Painel central: GROUP BY DATA, SUM(QTDE) dos registros em atraso
```

---

## Outros DBFs Relevantes no Sistema

| Arquivo | Descrição |
|---------|-----------|
| `talagrup.dbf` | Agrupamento de talões (TALAO + PEDIDO + ITEM) |
| `talaofat.dbf` | Faturamento dos talões (liga talão à nota fiscal) |
| `taladmin.dbf` | Administração de talões por setor/remessa |
| `talaoaux.dbf` | Tipos auxiliares de talão |
| `talpagto.dbf` | Pagamentos vinculados a talões |
| `semitala.dbf` | Semi-acabados por talão (percurso pelos setores) |
| `semitama.dbf` | Tamanhos/materiais dos semi-acabados |
| `semimovi.dbf` | Movimentações de semi-acabados |
| `fichas.dbf` | Ficha técnica do produto (referência) |
| `fichaped.dbf` | Fichas associadas a pedidos |
| `fichamat.dbf` | Materiais da ficha técnica |
| `tarefas.dbf` | Tarefas de produção por setor |
| `reqtaref.dbf` | Requisição de tarefas por referência |
| `material.dbf` | Cadastro de materiais/insumos |
| `peditens.dbf` | Itens de pedido (produto + grade + qtde) |
| `pedimate.dbf` | Materiais consumidos por item de pedido |
| `programa.dbf` | Programas de produção |
| `prog_set.dbf` | Calendário de bloqueios por setor |
| `sequeset.dbf` | Sequência de setores por produto |
| `sequenci.dbf` | Cadastro de sequências de produção |
