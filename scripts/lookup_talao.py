import json, sys

codigo = sys.argv[1] if len(sys.argv) > 1 else '00005001'

with open('scripts/db_dump/taloes.json', encoding='utf-8') as f:
    taloes = json.load(f)

t = next((t for t in taloes if t['CODIGO'] == codigo), None)
if not t:
    print(f'Talao {codigo} nao encontrado')
    sys.exit(1)

print('=== TALAO ===')
for k, v in t.items():
    if v not in (None, '', False):
        print(f'  {k}: {v}')

pedido_cod = t['PEDIDO']

with open('scripts/db_dump/pedidos.json', encoding='utf-8') as f:
    pedidos = json.load(f)

p = next((p for p in pedidos if p.get('CODIGO') == pedido_cod), None)
if p:
    print(f'\n=== PEDIDO {pedido_cod} ===')
    for k, v in p.items():
        if v not in (None, '', False, 0):
            print(f'  {k}: {v}')

with open('scripts/db_dump/peditens.json', encoding='utf-8') as f:
    itens = json.load(f)

my_itens = [i for i in itens if i.get('CODIGO') == pedido_cod]
if my_itens:
    print(f'\n=== ITENS DO PEDIDO ({len(my_itens)}) ===')
    for it in my_itens:
        item = it.get('ITEM', '?')
        ref = it.get('REFERENCIA', '?')
        qtd = it.get('QUANTIDADE', '?')
        preco = it.get('PRECO', '?')
        print(f'  Item {item}: Ref={ref} Qtd={qtd} Preco={preco}')

my_taloes = [t2 for t2 in taloes if t2['PEDIDO'] == pedido_cod]
print(f'\n=== TODOS TALOES DO PEDIDO ({len(my_taloes)}) ===')
for t2 in my_taloes:
    cod = t2['CODIGO']
    item = t2.get('ITEM', '?')
    total = t2.get('TOTAL', '?')
    rem = t2.get('REMESSA', '?')
    canc = t2.get('CANCELADO', False)
    print(f'  Talao {cod}: Item={item} Total={total} Remessa={rem} Cancelado={canc}')
