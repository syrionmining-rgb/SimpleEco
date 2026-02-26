import { useState, useEffect } from 'react'
import Header from './components/Header'
import MetricCard from './components/MetricCard'
import ProductionCard from './components/ProductionCard'
import DelayedOrdersTable from './components/DelayedOrdersTable'
import ScheduledOrdersTable from './components/ScheduledOrdersTable'
import WeeklyChart from './components/WeeklyChart'
import GoalCard from './components/GoalCard'
import {
  TriangleAlert,
  Package,
  TrendingUp,
} from 'lucide-react'

const metrics = [
  {
    title: 'Pedidos',
    subtitle: 'em Atraso',
    value: '8',
    unit: 'pedidos',
    icon: TriangleAlert,
  },
  {
    title: 'Pedidos',
    subtitle: 'em Produção',
    value: '24',
    unit: 'pedidos',
    icon: Package,
  },
  {
    title: 'Eficiência',
    subtitle: 'Performance Diária',
    value: '87.6%',
    unit: '',
    icon: TrendingUp,
    gradient: true,
  },
]

const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const currentMonth = months[new Date().getMonth()]

const weeklyData = [
  { day: 'SEG', produced: 880, goal: 1000, pct: 88 },
  { day: 'TER', produced: 1080, goal: 1000, pct: 108 },
  { day: 'QUA', produced: 950, goal: 1000, pct: 95 },
  { day: 'QUI', produced: 850, goal: 1000, pct: 85 },
  { day: 'SEX', produced: 780, goal: 1000, pct: 78 },
  { day: 'SAB', produced: 1050, goal: 1000, pct: 105 },
  { day: 'DOM', produced: 810, goal: 1000, pct: 81 },
]

export default function App() {
  const [isDark, setIsDark] = useState(true)

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

  return (
    <div className="min-h-screen bg-[var(--th-page)] text-[var(--th-txt-1)] p-8">
      <div className="max-w-[1920px] mx-auto space-y-5">
          <Header toggleTheme={toggleTheme} isDark={isDark} />

          {/* Metric Cards */}
          <div className="grid grid-cols-5 gap-5">
            {metrics.map((m) => (
              <MetricCard key={m.title} {...m} />
            ))}
            <ProductionCard goal={1000} produced={876} />
          </div>

          {/* Tables */}
          <div className="grid grid-cols-2 gap-5">
            <DelayedOrdersTable />
            <ScheduledOrdersTable />
          </div>

          {/* Weekly Chart and Goals */}
          <div className="grid grid-cols-3 gap-5">
            <div className="col-span-2 flex">
              <WeeklyChart data={weeklyData} />
            </div>
            <div className="flex flex-col gap-5">
              <GoalCard title="Meta Semanal" goal={7000} unit="unidades" progress={6645} />
              <GoalCard title={`Meta de ${currentMonth}`} goal={28000} unit="unidades" progress={18500} period={currentMonth} />
            </div>
          </div>
        </div>
      </div>
  )
}
