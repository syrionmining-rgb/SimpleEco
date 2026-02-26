import { ElementType } from 'react'
import { TrendingUp, TrendingDown, TriangleAlert } from 'lucide-react'

interface MetricCardProps {
  title: string
  subtitle?: string
  value: string
  unit: string
  icon: ElementType
  gradient?: boolean
}

export default function MetricCard({
  title,
  subtitle,
  value,
  unit,
  icon: Icon,
  gradient = false,
}: MetricCardProps) {
  const numericValue = parseFloat(value)

  const valueClass = Icon === TriangleAlert ? 'text-red-400' : 'text-black dark:text-white'
  const valueStyle = {}

  return (
    <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] px-6 py-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold text-[var(--th-txt-1)] tracking-widest">{title}</p>
          {subtitle && <p className="text-sm text-[var(--th-txt-4)] uppercase tracking-widest font-medium mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-lg border flex items-center justify-center shrink-0 ${
          Icon === TriangleAlert
            ? 'bg-red-500/10 border-red-500/20'
            : 'bg-[var(--th-subtle)] border-[var(--th-border)]'
        }`}>
          {gradient
            ? numericValue >= 100
              ? <TrendingUp className="w-6 h-6 text-[var(--th-txt-4)]" aria-hidden="true" />
              : <TrendingDown className="w-6 h-6 text-[var(--th-txt-4)]" aria-hidden="true" />
            : <Icon className={`w-6 h-6 ${Icon === TriangleAlert ? 'text-red-400' : 'text-[var(--th-txt-4)]'}`} aria-hidden="true" />
          }
        </div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-4xl font-bold leading-none ${valueClass}`} style={valueStyle}>{value}</span>
        <span className="text-lg text-[var(--th-txt-3)]">{unit}</span>
      </div>
    </div>
  )
}
