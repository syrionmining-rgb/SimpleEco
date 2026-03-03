"""
FastAPI backend — lê DBFs do Simple&Eco e expõe endpoints REST.
"""
import os
from datetime import date, timedelta
from collections import defaultdict
import calendar as _calendar
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dbfread import DBF

# ---------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'DBF'))
DAYS_WINDOW  = 120    # quantos dias atrás considerar como "ativo"
DAY_ABBR     = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM']

app = FastAPI(title="Simple&Eco API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Helpers de leitura
# ---------------------------------------------------------------------------
def read_dbf(name: str) -> list[dict]:
    path = os.path.join(BASE_DIR, f'{name}.dbf')
    if not os.path.exists(path):
        return []
    table = DBF(path, ignore_missing_memofile=True, encoding='latin-1')
    # Drop registros marcados como deletados no DBF
    return [
        dict(rec)
        for rec in table
        if not getattr(rec, 'deleted', False)
        and not rec.get('DeletionFlag')
        and not rec.get('_deleted')
    ]


def fmt_date(d) -> str | None:
    if d is None:
        return None
    return d.strftime('%d/%m/%Y')


def status_from_setor(setor_nome: str) -> str:
    nome = (setor_nome or '').upper()
    if 'FATURAMENTO' in nome:
        return 'Finalizado'
    if 'EXPEDI' in nome:
        return 'Em Produção'
    if 'PROGRA' in nome:
        return 'Aguardando'
    return 'Aguardando'


# ---------------------------------------------------------------------------
# Cache em memória (carregado na primeira requisição)
# ---------------------------------------------------------------------------
_cache: dict[str, Any] = {}


def get_data() -> dict:
    if _cache:
        return _cache

    today = date.today()
    cutoff = today - timedelta(days=DAYS_WINDOW)

    taloes   = read_dbf('taloes')
    talsetor = read_dbf('talsetor')
    pedidos  = read_dbf('pedidos')
    clientes = read_dbf('clientes')
    peditens = read_dbf('peditens')
    fichas   = read_dbf('fichas')

    tal_map = {r['CODIGO']: r for r in taloes}
    ped_map = {r['CODIGO']: r for r in pedidos}
    cli_map = {r['CODIGO']: r for r in clientes}
    fic_map = {r['CODIGO']: r for r in fichas}
    pi_map  = {(r['CODIGO'], r['ITEM']): r for r in peditens}

    # Talões ativos: não cancelados, não faturados
    active_set = {
        r['CODIGO'] for r in taloes
        if not r.get('CANCELADO') and not r.get('FATURADO')
    }

    # Histórico completo de setores por talão (todos os registros de talsetor)
    talao_sectors: dict[str, dict[str, str]] = defaultdict(dict)
    for ts in talsetor:
        cod  = (ts.get('SETOR')   or '').strip()
        nome = (ts.get('NOMESET') or '').strip()
        if cod:
            talao_sectors[ts['TALAO']][cod] = nome

    # ── Talões para HOJE: varredura direta em talsetor DATA == today ──────────
    rem_today: dict[str, dict] = {}
    today_talao_set: set[str] = set()

    for ts in talsetor:
        if ts['DATA'] != today:
            continue
        
        # Filtro Global de Data a partir de 01/09/2025
        if ts.get('DATA') and ts['DATA'] < date(2025, 9, 1):
            continue
            
        t = ts['TALAO']
        if t not in active_set:
            continue
        today_talao_set.add(t)
        tal      = tal_map.get(t, {})
        ped_code = tal.get('PEDIDO', '')
        item_code = tal.get('ITEM', '')
        ped      = ped_map.get(ped_code, {})
        pi       = pi_map.get((ped_code, item_code), {})
        fic      = fic_map.get(str(pi.get('REFERENCIA', '')).strip(), {})
        cli      = cli_map.get(ped.get('CLIENTE', ''), {})

        rem          = ts['REMESSA']
        qtde         = ts.get('QTDE') or 0
        cliente_nome = (cli.get('FANTASIA') or cli.get('NOME') or '—').strip()
        modelo       = (fic.get('NOME') or pi.get('REFERENCIA') or '—').strip()
        previsao     = ped.get('PREVISAO')

        setor_nome = (ts.get('NOMESET') or '').strip()
        setor_cod  = (ts.get('SETOR') or '').strip()
        all_setor_cods = list(talao_sectors.get(t, {}).keys())
        saldo      = ped.get('SALDO', 0)
        # Prioridade 1 se passou pelo setor 001 ou se campo PRIORIDADE > 0
        prioridade = 1 if ('001' in all_setor_cods or int(ped.get('PRIORIDADE') or 0) > 0) else 0

        if rem not in rem_today:
            rem_today[rem] = {
                'id'           : rem,
                'client'       : cliente_nome,
                'colorModel'   : modelo,
                'qty'          : qtde,
                'expDate'      : fmt_date(previsao),
                'setor'        : setor_nome,
                'setorCod'     : setor_cod,
                '_allSetorCods': all_setor_cods,
                '_saldo'       : saldo,
                'priority'     : prioridade,
            }
        else:
            rem_today[rem]['qty'] += qtde
            if prioridade > 0:
                rem_today[rem]['priority'] = prioridade

    # ── Talões em ATRASO: último talsetor por talão (sem limite de data) ──────────
    # Exclui talões já cobertos pelo painel de hoje
    latest: dict[str, dict] = {}
    for ts in talsetor:
        t = ts['TALAO']
        if t not in active_set or t in today_talao_set:
            continue
        d = ts['DATA']
        if d is None:
            continue
            
        # Filtro Global de Data a partir de 01/09/2025
        if d < date(2025, 9, 1):
            continue
            
        if t not in latest or d > latest[t]['DATA']:
            latest[t] = ts

    rem_late: dict[str, dict] = {}

    for t_code, ts in latest.items():
        if ts['DATA'] >= today:
            continue  # garante apenas atrasos reais
        tal      = tal_map.get(t_code, {})
        ped_code = tal.get('PEDIDO', '')
        item_code = tal.get('ITEM', '')
        ped      = ped_map.get(ped_code, {})
        pi       = pi_map.get((ped_code, item_code), {})
        fic      = fic_map.get(str(pi.get('REFERENCIA', '')).strip(), {})
        cli      = cli_map.get(ped.get('CLIENTE', ''), {})

        cliente_nome = (cli.get('FANTASIA') or cli.get('NOME') or '—').strip()
        modelo       = (fic.get('NOME') or pi.get('REFERENCIA') or '—').strip()
        rem          = ts['REMESSA']
        qtde         = ts.get('QTDE') or 0
        previsao     = ped.get('PREVISAO')
        saldo        = ped.get('SALDO', 0)

        # Se o saldo é zero, o pedido foi concluído, então não é atraso
        if saldo == 0:
            continue

        setor_nome = (ts.get('NOMESET') or '').strip()
        setor_cod  = (ts.get('SETOR') or '').strip()
        all_setor_cods = list(talao_sectors.get(t_code, {}).keys())
        # Prioridade 1 se passou pelo setor 001 ou se campo PRIORIDADE > 0
        prioridade = 1 if ('001' in all_setor_cods or int(ped.get('PRIORIDADE') or 0) > 0) else 0

        if rem not in rem_late:
            rem_late[rem] = {
                'id'           : rem,
                'client'       : cliente_nome,
                'colorModel'   : modelo,
                'qty'          : qtde,
                'expDate'      : fmt_date(previsao),
                'setor'        : setor_nome,
                'setorCod'     : setor_cod,
                '_min_date'    : ts['DATA'],
                '_allSetorCods': all_setor_cods,
                'priority'     : prioridade,
            }
        else:
            rem_late[rem]['qty'] += qtde
            if prioridade > 0:
                rem_late[rem]['priority'] = prioridade
            if ts['DATA'] < rem_late[rem]['_min_date']:
                rem_late[rem]['_min_date'] = ts['DATA']

    # Lista fixa de setores (ordem e nomes definidos pelo usuário)
    FIXED_SECTORS = [
        'Prioridade',
        'Almoxarifado',
        'Dublagem',
        'Corte Serra',
        'Conformação 1',
        'Conformação 2',
        'Corte Palm Plana',
        'Distribuição',
        'Recorte',
        'Tampografia',
        'Revisão Palm',
        'Conformação 3',
        'Transfer',
        'Atelier',
        'Aplicação de Transfer',
    ]

    # Monta mapa nome-normalizado → código a partir do DBF
    all_setores_raw = read_dbf('setores')
    nome_to_cod: dict[str, str] = {}
    cod_to_nome: dict[str, str] = {}
    for r in all_setores_raw:
        cod  = r.get('CODIGO', '')
        nome = (r.get('NOME') or '').strip()
        if cod and nome:
            nome_to_cod[nome.upper()] = cod
            cod_to_nome[cod] = nome

    # Constrói a lista de setores na ordem fixa; usa cod do DBF quando disponível
    sectors: list[dict] = []
    for idx, nome_fixo in enumerate(FIXED_SECTORS):
        cod = nome_to_cod.get(nome_fixo.upper(), f'_F{idx}')
        sectors.append({'cod': cod, 'nome': nome_fixo})

    # active_sector_codes (ainda usado para filtrar pedidos por setor)
    active_sector_codes: set[str] = set()
    for info in rem_today.values():
        codes = info.get('_allSetorCods') or []
        if info.get('setorCod'):
            codes.append(info['setorCod'])
        active_sector_codes.update(codes)
    for info in rem_late.values():
        codes = info.get('_allSetorCods') or []
        if info.get('setorCod'):
            codes.append(info['setorCod'])
        active_sector_codes.update(codes)

    # Build delayed orders list
    delayed_orders = []
    for info in sorted(rem_late.values(), key=lambda x: x['_min_date'], reverse=True):
        days_late = (today - info['_min_date']).days
        delayed_orders.append({
            'id'          : info['id'],
            'client'      : info['client'],
            'colorModel'  : info['colorModel'],
            'qty'         : info['qty'],
            'expDate'     : info['expDate'],
            'daysLate'    : days_late,
            'setor'       : info['setor'],
            'setorCod'    : info['setorCod'],
            'allSetorCods': info.get('_allSetorCods', []),
            'priority'    : info.get('priority', 0),
        })

    # Build today orders list
    today_orders = []
    for info in sorted(rem_today.values(), key=lambda x: x['id']):
        status = 'Finalizado' if info.get('_saldo') == 0 else status_from_setor(info['setor'])
        today_orders.append({
            'id'          : info['id'],
            'client'      : info['client'],
            'colorModel'  : info['colorModel'],
            'qty'         : info['qty'],
            'expDate'     : info['expDate'],
            'status'      : status,
            'setor'       : info['setor'],
            'setorCod'    : info['setorCod'],
            'allSetorCods': info.get('_allSetorCods', []),
            'priority'    : info.get('priority', 0),
        })

    # Metrics
    # Pedidos em atraso = distinct remessas com talão em atraso
    delayed_pedidos  = set(rem_late.keys())

    # Pedidos em produção = distinct pedidos ativos na janela
    in_production_pedidos = {
        tal_map.get(t_code, {}).get('PEDIDO', '')
        for t_code in latest
    } - {''}

    # Weekly chart — QTDE from talsetor current week
    week_start  = today - timedelta(days=today.weekday())
    week_end    = week_start + timedelta(days=6)
    # Rolling 30-day window (excluding current week) for goal calibration
    ref_end     = week_start - timedelta(days=1)
    ref_start   = ref_end - timedelta(days=30)

    # Accumulate QTDE per calendar date in a single pass
    daily_total: dict[date, int] = defaultdict(int)
    daily_done:  dict[date, int] = defaultdict(int)   # QTDE finalizado (FATURAMENTO)
    monthly_progress = 0
    month_start = today.replace(day=1)

    for ts in talsetor:
        d = ts['DATA']
        if d is None:
            continue
        q = ts.get('QTDE') or 0
        daily_total[d] += q
        if (ts.get('NOMESET') or '').upper().find('FATURAMENTO') >= 0:
            daily_done[d] += q
        if month_start <= d <= today:
            monthly_progress += q

    # Current week per weekday
    weekly_by_day: dict[int, int] = {
        d.weekday(): total
        for d, total in daily_total.items()
        if week_start <= d <= week_end
    }

    # Reference: collect daily totals per weekday
    ref_by_wd: dict[int, list[int]] = defaultdict(list)
    for d, total in daily_total.items():
        if ref_start <= d <= ref_end:
            ref_by_wd[d.weekday()].append(total)

    # Per-weekday goal = mean daily total in reference window
    avg_per_wd: dict[int, int] = {
        wd: int(sum(vals) / len(vals)) for wd, vals in ref_by_wd.items() if vals
    }
    all_ref_vals = [v for vals in ref_by_wd.values() for v in vals if v > 0]
    global_avg   = int(sum(all_ref_vals) / len(all_ref_vals)) if all_ref_vals else 10000

    weekly_data = []
    weekly_progress = 0
    for wd in range(7):
        produced = weekly_by_day.get(wd, 0)
        goal     = avg_per_wd.get(wd, global_avg)
        pct      = round(produced / goal * 100) if goal else 0
        weekly_progress += produced
        weekly_data.append({
            'day'     : DAY_ABBR[wd],
            'produced': produced,
            'goal'    : goal,
            'pct'     : pct,
        })

    weekly_goal  = sum(d['goal'] for d in weekly_data)
    monthly_goal = int(weekly_goal / 7 * 30)

    # Monthly chart — every day of current month
    last_day = _calendar.monthrange(today.year, today.month)[1]
    monthly_data = []
    for day_num in range(1, last_day + 1):
        d = today.replace(day=day_num)
        scheduled = daily_total.get(d, 0)
        done      = daily_done.get(d, 0)
        pct       = round(done / scheduled * 100) if scheduled else 0
        monthly_data.append({
            'day'      : str(day_num),
            'scheduled': scheduled,
            'done'     : done,
            'pct'      : pct,
            'future'   : d > today,
        })

    # Efficiency: % de dias da semana (seg-sex) onde produção >= meta
    workdays = [d for d in weekly_data[:5] if d['produced'] > 0]
    days_ok  = sum(1 for d in workdays if d['pct'] >= 100)
    efficiency_pct = round(days_ok / len(workdays) * 100, 1) if workdays else 0.0

    _cache.update({
        'delayed_orders'   : delayed_orders,
        'today_orders'     : today_orders,
        'sectors'          : sectors,
        'metrics': {
            'delayed_count'      : len(delayed_pedidos),
            'in_production_count': len(in_production_pedidos),
            'efficiency'         : efficiency_pct,
        },
        'weekly_data'      : weekly_data,
        'weekly_goal'      : weekly_goal,
        'weekly_progress'  : weekly_progress,
        'monthly_goal'     : monthly_goal,
        'monthly_progress' : monthly_progress,
        'monthly_data'     : monthly_data,
    })
    return _cache


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get('/api/dashboard')
def dashboard():
    return get_data()


@app.get('/api/refresh')
def refresh():
    """Força recarga dos DBFs."""
    _cache.clear()
    return get_data()
