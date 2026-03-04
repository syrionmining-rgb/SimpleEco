import { Database } from 'lucide-react'

interface ControlsCardProps {
  lastSync: string | null
}

export default function ControlsCard({ lastSync }: ControlsCardProps) {
  return (
    <div className="hidden sm:flex items-center gap-3 rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] px-4 py-3 sm:py-4 shrink-0">
      <div className="w-12 h-12 rounded-lg bg-[var(--th-subtle)] border border-[var(--th-border)] flex items-center justify-center shrink-0">
        <Database className="w-6 h-6 text-[var(--th-txt-4)]" aria-hidden="true" />
      </div>
      <div className="flex flex-col leading-snug">
        <span className="text-sm font-medium text-[var(--th-txt-4)] uppercase tracking-widest whitespace-nowrap">Banco atualizado</span>
        <span className="text-sm font-semibold text-[var(--th-txt-1)] whitespace-nowrap">{lastSync ?? '—'}</span>
      </div>
    </div>
  )
}
