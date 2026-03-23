import { useState } from 'react'
import { ChevronDown, Factory, X } from 'lucide-react'
import type { Sector } from '../types'

interface SectorSelectorProps {
  sectors: Sector[]
  selected: string
  onChange: (cod: string) => void
  allValue: string
  delayedCount: number
  todayCount: number
}

export default function SectorSelector({
  sectors = [],
  selected,
  onChange,
  allValue,
  delayedCount,
  todayCount,
}: SectorSelectorProps) {
  const [open, setOpen] = useState(false)
  const selectedLabel = selected === allValue ? 'Todos' : (sectors.find(s => s.cod === selected)?.nome ?? 'Todos')
  const isFiltered = selected !== allValue

  function select(cod: string) {
    onChange(cod)
    setOpen(false)
  }

  const options = [{ cod: allValue, nome: 'Todos' }, ...sectors]

  const triggerClass = [
    'flex items-center justify-between gap-2 pl-4 pr-3 py-2.5 rounded-xl border text-sm font-semibold transition-all',
    'bg-[var(--th-card)] text-[var(--th-txt-1)]',
    open || isFiltered
      ? 'border-[#FF8C00]/60 shadow-[0_0_0_3px_rgba(255,140,0,0.12)]'
      : 'border-[var(--th-border)] hover:border-orange-500/30',
  ].join(' ')

  return (
    <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] px-4 sm:px-6 py-3 sm:py-4 sm:w-full">

      {/* ── MOBILE ── */}
      <div className="flex sm:hidden items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[var(--th-subtle)] border border-[var(--th-border)] flex items-center justify-center shrink-0">
          <Factory className="w-4 h-4 text-[var(--th-txt-4)]" />
        </div>
        <div className="shrink-0">
          <p className="text-sm font-semibold text-[var(--th-txt-1)]">Área de Produção</p>
          <p className="text-[11px] text-[var(--th-txt-4)] uppercase tracking-widest font-medium">Filtro de setor</p>
        </div>
        <div className="relative flex-1">
          <button type="button" onClick={() => setOpen(o => !o)} className={triggerClass + ' w-full'}>
            <span>{selectedLabel}</span>
            <ChevronDown className={`w-4 h-4 text-[var(--th-txt-4)] transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] shadow-lg overflow-hidden">
              {options.map(s => (
                <button
                  key={s.cod}
                  type="button"
                  onClick={() => select(s.cod)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[var(--th-hover)] ${
                    selected === s.cod ? 'text-orange-400 bg-orange-500/8 font-semibold' : 'text-[var(--th-txt-1)]'
                  }`}
                >
                  {s.nome}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden sm:flex items-center gap-4 w-full">
        <div className="w-12 h-12 rounded-lg bg-[var(--th-subtle)] border border-[var(--th-border)] flex items-center justify-center shrink-0">
          <Factory className="w-6 h-6 text-[var(--th-txt-4)]" />
        </div>
        <span className="text-sm font-medium text-[var(--th-txt-4)] uppercase tracking-widest shrink-0">
          Área de Produção
        </span>
        <div className="h-5 w-px bg-[var(--th-border)] shrink-0" />
        <div className="relative">
          <button type="button" onClick={() => setOpen(o => !o)} className={triggerClass}>
            <span>{selectedLabel}</span>
            <ChevronDown className={`w-4 h-4 text-[var(--th-txt-4)] transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="absolute z-50 top-full mt-1 left-0 min-w-full rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] shadow-lg overflow-hidden">
              {options.map(s => (
                <button
                  key={s.cod}
                  type="button"
                  onClick={() => select(s.cod)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[var(--th-hover)] ${
                    selected === s.cod ? 'text-orange-400 bg-orange-500/8 font-semibold' : 'text-[var(--th-txt-1)]'
                  }`}
                >
                  {s.nome}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => onChange(allValue)}
          aria-label="Limpar filtro"
          disabled={!isFiltered}
          className={[
            'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border transition-colors',
            isFiltered
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
