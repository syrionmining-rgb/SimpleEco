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
    <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)]">

      {/* ── MOBILE: linha horizontal (ícone | título | valor) ── */}
      <div className="flex sm:hidden items-center gap-3 px-4 py-3">
        {/* Ícone */}
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
          Icon === TriangleAlert
            ? 'bg-red-500/10 border-red-500/20'
            : 'bg-[var(--th-subtle)] border-[var(--th-border)]'
        }`}>
          {gradient
            ? numericValue >= 100
              ? <TrendingUp className="w-4 h-4 text-[var(--th-txt-4)]" aria-hidden="true" />
              : <TrendingDown className="w-4 h-4 text-[var(--th-txt-4)]" aria-hidden="true" />
            : <Icon className={`w-4 h-4 ${Icon === TriangleAlert ? 'text-red-400' : 'text-[var(--th-txt-4)]'}`} aria-hidden="true" />
          }
        </div>
        {/* Título */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--th-txt-1)] truncate">{title}</p>
          {subtitle && <p className="text-[10px] text-[var(--th-txt-4)] uppercase tracking-widest font-medium truncate">{subtitle}</p>}
        </div>
        {/* Valor: número em cima, unidade embaixo — alinhados à direita */}
        <div className="flex flex-col items-end shrink-0">
          <span className={`text-2xl font-bold leading-none ${valueClass}`}>{value}</span>
          {unit && <span className="text-xs text-[var(--th-txt-3)] mt-0.5">{unit}</span>}
        </div>
      </div>

      {/* ── DESKTOP (sm+): card vertical ── */}
      <div className="hidden sm:flex flex-col gap-4 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-[var(--th-txt-1)] tracking-widest truncate">{title}</p>
            {subtitle && <p className="text-sm text-[var(--th-txt-4)] uppercase tracking-widest font-medium mt-0.5 truncate">{subtitle}</p>}
          </div>
          <div className={`w-12 h-12 rounded-lg border flex items-center justify-center shrink-0 ml-1 ${
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

    </div>
  )
}
