export interface DelayedOrder {
  id: string
  remessa: string
  client: string
  colorModel: string
  qty: number
  scheduledDateIso: string | null
  expDate: string | null
  daysLate: number
  setor: string
  setorCod: string
  allSetorCods: string[]
  priority: number
}

export interface TodayOrder {
  id: string
  remessa: string
  client: string
  colorModel: string
  qty: number
  scheduledDateIso: string | null
  expDate: string | null
  status: 'Em Produção' | 'Finalizado' | 'Aguardando' | 'Pausado'
  isTodayProgrammed: boolean
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
  day: string
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
