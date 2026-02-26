import { useState, useEffect } from 'react'
import { Calendar, Sun, Moon } from 'lucide-react'

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

interface HeaderProps {
  toggleTheme: () => void
  isDark: boolean
}

export default function Header({ toggleTheme, isDark }: HeaderProps) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="flex items-center justify-between pb-6 border-b border-[var(--th-border)]">
      <div>
        <h1 className="text-3xl font-bold">
          <span className="text-[var(--th-txt-1)]">Simple&Eco</span> <span className="bg-gradient-to-r from-[#FF8C00] to-[#D81B60] bg-clip-text text-transparent">Produção</span>
        </h1>
        <p className="text-lg text-[var(--th-txt-3)] mt-2 flex items-center gap-2">
          <Calendar className="w-5 h-5" aria-hidden="true" />
          {formatDate(now)}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-3 h-3 rounded-full bg-[#00F6A0] animate-pulse" />

        {/* Clock + Theme Toggle */}
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm text-[var(--th-txt-4)] uppercase tracking-widest font-medium">Horário Atual</p>
            <span className="text-3xl font-bold text-[var(--th-txt-1)] tracking-widest font-mono">{formatTime(now)}</span>
          </div>
          <button
            onClick={toggleTheme}
            className="w-12 h-12 rounded-lg bg-[var(--th-subtle)] border border-[var(--th-border)] flex items-center justify-center shrink-0 transition-colors hover:bg-[var(--th-hover)]"
            aria-label="Alternar tema"
          >
            {isDark
              ? <Sun className="w-6 h-6 text-[var(--th-txt-4)]" />
              : <Moon className="w-6 h-6 text-[var(--th-txt-4)]" />
            }
          </button>
        </div>
      </div>
    </header>
  )
}
