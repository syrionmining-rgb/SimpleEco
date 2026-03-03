import { useMemo, useState } from 'react'
import { Package, CircleCheck, ArrowUpDown } from 'lucide-react'
import type { TodayOrder } from '../api'

interface Props {
  orders: TodayOrder[]
  loading?: boolean
}

export default function ScheduledOrdersTable({ orders, loading = false }: Props) {
  const [sortKey, setSortKey] = useState<'id' | 'client' | 'colorModel' | 'qty' | 'expDate' | 'status'>('id')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const sortedOrders = useMemo(() => {
    const parseDate = (d?: string | null) => {
      if (!d) return 0
      const [dd, mm, yyyy] = d.split('/')
      const n = Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd))
      return isNaN(n) ? 0 : n
    }
    return [...orders].sort((a, b) => {
      let va: string | number = ''
      let vb: string | number = ''
      switch (sortKey) {
        case 'id': va = a.id; vb = b.id; break
        case 'client': va = a.client; vb = b.client; break
        case 'colorModel': va = a.colorModel; vb = b.colorModel; break
        case 'qty': va = a.qty; vb = b.qty; break
        case 'expDate': va = parseDate(a.expDate); vb = parseDate(b.expDate); break
        case 'status': va = a.status; vb = b.status; break
      }
      const r = va < vb ? -1 : va > vb ? 1 : 0
      return sortDir === 'asc' ? r : -r
    })
  }, [orders, sortDir, sortKey])

  function toggleSort(key: typeof sortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'id' ? 'asc' : 'desc')
    }
  }

  const sortLabel = (label: string) => (
    <span className="inline-flex items-center gap-1 cursor-pointer" aria-hidden="true">
      {label}
      <ArrowUpDown className="w-3.5 h-3.5 text-[var(--th-txt-4)]" />
    </span>
  )

  function PriorityBadge({ value }: { value: number }) {
    // Exibe o badge apenas para prioridade Alta (valor 1)
    if (value !== 1) return null

    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border bg-red-500/15 text-red-400 border-red-500/30">
        ALTA
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg bg-[var(--th-subtle)] border border-[var(--th-border)] flex items-center justify-center">
            <Package className="w-4 h-4 sm:w-6 sm:h-6 text-[var(--th-txt-4)]" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[10px] sm:text-sm text-[var(--th-txt-4)] uppercase tracking-widest font-medium">Programados para Hoje</p>
            <h3 className="text-sm sm:text-lg font-semibold text-[var(--th-txt-1)]">Pedidos de Produção</h3>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-2xl sm:text-4xl font-bold text-black dark:text-white leading-none">{orders.length}</span>
          <span className="text-[10px] sm:text-sm text-[var(--th-txt-3)] mt-1">pedidos</span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden border border-[var(--th-border)] bg-[var(--th-card)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--th-border-soft)]">
                <th onClick={() => toggleSort('id')} className="px-3 sm:px-5 py-3 sm:py-3.5 text-left text-[10px] sm:text-sm font-medium text-[var(--th-txt-4)] uppercase tracking-widest">{sortLabel('Pedido')}</th>
                <th onClick={() => toggleSort('client')} className="px-3 sm:px-5 py-3 sm:py-3.5 text-left text-[10px] sm:text-sm font-medium text-[var(--th-txt-4)] uppercase tracking-widest">{sortLabel('Cliente')}</th>
                <th onClick={() => toggleSort('colorModel')} className="hidden sm:table-cell px-3 sm:px-5 py-3 sm:py-3.5 text-left text-[10px] sm:text-sm font-medium text-[var(--th-txt-4)] uppercase tracking-widest">{sortLabel('Cor / Modelo')}</th>
                <th onClick={() => toggleSort('qty')} className="px-3 sm:px-5 py-3 sm:py-3.5 text-left text-[10px] sm:text-sm font-medium text-[var(--th-txt-4)] uppercase tracking-widest">{sortLabel('Und')}</th>
                <th onClick={() => toggleSort('expDate')} className="hidden md:table-cell px-3 sm:px-5 py-3 sm:py-3.5 text-left text-[10px] sm:text-sm font-medium text-[var(--th-txt-4)] uppercase tracking-widest whitespace-nowrap">{sortLabel('Data Exp.')}</th>
                <th onClick={() => toggleSort('status')} className="px-3 sm:px-5 py-3 sm:py-3.5 text-left text-[10px] sm:text-sm font-medium text-[var(--th-txt-4)] uppercase tracking-widest">{sortLabel('Status')}</th>
              </tr>
            </thead>
            <tbody>
              {loading || sortedOrders.length === 0
                ? Array.from({ length: 10 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className={`border-b border-[var(--th-border-soft)]${idx >= 2 ? ' hidden sm:table-row' : ''}`}>
                    <td className="px-3 sm:px-5 py-2.5 sm:py-3.5"><div className="h-4 w-12 sm:w-16 rounded bg-[var(--th-subtle)] animate-pulse" /></td>
                    <td className="px-3 sm:px-5 py-2.5 sm:py-3.5"><div className="h-4 w-24 sm:w-32 rounded bg-[var(--th-subtle)] animate-pulse" /></td>
                    <td className="hidden sm:table-cell px-3 sm:px-5 py-2.5 sm:py-3.5"><div className="h-4 w-28 sm:w-36 rounded bg-[var(--th-subtle)] animate-pulse" /></td>
                    <td className="px-3 sm:px-5 py-2.5 sm:py-3.5"><div className="h-4 w-10 sm:w-12 rounded bg-[var(--th-subtle)] animate-pulse" /></td>
                    <td className="hidden md:table-cell px-3 sm:px-5 py-2.5 sm:py-3.5"><div className="h-4 w-16 sm:w-20 rounded bg-[var(--th-subtle)] animate-pulse" /></td>
                    <td className="px-3 sm:px-5 py-2.5 sm:py-3.5"><div className="h-6 w-20 sm:w-24 rounded bg-[var(--th-subtle)] animate-pulse" /></td>
                  </tr>
                ))
                : sortedOrders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-[var(--th-border-soft)] hover:bg-[var(--th-hover)] transition-colors"
                  >
                    <td className="px-3 sm:px-5 py-2.5 sm:py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-medium text-[var(--th-txt-2)]">{o.id}</span>
                        <PriorityBadge value={o.priority} />
                      </div>
                    </td>
                    <td className="px-3 sm:px-5 py-2.5 sm:py-3.5 text-xs sm:text-sm text-[var(--th-txt-3)]">{o.client}</td>
                    <td className="hidden sm:table-cell px-3 sm:px-5 py-2.5 sm:py-3.5 text-xs sm:text-sm text-[var(--th-txt-3)]">{o.colorModel}</td>
                    <td className="px-3 sm:px-5 py-2.5 sm:py-3.5 text-xs sm:text-sm font-semibold text-[var(--th-txt-1)]">{o.qty}</td>
                    <td className="hidden md:table-cell px-3 sm:px-5 py-2.5 sm:py-3.5 text-xs sm:text-sm text-[var(--th-txt-3)] whitespace-nowrap">{o.expDate}</td>
                    <td className="px-3 sm:px-5 py-2.5 sm:py-3.5">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs sm:text-sm font-medium border"
                        style={o.status === 'Finalizado'
                          ? { backgroundColor: 'var(--th-fin-bg)', color: 'var(--th-fin-txt)', borderColor: 'var(--th-fin-border)' }
                          : { backgroundColor: 'var(--th-subtle)', color: 'var(--th-txt-3)', borderColor: 'var(--th-border)' }
                        }
                      >
                        <CircleCheck className="w-3 h-3" aria-hidden="true" />
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
