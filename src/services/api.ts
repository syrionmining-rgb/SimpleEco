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
  if (d instanceof Date) {
    return d.toISOString().slice(0, 10)
  }
  if (typeof d === 'string') {
    const s = d.trim()
    if (!s) return null

    // YYYY-MM-DD / YYYY-MM-DDTHH:mm:ss
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)

    // DD/MM/YYYY
    const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (br) return `${br[3]}-${br[2]}-${br[1]}`

    // YYYYMMDD
    const compact = s.match(/^(\d{4})(\d{2})(\d{2})$/)
    if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`

    const parsed = new Date(s)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  }
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

function normKey(v: unknown): string {
  return String(v ?? '').trim()
}

function isMarked(value: unknown): boolean {
  const v = String(value ?? '').trim().toUpperCase()
  return v === '1' || v === 'S' || v === 'SIM' || v === 'Y' || v === 'YES' || v === 'TRUE' || v === 'T'
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

  // 1. Busca paralela de todas as tabelas
  const [taloes, talsetor, pedidos, clientes, fichas] =
    await Promise.all([
      fetchAll<any>('taloes',   'CODIGO,PEDIDO,ITEM,REFERENCIA,CANCELADO,FATURADO'),
      fetchAll<any>('talsetor', 'TALAO,SETOR,NOMESET,DATA,REMESSA,QTDE'),
      fetchAll<any>('pedidos',  'CODIGO,CLIENTE,PREVISAO,SALDO,PRIORIDADE'),
      fetchAll<any>('clientes', 'CODIGO,FANTASIA,NOME'),
      fetchAll<any>('fichas',   'CODIGO,NOME'),
    ])

  // 2. Lookup maps
  const talMap = new Map<string, any>(taloes.map((r: any) => [normKey(r.CODIGO), r]))
  const pedMap = new Map<string, any>(pedidos.map((r: any) => [normKey(r.CODIGO), r]))
  const cliMap = new Map<string, any>(clientes.map((r: any) => [normKey(r.CODIGO), r]))
  const ficMap = new Map<string, any>(fichas.map((r: any) => [normKey(r.CODIGO), r]))

  // Primeiro talão por pedido (para fallback de produto)
  const firstTalByPedido = new Map<string, any>()
  for (const t of taloes) {
    const pKey = normKey(t.PEDIDO)
    if (!pKey || firstTalByPedido.has(pKey)) continue
    firstTalByPedido.set(pKey, t)
  }

  const activeSet = new Set<string>(
    taloes
      .filter((r: any) => !isMarked(r.CANCELADO) && !isMarked(r.FATURADO))
      .map((r: any) => normKey(r.CODIGO))
      .filter(Boolean)
  )

  // Todos os setores por talão
  const talaoSectors = new Map<string, Map<string, string>>()
  for (const ts of talsetor) {
    const talao = normKey(ts.TALAO)
    const cod  = normKey(ts.SETOR)
    const nome = normKey(ts.NOMESET)
    if (!cod) continue
    if (!talao) continue
    if (!talaoSectors.has(talao)) talaoSectors.set(talao, new Map())
    talaoSectors.get(talao)!.set(cod, nome)
  }

  // 3. Pedidos de HOJE
  const remToday      = new Map<string, any>()
  const todayTalaoSet = new Set<string>()

  for (const ts of talsetor) {
    const talao = normKey(ts.TALAO)
    if (toDateStr(ts.DATA) !== todayStr) continue
    if (!activeSet.has(talao)) continue
    todayTalaoSet.add(talao)

    const tal      = talMap.get(talao)       ?? {}
    const pedCode  = normKey(tal.PEDIDO)
    if (!pedCode) continue
    const ped      = pedMap.get(pedCode)     ?? {}
    const ref      = String(tal.REFERENCIA ?? '').trim()
    const fic      = ficMap.get(ref) ?? {}
    const cli      = cliMap.get(normKey(ped.CLIENTE)) ?? {}
    const allCods  = [...(talaoSectors.get(talao)?.keys() ?? [])]
    const prio     = (allCods.includes('001') || Number(ped.PRIORIDADE ?? 0) > 0) ? 1 : 0
    const qtde     = Number(ts.QTDE) || 0
    const remessa  = String(ts.REMESSA ?? '').trim()

    if (!remToday.has(pedCode)) {
      remToday.set(pedCode, {
        id: pedCode,
        remessa: remessa,
        client    : ((cli.FANTASIA || cli.NOME || '—') as string).trim(),
        colorModel: ((fic.NOME || ref || '—') as string).trim(),
        qty: qtde, expDate: toDateStr(ped.PREVISAO),
        setor: (ts.NOMESET || '').trim(), setorCod: (ts.SETOR || '').trim(),
        _allSetorCods: allCods, _saldo: Number(ped.SALDO ?? 0), priority: prio,
      })
    } else {
      const e = remToday.get(pedCode)
      e.qty += qtde
      if (prio > 0) e.priority = 1
    }
  }

  // 4. Pedidos em ATRASO (último talsetor por talão, DATA < hoje, saldo > 0)
  const latest = new Map<string, any>()
  for (const ts of talsetor) {
    const talao = normKey(ts.TALAO)
    const d = toDateStr(ts.DATA)
    if (!d || d >= todayStr) continue
    if (!activeSet.has(talao) || todayTalaoSet.has(talao)) continue
    if (!latest.has(talao) || d > toDateStr(latest.get(talao)!.DATA)!) latest.set(talao, ts)
  }

  const remLate = new Map<string, any>()
  for (const [tCode, ts] of latest) {
    const tal     = talMap.get(tCode)   ?? {}
    const pedCode = normKey(tal.PEDIDO)
    if (!pedCode) continue
    const ped     = pedMap.get(pedCode) ?? {}
    if (Number(ped.SALDO ?? 0) === 0) continue

    const ref     = String(tal.REFERENCIA ?? '').trim()
    const fic     = ficMap.get(ref) ?? {}
    const cli     = cliMap.get(normKey(ped.CLIENTE)) ?? {}
    const allCods = [...(talaoSectors.get(tCode)?.keys() ?? [])]
    const prio    = (allCods.includes('001') || Number(ped.PRIORIDADE ?? 0) > 0) ? 1 : 0
    const minDate = toDateStr(ts.DATA)!
    const remessa = String(ts.REMESSA ?? '').trim()

    if (!remLate.has(pedCode)) {
      remLate.set(pedCode, {
        id: pedCode,
        remessa: remessa,
        client    : ((cli.FANTASIA || cli.NOME || '—') as string).trim(),
        colorModel: ((fic.NOME || ref || '—') as string).trim(),
        qty: Number(ts.QTDE) || 0, expDate: toDateStr(ped.PREVISAO),
        setor: (ts.NOMESET || '').trim(), setorCod: (ts.SETOR || '').trim(),
        _allSetorCods: allCods, _minDate: minDate, priority: prio,
      })
    } else {
      const e = remLate.get(pedCode)
      e.qty += Number(ts.QTDE) || 0
      if (prio > 0) e.priority = 1
      if (minDate < e._minDate) e._minDate = minDate
    }
  }

  // 5. Setores derivados dos movimentos reais em talsetor (SETOR + NOMESET)
  const sectorLookup = new Map<string, string>()
  for (const ts of talsetor) {
    const cod = String(ts.SETOR ?? '').trim()
    const nome = String(ts.NOMESET ?? '').trim()
    if (cod && nome && !sectorLookup.has(cod)) sectorLookup.set(cod, nome)
  }
  const sectors: Sector[] = [...sectorLookup.entries()]
    .map(([cod, nome]) => ({ cod, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

  // 6. Listas finais
  const delayed_orders: DelayedOrder[] = [...remLate.values()]
    .sort((a, b) => b._minDate.localeCompare(a._minDate))
    .map(e => ({
      id: e.id, remessa: e.remessa, client: e.client, colorModel: e.colorModel,
      scheduledDateIso: e._minDate,
      qty: e.qty, expDate: fmtDate(e.expDate),
      daysLate: daysDiff(e._minDate, todayStr),
      setor: e.setor, setorCod: e.setorCod,
      allSetorCods: e._allSetorCods, priority: e.priority,
    }))

  const today_orders: TodayOrder[] = [...remToday.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(e => ({
      id: e.id, remessa: e.remessa, client: e.client, colorModel: e.colorModel,
      scheduledDateIso: todayStr,
      qty: e.qty, expDate: fmtDate(e.expDate),
      status: e._saldo === 0 ? 'Finalizado' : statusFromSetor(e.setor),
      isTodayProgrammed: true,
      setor: e.setor, setorCod: e.setorCod,
      allSetorCods: e._allSetorCods, priority: e.priority,
    }))

  // Fallback: sempre adiciona TODOS os pedidos da tabela `pedidos`.
  // Isso garante que "Todos" sempre mostra todos os pedidos.
  const existingIds = new Set([
    ...today_orders.map(o => o.id),
    ...delayed_orders.map(o => o.id)
  ])

  for (const ped of pedidos) {
    const pedCode = normKey(ped.CODIGO)
    if (!pedCode || existingIds.has(pedCode)) continue

    const previsao = toDateStr(ped.PREVISAO)
    const cli = cliMap.get(normKey(ped.CLIENTE)) ?? {}
    const tal = firstTalByPedido.get(pedCode) ?? {}
    const ref = normKey(tal.REFERENCIA)
    const fic = ficMap.get(ref) ?? {}
    const saldo = Number(ped.SALDO ?? 0)
    
    const common = {
      id: pedCode,
      remessa: '',
      client: ((cli.FANTASIA || cli.NOME || '—') as string).trim(),
      colorModel: ((fic.NOME || ref || '—') as string).trim(),
      qty: saldo > 0 ? saldo : 1,
      expDate: fmtDate(previsao),
      setor: 'Sem Setor',
      setorCod: '',
      allSetorCods: [],
      priority: Number(ped.PRIORIDADE ?? 0) > 0 ? 1 : 0,
    }

    // Se tem previsão válida, classifica por data, senão vai para hoje
    if (previsao && previsao < todayStr) {
      delayed_orders.push({
        ...common,
        scheduledDateIso: previsao,
        daysLate: daysDiff(previsao, todayStr),
      })
    } else {
      today_orders.push({
        ...common,
        scheduledDateIso: previsao,
        status: saldo === 0 ? 'Finalizado' : 'Aguardando',
        isTodayProgrammed: false,
      })
    }
  }

  // 7. Métricas
  const delayed_count       = delayed_orders.length
  const in_production_count = today_orders.length > 0
    ? new Set(today_orders.map(o => o.id)).size
    : new Set([...latest.keys()].map(t => talMap.get(t)?.PEDIDO ?? '').filter(Boolean)).size

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

const CACHE_KEY = 'se_dashboard_v10'
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
