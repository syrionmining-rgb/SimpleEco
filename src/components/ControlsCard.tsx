import { Database } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function ControlsCard() {
  const [lastSync, setLastSync] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLastSync() {
      try {
        const { data } = await supabase
          .from('sync_log')
          .select('ultima_sync')
          .eq('id', 1)
          .single()
        if (data?.ultima_sync) {
          const d = new Date(data.ultima_sync)
          setLastSync(
            d.toLocaleString('pt-BR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit', second: '2-digit',
            })
          )
        }
      } catch { /* sem sync_log ainda */ }
    }
    fetchLastSync()
    const id = setInterval(fetchLastSync, 60_000)
    return () => clearInterval(id)
  }, [])

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
