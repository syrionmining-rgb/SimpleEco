import { TrendingUp, TrendingDown } from 'lucide-react'
import type { DayData } from '../api'

interface WeeklyChartProps {
  data: DayData[]
}

const CHART_HEIGHT = 160

function fmtVal(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export default function WeeklyChart({ data }: WeeklyChartProps) {
  const maxVal = Math.max(...data.flatMap(d => [d.produced, d.goal]), 1)

  function getBarHeight(value: number): number {
    return (value / maxVal) * CHART_HEIGHT
  }

  const avgPct = Math.round(data.reduce((sum, d) => sum + d.pct, 0) / data.length)
  const isAvgUp = avgPct >= 100

  return (
    <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] p-4 sm:p-6 flex flex-col w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 sm:mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm sm:text-base font-semibold text-[var(--th-txt-4)] uppercase tracking-widest">
            Comparativo Semanal
          </h3>
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs sm:text-sm font-semibold ${isAvgUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {isAvgUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            Média: {avgPct}%
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs sm:text-sm font-medium text-emerald-400 bg-emerald-500/10">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            Acima
          </div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs sm:text-sm font-medium text-red-400 bg-red-500/10">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            Abaixo
          </div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs sm:text-sm font-medium text-[var(--th-txt-3)] bg-[var(--th-subtle)]">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--th-meta-dot)' }} />
            Meta
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div className="relative">
        {/* Horizontal grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ height: `${CHART_HEIGHT}px` }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-full border-t border-[var(--th-border-soft)]" />
          ))}
        </div>

        {/* Bars */}
        <div className="relative z-10 grid grid-cols-7 gap-3" style={{ height: `${CHART_HEIGHT}px`, alignItems: 'flex-end' }}>
          {data.map((d) => {
            const goalH = getBarHeight(d.goal)
            const prodH = getBarHeight(d.produced)
            const isUp = d.pct >= 100

            return (
              <div key={d.day} className="flex items-end justify-center gap-1.5 h-full">
                {/* Goal bar */}
                <div
                  className="w-4 rounded-t transition-all"
                  style={{ height: `${goalH}px`, backgroundColor: 'var(--th-goal)' }}
                />
                {/* Produced bar */}
                <div
                  className={`w-4 rounded-t transition-all ${isUp ? 'bg-emerald-400' : 'bg-red-500'}`}
                  style={{ height: `${prodH}px` }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Labels */}
      <div className="grid grid-cols-7 gap-1 sm:gap-3 mt-3 sm:mt-4">
        {data.map((d) => {
          const isUp = d.pct >= 100
          return (
            <div key={d.day} className="flex flex-col items-center gap-0.5 sm:gap-1.5">
              <p className="text-xs sm:text-sm text-[var(--th-txt-4)] font-medium">{d.day}</p>
              {isUp ? (
                <div className="inline-flex items-center gap-0.5 sm:gap-1 px-1 sm:px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400">
                  <TrendingUp className="w-3 h-3" />
                  <span className="hidden sm:inline">{d.pct}%</span>
                  <span className="sm:hidden">{d.pct}%</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-0.5 sm:gap-1 px-1 sm:px-2.5 py-0.5 rounded-md text-xs font-semibold bg-red-500/10 text-red-400">
                  <TrendingDown className="w-3 h-3" />
                  <span>{d.pct}%</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
