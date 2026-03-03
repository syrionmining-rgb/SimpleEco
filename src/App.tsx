import { useState, useEffect } from 'react'
import Header from './components/Header'
import MetricCard from './components/MetricCard'
import ProductionCard from './components/ProductionCard'
import DelayedOrdersTable from './components/DelayedOrdersTable'
import ScheduledOrdersTable from './components/ScheduledOrdersTable'
import WeeklyChart from './components/WeeklyChart'
import GoalCard from './components/GoalCard'
import { fetchDashboard, type DashboardData } from './api'
import SectorSelector from './components/SectorSelector'
import {
  TriangleAlert,
  Package,
  TrendingUp,
} from 'lucide-react'

const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const currentMonth = months[new Date().getMonth()]

export default function App() {
  const [isDark, setIsDark] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSector, setSelectedSector] = useState('')

  function toggleTheme() {
    setIsDark((prev) => {
      const next = !prev
      if (next) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      return next
    })
  }

  // Apply dark class on first render
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  // Fetch dashboard data
  useEffect(() => {
    setLoading(true)
    fetchDashboard()
      .then(setData)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const allDelayed = data?.delayed_orders ?? []
  const allToday   = data?.today_orders   ?? []
  const filteredDelayed = selectedSector ? allDelayed.filter(o => o.allSetorCods.includes(selectedSector)) : allDelayed
  const filteredToday   = selectedSector ? allToday.filter(o => o.allSetorCods.includes(selectedSector))   : allToday

  const filteredDelayedCount    = data ? filteredDelayed.length : null
  const filteredProductionCount = data ? filteredToday.length : null
  const filteredFinished        = filteredToday.filter(o => o.status === 'Finalizado').length
  const filteredEfficiency      = data
    ? (filteredToday.length > 0 ? Math.round((filteredFinished / filteredToday.length) * 100) : 0)
    : null

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

  return (
    <div className="min-h-screen bg-[var(--th-page)] text-[var(--th-txt-1)] p-3 sm:p-6 lg:p-8">
      <div className="max-w-[1920px] mx-auto space-y-5">
          <Header
            toggleTheme={toggleTheme}
            isDark={isDark}
            selectedSectorName={selectedSector ? (data?.sectors ?? []).find(s => s.cod === selectedSector)?.nome : ''}
          />

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-4 text-red-400 text-sm">
              ⚠ Não foi possível conectar ao servidor de dados: {error}
              <br />
              <span className="opacity-70">Inicie o backend com: <code className="font-mono">uvicorn server.main:app --reload</code></span>
            </div>
          )}

          {/* Sector Selector — sempre estático, sectores ficam vazios enquanto carrega */}
          <SectorSelector
            sectors={data?.sectors ?? []}
            selected={selectedSector}
            onChange={setSelectedSector}
            delayedCount={filteredDelayed.length}
            todayCount={filteredToday.length}
          />

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-5">
            {/* Pedido em Atraso */}
            <MetricCard {...metrics[0]} />
            {/* Pedidos em Produção */}
            <MetricCard {...metrics[1]} />
            {/* Eficiência */}
            <div className="sm:col-span-1">
              <MetricCard {...metrics[2]} />
            </div>
            <div className="sm:col-span-3 lg:col-span-2">
              <ProductionCard
                goal={data?.weekly_data?.[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]?.goal ?? 10000}
                produced={data?.weekly_data?.[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]?.produced ?? 0}
              />
            </div>
          </div>

          {/* Tables */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-5">
            <DelayedOrdersTable orders={filteredDelayed} loading={loading} />
            <ScheduledOrdersTable orders={filteredToday} loading={loading} />
          </div>

          {/* Weekly Chart and Goals */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-5">
            <div className="order-last lg:order-first lg:col-span-2 flex">
              <WeeklyChart data={weeklyData} />
            </div>
            <div className="order-first lg:order-last flex flex-col gap-3 sm:gap-5">
              <GoalCard
                title="Meta Semanal"
                goal={data?.weekly_goal ?? 7000}
                unit="unidades"
                progress={data?.weekly_progress ?? 0}
              />
              <GoalCard
                title={`Meta de ${currentMonth}`}
                goal={data?.monthly_goal ?? 28000}
                unit="unidades"
                progress={data?.monthly_progress ?? 0}
                period={currentMonth}
              />
            </div>
          </div>
        </div>
      </div>
  )
}
