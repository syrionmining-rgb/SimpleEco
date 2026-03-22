import { useState, useEffect, useMemo } from 'react'
import Header from './components/Header'
import MetricCard from './components/MetricCard'
import ProductionCard from './components/ProductionCard'
import DelayedOrdersTable from './components/DelayedOrdersTable'
import ScheduledOrdersTable from './components/ScheduledOrdersTable'
import WeeklyChart from './components/WeeklyChart'
import GoalCard from './components/GoalCard'
import { fetchDashboard } from './services/api'
import type { DashboardData } from './types'
import SectorSelector from './components/SectorSelector'
import ControlsCard from './components/ControlsCard'
import { supabase } from './lib/supabase'
import {
  TriangleAlert,
  Package,
  TrendingUp,
} from 'lucide-react'

const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const currentMonth = months[new Date().getMonth()]
const ALL_SECTORS = '__ALL__'

export default function App() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('se_theme') !== 'light')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSector, setSelectedSector] = useState(ALL_SECTORS)
  const [lastSync, setLastSync] = useState<string | null>(null)

  function toggleTheme() {
    setIsDark((prev) => {
      const next = !prev
      if (next) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('se_theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('se_theme', 'light')
      }
      return next
    })
  }

  // Apply dark class on first render if not already set by inline script
  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [])

  // Fetch dashboard data
  useEffect(() => {
    setLoading(true)
    fetchDashboard()
      .then(setData)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    async function fetchLastSync() {
      try {
        const { data } = await supabase
          .from('sync_log')
          .select('ultima_sync')
          .eq('id', 1)
          .single()
        if (data?.ultima_sync) {
          const d = new Date(data.ultima_sync)
          setLastSync(
            d.toLocaleString('pt-BR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit', second: '2-digit',
            })
          )
        }
      } catch {
        // sem sync_log ainda
      }
    }
    fetchLastSync()
    const id = setInterval(fetchLastSync, 60_000)
    return () => clearInterval(id)
  }, [])

  const allDelayed = data?.delayed_orders ?? []
  const allToday   = data?.today_orders   ?? []
  const filteredDelayed = useMemo(
    () => selectedSector !== ALL_SECTORS
      ? allDelayed.filter(o => o.allSetorCods.includes(selectedSector))
      : allDelayed,
    [allDelayed, selectedSector],
  )
  const filteredToday = useMemo(
    () => selectedSector !== ALL_SECTORS
      ? allToday.filter(o => o.allSetorCods.includes(selectedSector))
      : allToday,
    [allToday, selectedSector],
  )

  const filteredDelayedCount = useMemo(
    () => (data ? filteredDelayed.length : null),
    [data, filteredDelayed],
  )
  const filteredProductionCount = useMemo(
    () => (data ? filteredToday.length : null),
    [data, filteredToday],
  )
  const filteredFinished = useMemo(
    () => filteredToday.filter(o => o.status === 'Finalizado').length,
    [filteredToday],
  )
  const filteredEfficiency = useMemo(() => {
    if (!data) return null
    return filteredToday.length > 0 ? Math.round((filteredFinished / filteredToday.length) * 100) : 0
  }, [data, filteredToday.length, filteredFinished])

  const metrics = [
    {
      title: 'Pedido',
      subtitle: 'em Atraso',
      value: filteredDelayedCount !== null ? String(filteredDelayedCount) : '…',
      unit: '',
      icon: TriangleAlert,
    },
    {
      title: 'Pedidos',
      subtitle: 'em Produção',
      value: filteredProductionCount !== null ? String(filteredProductionCount) : '…',
      unit: '',
      icon: Package,
    },
    {
      title: 'Eficiência',
      subtitle: 'Performance do Dia',
      value: filteredEfficiency !== null ? `${filteredEfficiency}%` : '…',
      unit: '',
      icon: TrendingUp,
      gradient: true,
    },
  ]

  const weeklyData = data?.weekly_data ?? [
    { day: 'SEG', produced: 0, goal: 1, pct: 0 },
    { day: 'TER', produced: 0, goal: 1, pct: 0 },
    { day: 'QUA', produced: 0, goal: 1, pct: 0 },
    { day: 'QUI', produced: 0, goal: 1, pct: 0 },
    { day: 'SEX', produced: 0, goal: 1, pct: 0 },
    { day: 'SAB', produced: 0, goal: 1, pct: 0 },
    { day: 'DOM', produced: 0, goal: 1, pct: 0 },
  ]

  const todayProgrammedFiltered = filteredToday.filter((order) => order.isTodayProgrammed)
  const dailyGoalUnits = todayProgrammedFiltered.reduce((sum, order) => sum + order.qty, 0)
  const dailyGoal = dailyGoalUnits > 0 ? dailyGoalUnits : null
  const dailyProgress = todayProgrammedFiltered
    .filter((order) => order.status === 'Finalizado')
    .reduce((sum, order) => sum + order.qty, 0)

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const weekDay = (now.getDay() + 6) % 7
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - weekDay)
  const nextWeekStart = new Date(weekStart)
  nextWeekStart.setDate(weekStart.getDate() + 7)

  const isInCurrentWeek = (dateIso: string | null) => {
    if (!dateIso) return false
    const date = new Date(`${dateIso}T00:00:00`)
    if (Number.isNaN(date.getTime())) return false
    return date >= weekStart && date < nextWeekStart
  }

  const weeklyTodayProgrammed = todayProgrammedFiltered.filter((order) => isInCurrentWeek(order.scheduledDateIso))
  const weeklyDelayedInWeek = filteredDelayed.filter((order) => isInCurrentWeek(order.scheduledDateIso))
  const weeklyGoalUnits = [...weeklyTodayProgrammed, ...weeklyDelayedInWeek]
    .reduce((sum, order) => sum + order.qty, 0)
  const weeklyGoal = weeklyGoalUnits > 0 ? weeklyGoalUnits : null
  const weeklyProgress = weeklyTodayProgrammed
    .filter((order) => order.status === 'Finalizado')
    .reduce((sum, order) => sum + order.qty, 0)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const isInCurrentMonth = (dateIso: string | null) => {
    if (!dateIso) return false
    const date = new Date(`${dateIso}T00:00:00`)
    if (Number.isNaN(date.getTime())) return false
    return date >= monthStart && date < nextMonthStart
  }

  const monthlyOrdersInMonth = [...filteredToday, ...filteredDelayed]
    .filter((order) => isInCurrentMonth(order.scheduledDateIso))
  const monthlyGoalUnits = monthlyOrdersInMonth.reduce((sum, order) => sum + order.qty, 0)
  const monthlyGoal = monthlyGoalUnits > 0 ? monthlyGoalUnits : null
  const monthlyProgress = filteredToday
    .filter((order) => isInCurrentMonth(order.scheduledDateIso))
    .filter((order) => order.status === 'Finalizado')
    .reduce((sum, order) => sum + order.qty, 0)

  return (
    <div className="min-h-screen bg-[var(--th-page)] text-[var(--th-txt-1)] p-3 pt-[52px] sm:pt-6 sm:p-6 lg:p-8 pb-6">
      <div className="max-w-[1920px] mx-auto space-y-5">
          <Header
            toggleTheme={toggleTheme}
            isDark={isDark}
            lastSync={lastSync}
          />

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-4 text-red-400 text-sm">
              Nao foi possivel carregar dados do Supabase: {error}
            </div>
          )}

          {/* Sector Selector — sempre estático, sectores ficam vazios enquanto carrega */}
          <div className="flex items-stretch gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <SectorSelector
                sectors={data?.sectors ?? []}
                selected={selectedSector}
                onChange={setSelectedSector}
                allValue={ALL_SECTORS}
                delayedCount={filteredDelayed.length}
                todayCount={filteredToday.length}
              />
            </div>
            <ControlsCard lastSync={lastSync} />
          </div>

          {/* Metric Cards */}
          <div id="overview" className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-5">
            {/* Pedido em Atraso */}
            <MetricCard {...metrics[0]} loading={loading} />
            {/* Pedidos em Produção */}
            <MetricCard {...metrics[1]} loading={loading} />
            {/* Eficiência */}
            <div className="sm:col-span-1">
              <MetricCard {...metrics[2]} loading={loading} />
            </div>
            <div className="sm:col-span-3 lg:col-span-2">
              <ProductionCard
                goal={dailyGoal}
                produced={dailyProgress}
              />
            </div>
          </div>

          {/* Tables */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-5">
            <div id="atrasados">
              <DelayedOrdersTable orders={filteredDelayed} loading={loading} />
            </div>
            <div id="programados">
              <ScheduledOrdersTable orders={filteredToday} loading={loading} />
            </div>
          </div>

          {/* Weekly Chart and Goals */}
          <div id="graficos" className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-5">
            <div className="order-last lg:order-first lg:col-span-2 flex">
              <WeeklyChart data={weeklyData} />
            </div>
            <div className="order-first lg:order-last flex flex-col gap-3 sm:gap-5">
              <GoalCard
                title="Meta Semanal"
                goal={weeklyGoal}
                unit="unidades"
                progress={weeklyProgress}
              />
              <GoalCard
                title={`Meta de ${currentMonth}`}
                goal={monthlyGoal}
                unit="unidades"
                progress={monthlyProgress}
                period={currentMonth}
              />
            </div>
          </div>
        </div>
    </div>
  )
}
