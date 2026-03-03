import os
import time
from dbfread import DBF

BASE = r'C:\Users\Arthu\Downloads\Simple&Eco\DBF'
path = os.path.join(BASE, 'talsetor.dbf')

t0 = time.time()
table = DBF(path, encoding='latin-1', ignore_missing_memofile=True)

# Parse offsets from fields
field_offsets = {}
offset = 1 # skip deletion flag
for field in table.fields:
    field_offsets[field.name] = (offset, field.length, field.type)
    offset += field.length

# We want: DATA, TALAO, REMESSA, QTDE, NOMESET, SETOR
# Let's read these bytes in bulk
def parse_date(b):
    if b == b'        ': return None
    try:
        from datetime import date
        return date(int(b[:4]), int(b[4:6]), int(b[6:]))
    except:
        return None

def parse_num(b):
    s = b.strip()
    if not s: return 0
    return float(s)

count = 0
results = []
with open(path, 'rb') as f:
    f.seek(table.header.headerlen)
    recordlen = table.header.recordlen
    
    # Pre-calculate fields to extract
    target_fields = ['DATA', 'TALAO', 'REMESSA', 'QTDE', 'NOMESET', 'SETOR']
    extracts = []
    for tf in target_fields:
        if tf in field_offsets:
            extracts.append((tf, field_offsets[tf]))
            
    while True:
        record = f.read(recordlen)
        if len(record) < recordlen: break
        if record[0] == 42: # '*' deleted
            continue
            
        row = {}
        for name, (off, length, typ) in extracts:
            raw = record[off:off+length]
            if typ == 'D':
                row[name] = parse_date(raw)
            elif typ == 'N':
                row[name] = parse_num(raw)
            else:
                row[name] = raw.decode('latin-1').strip()
        results.append(row)

t1 = time.time()
print(f"Fast read took {t1-t0:.3f}s, read {len(results)} records.")
print("Sample:", results[:2])
