import os
import time
from concurrent.futures import ProcessPoolExecutor
from dbfread import DBF

BASE_DIR = r'C:\Users\Arthu\Downloads\Simple&Eco\DBF'

def read_dbf(name):
    path = os.path.join(BASE_DIR, f'{name}.dbf')
    if not os.path.exists(path): return []
    table = DBF(path, ignore_missing_memofile=True, encoding='latin-1')
    return [
        dict(rec) for rec in table
        if not getattr(rec, 'deleted', False)
        and not rec.get('DeletionFlag')
        and not rec.get('_deleted')
    ]

if __name__ == '__main__':
    print("Testing sequential read...")
    t0 = time.time()
    taloes = read_dbf('taloes')
    talsetor = read_dbf('talsetor')
    pedidos = read_dbf('pedidos')
    peditens = read_dbf('peditens')
    t1 = time.time()
    print(f"Sequential took {t1-t0:.2f}s")
    
    print("Testing parallel read...")
    t0 = time.time()
    with ProcessPoolExecutor(max_workers=4) as executor:
        files = ['taloes', 'talsetor', 'pedidos', 'peditens']
        results = list(executor.map(read_dbf, files))
    t1 = time.time()
    print(f"Parallel took {t1-t0:.2f}s")
