from dbfread import DBF
import os
from datetime import date

BASE = r'C:\Users\Arthu\Downloads\Simple&Eco\DBF'

def read(name):
    path = os.path.join(BASE, name + '.dbf')
    return list(DBF(path, ignore_missing_memofile=True, encoding='latin-1'))

today = date.today()
print("Today:", today)

talsetor = read('talsetor')
taloes   = read('taloes')
pedidos  = read('pedidos')
clientes = read('clientes')
peditens = read('peditens')
fichas   = read('fichas')

# Build lookup dicts
taloes_map   = {r['CODIGO']: r for r in taloes}
clientes_map = {r['CODIGO']: r for r in clientes}
pedidos_map  = {r['CODIGO']: r for r in pedidos}
# peditens keyed by (pedido, item)
pedi_map = {(r['CODIGO'], r['ITEM']): r for r in peditens}
fichas_map = {r['CODIGO']: r for r in fichas}

# Sample 5 talsetor records with joins
print("\n=== JOINED SAMPLE (first 5 talsetor rows) ===")
for ts in talsetor[:10]:
    tal = taloes_map.get(ts['TALAO'], {})
    ped_code = tal.get('PEDIDO', '')
    item_code = tal.get('ITEM', '')
    ped = pedidos_map.get(ped_code, {})
    cli = clientes_map.get(ped.get('CLIENTE', ''), {})
    pi  = pedi_map.get((ped_code, item_code), {})
    fic = fichas_map.get(pi.get('REFERENCIA', ''), {})

    print(f"talsetor: REMESSA={ts['REMESSA']} TALAO={ts['TALAO']} SETOR={ts['SETOR']} DATA={ts['DATA']} QTDE={ts['QTDE']}")
    print(f"  taloes : PEDIDO={ped_code} ITEM={item_code} REFERENCIA={tal.get('REFERENCIA')} TOTAL={tal.get('TOTAL')}")
    print(f"  pedidos: CLIENTE={ped.get('CLIENTE')} PREVISAO={ped.get('PREVISAO')} REMESSA={ped.get('REMESSA')}")
    print(f"  clientes: NOME={cli.get('NOME')} FANTASIA={cli.get('FANTASIA')}")
    print(f"  peditens: REFERENCIA={pi.get('REFERENCIA')} COR={str(pi.get('COR',''))[:30]}")
    print(f"  fichas: NOME={fic.get('NOME')}")
    print()

# Check date ranges  
datas = sorted(set(ts['DATA'] for ts in talsetor if ts['DATA']))
print(f"\nDate range in talsetor: {datas[0] if datas else 'N/A'} -> {datas[-1] if datas else 'N/A'}")
print(f"Total records: {len(talsetor)}")
late = [ts for ts in talsetor if ts['DATA'] and ts['DATA'] < today]
today_r = [ts for ts in talsetor if ts['DATA'] and ts['DATA'] == today]
print(f"Late: {len(late)}  Today: {len(today_r)}")

# Check fichas structure more
print("\n=== FICHAS sample ===")
for f in fichas[:3]:
    print({k: v for k, v in f.items() if v and str(v).strip()})
