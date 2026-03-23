import { Target } from 'lucide-react'

interface GoalCardProps {
  title: string
  goal: number | null
  unit: string
  progress: number
  period?: string
}

export default function GoalCard({ title, goal, unit, progress }: GoalCardProps) {
  const hasGoal = goal !== null && goal > 0
  const percentage = hasGoal ? Math.min((progress / goal) * 100, 100) : 0
  const goalLabel = hasGoal ? String(goal) : 'N/D'
  const progressLabel = hasGoal ? `${percentage.toFixed(0)}%` : 'N/D'

  return (
    <>
      {/* Mobile layout */}
      <div className="flex sm:hidden rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] px-4 py-3 flex-col gap-2 flex-1">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--th-subtle)] border border-[var(--th-border)] flex items-center justify-center shrink-0">
            <Target className="w-4 h-4 text-[var(--th-txt-4)]" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--th-txt-1)] tracking-widest leading-tight truncate">{title}</p>
            <p className="text-[11px] text-[var(--th-txt-4)] uppercase tracking-widest font-medium">{unit}</p>
          </div>
          <div className="flex items-baseline gap-0.5 shrink-0">
            {hasGoal ? (
              <>
                <span className="text-2xl font-bold leading-none text-[var(--th-txt-4)]">{progress}/</span>
                <span className="text-2xl font-bold leading-none bg-gradient-to-r from-[#FF8C00] to-[#D81B60] bg-clip-text text-transparent">{goalLabel}</span>
                <span className="text-xs font-normal text-[var(--th-txt-4)]"> und.</span>
              </>
            ) : (
              <span className="text-2xl font-bold leading-none text-[var(--th-txt-4)]">N/D</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-[var(--th-subtle)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FF8C00] to-[#D81B60] transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-[var(--th-txt-3)] shrink-0">{progressLabel}</span>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden sm:flex rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] p-4 sm:p-6 flex-col gap-3 sm:gap-4 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[var(--th-subtle)] border border-[var(--th-border)] flex items-center justify-center">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--th-txt-4)]" aria-hidden="true" />
            </div>
            <div>
              <p className="text-base sm:text-lg font-semibold text-[var(--th-txt-1)] tracking-widest">{title}</p>
              <p className="text-xs sm:text-sm text-[var(--th-txt-4)] uppercase tracking-widest font-medium">{unit}</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <p className="text-xl sm:text-3xl font-bold leading-none">
              {hasGoal ? (
                <>
                  <span className="text-[var(--th-txt-4)]">{progress}/</span>
                  <span className="bg-gradient-to-r from-[#FF8C00] to-[#D81B60] bg-clip-text text-transparent">{goalLabel}</span>
                  <span className="text-sm sm:text-lg font-normal text-[var(--th-txt-4)]"> und.</span>
                </>
              ) : (
                <span className="text-[var(--th-txt-4)]">N/D</span>
              )}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm sm:text-base font-semibold text-[var(--th-txt-1)] tracking-widest">Progresso</span>
            <span className="text-xs sm:text-sm font-semibold text-[var(--th-txt-3)]">{progressLabel}</span>
          </div>
          <div className="w-full h-3 rounded-full bg-[var(--th-subtle)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FF8C00] to-[#D81B60] transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    </>
  )
}
