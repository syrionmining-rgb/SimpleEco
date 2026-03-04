import { supabase } from '../lib/supabase'
import type {
  DelayedOrder,
  TodayOrder,
  Sector,
  DayData,
  MonthDayData,
  DashboardData,
} from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateStr(d: unknown): string | null {
  if (!d) return null
  if (typeof d === 'string') return d.slice(0, 10)
  return null
}

function daysDiff(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

function statusFromSetor(nome: string): TodayOrder['status'] {
  const n = (nome || '').toUpperCase()
  if (n.includes('FATURAMENTO')) return 'Finalizado'
  if (n.includes('EXPEDI'))      return 'Em Produção'
  return 'Aguardando'
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// Busca paginada para tabelas grandes (Supabase limita 1000 linhas por request)
async function fetchAll<T>(
  tableName: string,
  select: string,
  filter?: (q: any) => any,
): Promise<T[]> {
  const PAGE = 1000
  const result: T[] = []
  let from = 0
  while (true) {
    let q = supabase.from(tableName).select(select).range(from, from + PAGE - 1)
    if (filter) q = filter(q)
    const { data, error } = await q
    if (error) throw new Error(`fetchAll(${tableName}): ${error.message}`)
    if (!data || data.length === 0) break
    result.push(...(data as T[]))
    if (data.length < PAGE) break
    from += PAGE
  }
  return result
}

// ── Lógica principal de montagem do dashboard ─────────────────────────────────

async function fetchDashboardFromSupabase(): Promise<DashboardData> {
  const todayObj  = new Date()
  todayObj.setHours(0, 0, 0, 0)
  const todayStr   = todayObj.toISOString().slice(0, 10)   // "2026-03-03"
  const monthStr   = todayStr.slice(0, 7)                   // "2026-03"
  const monthStart = `${monthStr}-01`
  const cutoff     = new Date(todayObj.getTime() - 120 * 86400000).toISOString().slice(0, 10)

  // 1. Busca paralela de todas as tabelas
  const [taloes, talsetor, pedidos, clientes, peditens, fichas, setoresRaw] =
    await Promise.all([
      fetchAll<any>('taloes',   'CODIGO,PEDIDO,ITEM,CANCELADO,FATURADO'),
      fetchAll<any>('talsetor', 'TALAO,SETOR,NOMESET,DATA,REMESSA,QTDE', q => q.gte('DATA', cutoff)),
      fetchAll<any>('pedidos',  'CODIGO,CLIENTE,PREVISAO,SALDO,PRIORIDADE'),
      fetchAll<any>('clientes', 'CODIGO,FANTASIA,NOME'),
      fetchAll<any>('peditens', 'CODIGO,ITEM,REFERENCIA'),
      fetchAll<any>('fichas',   'CODIGO,NOME'),
      fetchAll<any>('setores',  'CODIGO,NOME'),
    ])

  // 2. Lookup maps
  const talMap = new Map<string, any>(taloes.map((r: any) => [r.CODIGO, r]))
  const pedMap = new Map<string, any>(pedidos.map((r: any) => [r.CODIGO, r]))
  const cliMap = new Map<string, any>(clientes.map((r: any) => [r.CODIGO, r]))
  const ficMap = new Map<string, any>(fichas.map((r: any) => [r.CODIGO, r]))
  const piMap  = new Map<string, any>(peditens.map((r: any) => [`${r.CODIGO}|${r.ITEM}`, r]))

  const activeSet = new Set<string>(
    taloes.filter((r: any) => !r.CANCELADO && !r.FATURADO).map((r: any) => r.CODIGO as string)
  )

  // Todos os setores por talão
  const talaoSectors = new Map<string, Map<string, string>>()
  for (const ts of talsetor) {
    const cod  = (ts.SETOR   || '').trim()
    const nome = (ts.NOMESET || '').trim()
    if (!cod) continue
    if (!talaoSectors.has(ts.TALAO)) talaoSectors.set(ts.TALAO, new Map())
    talaoSectors.get(ts.TALAO)!.set(cod, nome)
  }

  // 3. Pedidos de HOJE
  const remToday      = new Map<string, any>()
  const todayTalaoSet = new Set<string>()

  for (const ts of talsetor) {
    if (toDateStr(ts.DATA) !== todayStr) continue
    if (!activeSet.has(ts.TALAO)) continue
    todayTalaoSet.add(ts.TALAO)

    const tal      = talMap.get(ts.TALAO)    ?? {}
    const pedCode  = tal.PEDIDO  ?? ''
    const ped      = pedMap.get(pedCode)     ?? {}
    const pi       = piMap.get(`${pedCode}|${tal.ITEM ?? ''}`) ?? {}
    const fic      = ficMap.get(String(pi.REFERENCIA ?? '').trim()) ?? {}
    const cli      = cliMap.get(ped.CLIENTE ?? '') ?? {}
    const allCods  = [...(talaoSectors.get(ts.TALAO)?.keys() ?? [])]
    const prio     = (allCods.includes('001') || Number(ped.PRIORIDADE ?? 0) > 0) ? 1 : 0
    const qtde     = Number(ts.QTDE) || 0

    if (!remToday.has(ts.REMESSA)) {
      remToday.set(ts.REMESSA, {
        id: ts.REMESSA,
        client    : ((cli.FANTASIA || cli.NOME || '—') as string).trim(),
        colorModel: ((fic.NOME || pi.REFERENCIA || '—') as string).trim(),
        qty: qtde, expDate: toDateStr(ped.PREVISAO),
        setor: (ts.NOMESET || '').trim(), setorCod: (ts.SETOR || '').trim(),
        _allSetorCods: allCods, _saldo: Number(ped.SALDO ?? 0), priority: prio,
      })
    } else {
      const e = remToday.get(ts.REMESSA)
      e.qty += qtde
      if (prio > 0) e.priority = 1
    }
  }

  // 4. Pedidos em ATRASO (último talsetor por talão, DATA < hoje, saldo > 0)
  const latest = new Map<string, any>()
  for (const ts of talsetor) {
    const d = toDateStr(ts.DATA)
    if (!d || d >= todayStr) continue
    if (!activeSet.has(ts.TALAO) || todayTalaoSet.has(ts.TALAO)) continue
    if (!latest.has(ts.TALAO) || d > toDateStr(latest.get(ts.TALAO)!.DATA)!) latest.set(ts.TALAO, ts)
  }

  const remLate = new Map<string, any>()
  for (const [tCode, ts] of latest) {
    const tal     = talMap.get(tCode)   ?? {}
    const pedCode = tal.PEDIDO ?? ''
    const ped     = pedMap.get(pedCode) ?? {}
    if (Number(ped.SALDO ?? 0) === 0) continue

    const pi      = piMap.get(`${pedCode}|${tal.ITEM ?? ''}`) ?? {}
    const fic     = ficMap.get(String(pi.REFERENCIA ?? '').trim()) ?? {}
    const cli     = cliMap.get(ped.CLIENTE ?? '') ?? {}
    const allCods = [...(talaoSectors.get(tCode)?.keys() ?? [])]
    const prio    = (allCods.includes('001') || Number(ped.PRIORIDADE ?? 0) > 0) ? 1 : 0
    const minDate = toDateStr(ts.DATA)!

    if (!remLate.has(ts.REMESSA)) {
      remLate.set(ts.REMESSA, {
        id: ts.REMESSA,
        client    : ((cli.FANTASIA || cli.NOME || '—') as string).trim(),
        colorModel: ((fic.NOME || pi.REFERENCIA || '—') as string).trim(),
        qty: Number(ts.QTDE) || 0, expDate: toDateStr(ped.PREVISAO),
        setor: (ts.NOMESET || '').trim(), setorCod: (ts.SETOR || '').trim(),
        _allSetorCods: allCods, _minDate: minDate, priority: prio,
      })
    } else {
      const e = remLate.get(ts.REMESSA)
      e.qty += Number(ts.QTDE) || 0
      if (prio > 0) e.priority = 1
      if (minDate < e._minDate) e._minDate = minDate
    }
  }

  // 5. Setores fixos
  const FIXED_SECTORS = [
    'Prioridade', 'Almoxarifado', 'Dublagem', 'Corte Serra',
    'Conformação 1', 'Conformação 2', 'Corte Palm Plana', 'Distribuição',
    'Recorte', 'Tampografia', 'Revisão Palm', 'Conformação 3',
    'Transfer', 'Atelier', 'Aplicação de Transfer',
  ]
  const nameToCod = new Map<string, string>(
    setoresRaw.map((r: any) => [(r.NOME || '').toUpperCase(), r.CODIGO as string])
  )
  const sectors: Sector[] = FIXED_SECTORS.map((nome, i) => ({
    cod : nameToCod.get(nome.toUpperCase()) ?? `_F${i}`,
    nome,
  }))

  // 6. Listas finais
  const delayed_orders: DelayedOrder[] = [...remLate.values()]
    .sort((a, b) => b._minDate.localeCompare(a._minDate))
    .map(e => ({
      id: e.id, client: e.client, colorModel: e.colorModel,
      qty: e.qty, expDate: fmtDate(e.expDate),
      daysLate: daysDiff(e._minDate, todayStr),
      setor: e.setor, setorCod: e.setorCod,
      allSetorCods: e._allSetorCods, priority: e.priority,
    }))

  const today_orders: TodayOrder[] = [...remToday.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(e => ({
      id: e.id, client: e.client, colorModel: e.colorModel,
      qty: e.qty, expDate: fmtDate(e.expDate),
      status: e._saldo === 0 ? 'Finalizado' : statusFromSetor(e.setor),
      setor: e.setor, setorCod: e.setorCod,
      allSetorCods: e._allSetorCods, priority: e.priority,
    }))

  // 7. Métricas
  const delayed_count       = remLate.size
  const in_production_count = new Set(
    [...latest.keys()].map(t => talMap.get(t)?.PEDIDO ?? '').filter(Boolean)
  ).size

  // 8. Dados semanais
  const DAY_ABBR = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM']
  const weekDay      = (todayObj.getDay() + 6) % 7
  const weekStart    = new Date(todayObj.getTime() - weekDay * 86400000)
  const refEnd       = new Date(weekStart.getTime() - 86400000)
  const refStart     = new Date(refEnd.getTime() - 30 * 86400000)
  const refEndStr    = refEnd.toISOString().slice(0, 10)
  const refStartStr  = refStart.toISOString().slice(0, 10)

  const dailyTotal = new Map<string, number>()
  const dailyDone  = new Map<string, number>()
  let   monthlyProgress = 0

  for (const ts of talsetor) {
    const d = toDateStr(ts.DATA)
    if (!d) continue
    const q = Number(ts.QTDE) || 0
    dailyTotal.set(d, (dailyTotal.get(d) ?? 0) + q)
    if ((ts.NOMESET || '').toUpperCase().includes('FATURAMENTO')) {
      dailyDone.set(d, (dailyDone.get(d) ?? 0) + q)
    }
    if (d >= monthStart && d <= todayStr) monthlyProgress += q
  }

  const refByWd = new Map<number, number[]>()
  for (const [d, total] of dailyTotal) {
    if (d >= refStartStr && d <= refEndStr) {
      const wd = (new Date(d + 'T00:00:00').getDay() + 6) % 7
      if (!refByWd.has(wd)) refByWd.set(wd, [])
      refByWd.get(wd)!.push(total)
    }
  }
  const allRefVals = [...refByWd.values()].flat().filter(v => v > 0)
  const globalAvg  = allRefVals.length
    ? Math.floor(allRefVals.reduce((a, b) => a + b, 0) / allRefVals.length)
    : 10000
  const avgPerWd = new Map([...refByWd].map(([wd, vals]) => [
    wd, Math.floor(vals.reduce((a, b) => a + b, 0) / vals.length),
  ]))

  let weeklyProgress = 0
  const weekly_data: DayData[] = Array.from({ length: 7 }, (_, wd) => {
    const d        = new Date(weekStart.getTime() + wd * 86400000).toISOString().slice(0, 10)
    const produced = dailyTotal.get(d) ?? 0
    const goal     = avgPerWd.get(wd)  ?? globalAvg
    const pct      = goal ? Math.round(produced / goal * 100) : 0
    weeklyProgress += produced
    return { day: DAY_ABBR[wd], produced, goal, pct }
  })

  const weekly_goal  = weekly_data.reduce((s, d) => s + d.goal, 0)
  const monthly_goal = Math.floor(weekly_goal / 7 * 30)

  // 9. Dados mensais
  const lastDay = new Date(todayObj.getFullYear(), todayObj.getMonth() + 1, 0).getDate()
  const monthly_data: MonthDayData[] = Array.from({ length: lastDay }, (_, i) => {
    const dStr = `${monthStr}-${String(i + 1).padStart(2, '0')}`
    const s    = dailyTotal.get(dStr) ?? 0
    const dn   = dailyDone.get(dStr)  ?? 0
    return { day: String(i + 1), scheduled: s, done: dn, pct: s ? Math.round(dn / s * 100) : 0, future: dStr > todayStr }
  })

  // 10. Eficiência
  const workdays   = weekly_data.slice(0, 5).filter(d => d.produced > 0)
  const efficiency = workdays.length
    ? parseFloat((workdays.filter(d => d.pct >= 100).length / workdays.length * 100).toFixed(1))
    : 0

  return {
    delayed_orders, today_orders, sectors,
    metrics: { delayed_count, in_production_count, efficiency },
    weekly_data, weekly_goal, weekly_progress: weeklyProgress,
    monthly_goal, monthly_progress: monthlyProgress, monthly_data,
  }
}

// ── Cache ─────────────────────────────────────────────────────────────────────

const CACHE_KEY = 'se_dashboard_v2'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

interface CacheEntry { data: DashboardData; ts: number }
let memoryCache: CacheEntry | null = null
let inFlightDashboard: Promise<DashboardData> | null = null

// ── Entry point ────────────────────────────────────────────────────────────────

export async function fetchDashboard(): Promise<DashboardData> {
  // Cache em memória (evita JSON parse e deduplica em navegação local)
  if (memoryCache && Date.now() - memoryCache.ts < CACHE_TTL) {
    return memoryCache.data
  }

  // Tenta cache
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (raw) {
      const entry: CacheEntry = JSON.parse(raw)
      if (Date.now() - entry.ts < CACHE_TTL) {
        memoryCache = entry
        return entry.data
      }
    }
  } catch {}

  // Evita disparos duplicados (ex.: React StrictMode no dev)
  if (inFlightDashboard) return inFlightDashboard

  inFlightDashboard = fetchDashboardFromSupabase()
    .then((data) => {
      const entry: CacheEntry = { data, ts: Date.now() }
      memoryCache = entry
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry)) } catch {}
      return data
    })
    .finally(() => {
      inFlightDashboard = null
    })

  return inFlightDashboard
}
