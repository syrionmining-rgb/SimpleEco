import { Target } from 'lucide-react'

interface ProductionCardProps {
  goal: number
  produced: number
}

export default function ProductionCard({ goal, produced }: ProductionCardProps) {
  const pct = Math.min((produced / goal) * 100, 100)

  return (
    <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] px-6 py-5 flex flex-col justify-between gap-4 col-span-2">
      {/* Top row */}
      <div className="flex items-center justify-between">
        {/* Meta */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[var(--th-subtle)] border border-[var(--th-border)] flex items-center justify-center">
            <Target className="w-6 h-6 text-[var(--th-txt-4)]" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--th-txt-1)] tracking-widest">Meta Diária</h3>
            <p className="text-sm text-[var(--th-txt-4)] uppercase tracking-widest font-medium mt-0.5">Indicador de Produção</p>
          </div>
        </div>

        {/* Values */}
        <div className="flex flex-col items-end">
          <p className="text-4xl font-bold leading-none">
            <span className="text-[var(--th-txt-4)]">{produced}/</span>
            <span className="bg-gradient-to-r from-[#FF8C00] to-[#D81B60] bg-clip-text text-transparent">{goal}</span><span className="text-lg font-normal text-[var(--th-txt-4)]"> und.</span>
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-base font-semibold text-[var(--th-txt-1)] tracking-widest">Progresso diário</span>
          <span className="text-sm font-semibold text-[var(--th-txt-2)]">{pct.toFixed(1)}%</span>
        </div>
        <div className="w-full h-3 rounded-full bg-[var(--th-subtle)] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#FF8C00] to-[#D81B60] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
