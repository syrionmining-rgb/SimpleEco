import { Target } from 'lucide-react'

interface GoalCardProps {
  title: string
  goal: number
  unit: string
  progress: number
  period?: string
}

export default function GoalCard({ title, goal, unit, progress, period }: GoalCardProps) {
  const percentage = Math.min((progress / goal) * 100, 100)

  return (
    <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] p-6 flex flex-col gap-4 flex-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-[var(--th-subtle)] border border-[var(--th-border)] flex items-center justify-center">
            <Target className="w-6 h-6 text-[var(--th-txt-4)]" aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-semibold text-[var(--th-txt-1)] tracking-widest">{title}</p>
            <p className="text-sm text-[var(--th-txt-4)] uppercase tracking-widest font-medium">{unit}</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-3xl font-bold leading-none">
            <span className="text-[var(--th-txt-4)]">{progress}/</span>
            <span className="bg-gradient-to-r from-[#FF8C00] to-[#D81B60] bg-clip-text text-transparent">{goal}</span><span className="text-lg font-normal text-[var(--th-txt-4)]"> und.</span>
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-base font-semibold text-[var(--th-txt-1)] tracking-widest">Progresso</span>
          <span className="text-sm font-semibold text-[var(--th-txt-3)]">{percentage.toFixed(0)}%</span>
        </div>
        <div className="w-full h-3 rounded-full bg-[var(--th-subtle)] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#FF8C00] to-[#D81B60] transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}
