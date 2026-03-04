import { TrendingUp, TrendingDown } from 'lucide-react'
import type { MonthDayData } from '../types'

interface MonthlyChartProps {
  data: MonthDayData[]
  monthName: string
}

const CHART_HEIGHT = 160

function fmtVal(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export default function MonthlyChart({ data, monthName }: MonthlyChartProps) {
  const pastData = data.filter(d => !d.future)
  const maxVal = Math.max(...data.map(d => d.scheduled), 1)

  function barH(value: number): number {
    return (value / maxVal) * CHART_HEIGHT
  }

  const daysWithData = pastData.filter(d => d.scheduled > 0)
  const avgPct = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((s, d) => s + d.pct, 0) / daysWithData.length)
    : 0
  const isAvgUp = avgPct >= 100

  return (
    <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] p-4 sm:p-6 flex flex-col w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 sm:mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm sm:text-base font-semibold text-[var(--th-txt-4)] uppercase tracking-widest">
            Comparativo — {monthName}
          </h3>
          {daysWithData.length > 0 && (
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs sm:text-sm font-semibold ${isAvgUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              {isAvgUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              Média: {avgPct}%
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs sm:text-sm font-medium text-emerald-400 bg-emerald-500/10">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            Concluído
          </div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs sm:text-sm font-medium text-[var(--th-txt-3)] bg-[var(--th-subtle)]">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--th-meta-dot)' }} />
            Programado
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div className="relative overflow-x-auto">
        <div style={{ minWidth: `${data.length * 20}px` }}>
          {/* Grid lines */}
          <div
            className="absolute inset-0 flex flex-col justify-between pointer-events-none"
            style={{ height: `${CHART_HEIGHT}px` }}
          >
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="w-full border-t border-[var(--th-border-soft)]" />
            ))}
          </div>

          {/* Bars */}
          <div
            className="relative z-10 flex items-end gap-0.5 sm:gap-1"
            style={{ height: `${CHART_HEIGHT}px` }}
          >
            {data.map((d) => {
              const schH  = barH(d.scheduled)
              const doneH = barH(d.done)
              const isUp  = d.pct >= 100

              return (
                <div
                  key={d.day}
                  className={`flex-1 flex items-end justify-center gap-0.5 h-full ${d.future ? 'opacity-20' : ''}`}
                  title={d.future ? `Dia ${d.day} — futuro` : `Dia ${d.day} — Prog: ${fmtVal(d.scheduled)} | Feito: ${fmtVal(d.done)} (${d.pct}%)`}
                >
                  {/* Scheduled bar */}
                  <div
                    className="flex-1 max-w-[6px] rounded-t transition-all"
                    style={{ height: `${schH}px`, backgroundColor: 'var(--th-goal)' }}
                  />
                  {/* Done bar */}
                  {!d.future && (
                    <div
                      className={`flex-1 max-w-[6px] rounded-t transition-all ${d.scheduled === 0 ? 'opacity-0' : isUp ? 'bg-emerald-400' : 'bg-red-500'}`}
                      style={{ height: `${doneH}px` }}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Day labels — show every 5 days */}
          <div className="flex gap-0.5 sm:gap-1 mt-2">
            {data.map((d) => {
              const show = (Number(d.day) === 1) || (Number(d.day) % 5 === 0)
              return (
                <div key={d.day} className="flex-1 flex justify-center">
                  {show ? (
                    <span className="text-[9px] sm:text-[10px] text-[var(--th-txt-4)] font-medium">{d.day}</span>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
