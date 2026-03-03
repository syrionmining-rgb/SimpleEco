from dbfread import DBF
from collections import Counter

path = r'C:\Users\Arthu\Downloads\Simple&Eco\DBF\pedidos.dbf'
db = DBF(path, ignore_missing_memofile=True, encoding='latin-1')

statuses = Counter()
saldos_zero = 0
saldos_non_zero = 0
faturados_eq_total = 0

for row in db:
    status = str(row.get('STATUS', '')).strip()
    statuses[status] += 1
    
    saldo = row.get('SALDO', 0)
    if saldo == 0:
        saldos_zero += 1
    else:
        saldos_non_zero += 1
        
    tot = row.get('TOTAL', 0)
    fat = row.get('FATURADOS', 0)
    if tot > 0 and tot == fat:
        faturados_eq_total += 1

print(f"Status distribution: {dict(statuses)}")
print(f"Saldos == 0: {saldos_zero}, Saldos > 0: {saldos_non_zero}")
print(f"Faturados == Total: {faturados_eq_total}")
print(f"Total Rows: {saldos_zero + saldos_non_zero}")
