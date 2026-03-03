import { ChevronDown, Factory, X } from 'lucide-react'
import type { Sector } from '../api'

interface SectorSelectorProps {
  sectors: Sector[]
  selected: string        // '' = todos
  onChange: (cod: string) => void
  delayedCount: number
  todayCount: number
}

export default function SectorSelector({
  sectors = [],
  selected,
  onChange,
  delayedCount,
  todayCount,
}: SectorSelectorProps) {
  return (
    <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] px-4 sm:px-6 py-3 sm:py-4 sm:w-full">

      {/* ── MOBILE: linha única ── */}
      <div className="flex sm:hidden items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[var(--th-subtle)] border border-[var(--th-border)] flex items-center justify-center shrink-0">
          <Factory className="w-4 h-4 text-[var(--th-txt-4)]" />
        </div>
        <div className="shrink-0">
          <p className="text-sm font-semibold text-[var(--th-txt-1)]">Área de Produção</p>
          <p className="text-[10px] text-[var(--th-txt-4)] uppercase tracking-widest font-medium">Filtro de setor</p>
        </div>
        <div className="relative flex-1">
          <select
            value={selected}
            onChange={e => onChange(e.target.value)}
            className={[
              'w-full appearance-none pl-4 pr-10 py-2.5 rounded-xl border text-sm font-semibold cursor-pointer transition-all',
              'bg-[var(--th-card)] text-[var(--th-txt-1)]',
              selected
                ? 'border-[#FF8C00]/60 shadow-[0_0_0_3px_rgba(255,140,0,0.12)]'
                : 'border-[var(--th-border)]',
              'focus:outline-none focus:border-[#FF8C00]/80 focus:shadow-[0_0_0_3px_rgba(255,140,0,0.2)]',
            ].join(' ')}
            style={{ color: 'var(--th-txt-1)', backgroundColor: 'var(--th-card)' }}
          >
            <option value="">Todos</option>
            {sectors.map(s => (
              <option key={s.cod} value={s.cod}>{s.nome}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--th-txt-4)]" />
        </div>
      </div>

      {/* ── DESKTOP (sm+): linha única ── */}
      <div className="hidden sm:flex items-center gap-4 w-full">
        <div className="w-12 h-12 rounded-lg bg-[var(--th-subtle)] border border-[var(--th-border)] flex items-center justify-center shrink-0">
          <Factory className="w-6 h-6 text-[var(--th-txt-4)]" />
        </div>
        <span className="text-sm font-medium text-[var(--th-txt-4)] uppercase tracking-widest shrink-0">
          Área de Produção
        </span>
        <div className="h-5 w-px bg-[var(--th-border)] shrink-0" />
        <div className="relative">
          <select
            value={selected}
            onChange={e => onChange(e.target.value)}
            className={[
              'appearance-none pl-4 pr-10 py-2.5 rounded-xl border text-sm font-semibold cursor-pointer transition-all shadow-sm',
              'bg-[var(--th-card)] text-[var(--th-txt-1)] hover:border-[var(--th-border-soft)] hover:bg-[var(--th-hover)]',
              selected
                ? 'border-[#FF8C00]/60 shadow-[0_0_0_3px_rgba(255,140,0,0.12)]'
                : 'border-[var(--th-border)]',
              'focus:outline-none focus:border-[#FF8C00]/80 focus:shadow-[0_0_0_3px_rgba(255,140,0,0.2)]',
            ].join(' ')}
            style={{ color: 'var(--th-txt-1)', backgroundColor: 'var(--th-card)' }}
          >
            <option value="">Todos</option>
            {sectors.map(s => (
              <option key={s.cod} value={s.cod}>{s.nome}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--th-txt-4)]" />
        </div>
        <button
          onClick={() => onChange('')}
          aria-label="Limpar filtro"
          disabled={!selected}
          className={[
            'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border transition-colors',
            selected
              ? 'border-[var(--th-border)] bg-[var(--th-subtle)] text-[var(--th-txt-4)] hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 cursor-pointer'
              : 'border-transparent bg-transparent text-transparent pointer-events-none',
          ].join(' ')}
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-4">
          <div className="h-5 w-px bg-[var(--th-border)]" />
          <span className="text-sm font-medium text-[var(--th-txt-4)] uppercase tracking-widest">
            Em atraso: <span className="text-red-400 font-semibold">{delayedCount}</span>
          </span>
          <span className="text-sm font-medium text-[var(--th-txt-4)] uppercase tracking-widest">
            Programado hoje: <span className="text-[var(--th-txt-1)] font-semibold">{todayCount}</span>
          </span>
        </div>
      </div>

    </div>
  )
}
