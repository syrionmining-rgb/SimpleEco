export interface DelayedOrder {
  id: string
  client: string
  colorModel: string
  qty: number
  expDate: string | null
  daysLate: number
  setor: string
  setorCod: string
  allSetorCods: string[]
  priority: number
}

export interface TodayOrder {
  id: string
  client: string
  colorModel: string
  qty: number
  expDate: string | null
  status: 'Em Produção' | 'Finalizado' | 'Aguardando' | 'Pausado'
  setor: string
  setorCod: string
  allSetorCods: string[]
  priority: number
}

export interface Sector {
  cod: string
  nome: string
}

export interface DayData {
  day: string
  produced: number
  goal: number
  pct: number
}

export interface MonthDayData {
  day: string       // '1' … '31'
  scheduled: number
  done: number
  pct: number
  future: boolean
}

export interface Metrics {
  delayed_count: number
  in_production_count: number
  efficiency: number
}

export interface DashboardData {
  delayed_orders: DelayedOrder[]
  today_orders: TodayOrder[]
  sectors: Sector[]
  metrics: Metrics
  weekly_data: DayData[]
  weekly_goal: number
  weekly_progress: number
  monthly_goal: number
  monthly_progress: number
  monthly_data: MonthDayData[]
}

// Defina VITE_USE_MOCK=true no .env (ou .env.production) para forçar mock
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export async function fetchDashboard(): Promise<DashboardData> {
  if (USE_MOCK) {
    const { MOCK_DASHBOARD } = await import('./mockData')
    return MOCK_DASHBOARD
  }
  try {
    const res = await fetch('/api/dashboard')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  } catch {
    // Fallback automático para mock quando o backend não está disponível
    const { MOCK_DASHBOARD } = await import('./mockData')
    return MOCK_DASHBOARD
  }
}
