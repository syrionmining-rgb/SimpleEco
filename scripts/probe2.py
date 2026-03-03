from dbfread import DBF
import os
from datetime import date, timedelta
from collections import defaultdict

BASE = r'C:\Users\Arthu\Downloads\Simple&Eco\DBF'
def read(n): return list(DBF(os.path.join(BASE,n+'.dbf'), ignore_missing_memofile=True, encoding='latin-1'))

today = date.today()
cutoff = today - timedelta(days=90)

taloes   = read('taloes')
talsetor = read('talsetor')
pedidos  = read('pedidos')
clientes = read('clientes')
remessas = read('remessas')
peditens = read('peditens')
fichas   = read('fichas')

tal_map  = {r['CODIGO']: r for r in taloes}
ped_map  = {r['CODIGO']: r for r in pedidos}
cli_map  = {r['CODIGO']: r for r in clientes}
rem_map  = {r['CODIGO']: r for r in remessas}
fic_map  = {r['CODIGO']: r for r in fichas}
pi_map   = {(r['CODIGO'], r['ITEM']): r for r in peditens}

active_set = {r['CODIGO'] for r in taloes if not r.get('CANCELADO') and not r.get('FATURADO')}

# Latest talsetor per active talao (90d window)
latest = {}
for ts in talsetor:
    t = ts['TALAO']
    if t not in active_set:
        continue
    d = ts['DATA']
    if d is None or d < cutoff:
        continue
    if t not in latest or d > latest[t]['DATA']:
        latest[t] = ts

print('Latest (90d window):', len(latest))

# Group by remessa
rem_late  = {}
rem_today = {}

for t_code, ts in latest.items():
    tal = tal_map.get(t_code, {})
    ped_code = tal.get('PEDIDO', '')
    ped = ped_map.get(ped_code, {})
    item_code = tal.get('ITEM', '')
    pi  = pi_map.get((ped_code, item_code), {})
    fic = fic_map.get(pi.get('REFERENCIA', ''), {})
    cli = cli_map.get(ped.get('CLIENTE', ''), {})
    rem = ts['REMESSA']

    row = {
        'remessa'  : rem,
        'talao'    : t_code,
        'pedido'   : ped_code,
        'referencia': pi.get('REFERENCIA', ''),
        'modelo'   : fic.get('NOME', pi.get('REFERENCIA', '')),
        'cliente'  : cli.get('FANTASIA') or cli.get('NOME', '-'),
        'qtde'     : ts.get('QTDE') or 0,
        'setor'    : ts.get('NOMESET', ''),
        'data'     : ts['DATA'],
        'previsao' : ped.get('PREVISAO'),
    }

    if ts['DATA'] < today:
        if rem not in rem_late:
            rem_late[rem] = row.copy()
            rem_late[rem]['total_qtde'] = 0
            rem_late[rem]['min_date'] = ts['DATA']
        rem_late[rem]['total_qtde'] += row['qtde']
        if ts['DATA'] < rem_late[rem]['min_date']:
            rem_late[rem]['min_date'] = ts['DATA']
    else:
        if rem not in rem_today:
            rem_today[rem] = row.copy()
            rem_today[rem]['total_qtde'] = 0
        rem_today[rem]['total_qtde'] += row['qtde']

print('Distinct remessas late :', len(rem_late))
print('Distinct remessas today:', len(rem_today))

print('\n--- LATE sample ---')
for rem_code, info in list(rem_late.items())[:5]:
    days = (today - info['min_date']).days
    print(f"  REM={rem_code} QTDE={info['total_qtde']} SETOR={info['setor']} CLIENTE={info['cliente']} MODELO={info['modelo']} PREVISAO={info.get('previsao')} DIAS={days}")

print('\n--- TODAY sample ---')
for rem_code, info in list(rem_today.items())[:5]:
    print(f"  REM={rem_code} QTDE={info['total_qtde']} SETOR={info['setor']} CLIENTE={info['cliente']} MODELO={info['modelo']} PREVISAO={info.get('previsao')}")
