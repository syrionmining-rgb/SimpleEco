import { useState, useEffect } from 'react'
import { Calendar, Sun, Moon, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

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
  selectedSectorName?: string
}

export default function Header({ toggleTheme, isDark, selectedSectorName }: HeaderProps) {
  const [now, setNow] = useState(new Date())
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="pb-4 sm:pb-6 border-b border-[var(--th-border)] relative">

      {/* ── MOBILE layout ── */}
      <div className="flex sm:hidden items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            <span className="text-[var(--th-txt-1)]">Simple&Eco</span>{' '}
            <span className="bg-gradient-to-r from-[#FF8C00] to-[#D81B60] bg-clip-text text-transparent">Produção</span>
          </h1>
          <p className="text-sm text-[var(--th-txt-3)] mt-1 flex items-center gap-1.5">
            <Calendar className="w-4 h-4" aria-hidden="true" />
            {formatDate(now)}
          </p>
        </div>
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-lg bg-[var(--th-subtle)] border border-[var(--th-border)] flex items-center justify-center shrink-0 transition-colors hover:bg-[var(--th-hover)]"
          aria-label="Alternar tema"
        >
          {isDark ? <Sun className="w-5 h-5 text-[var(--th-txt-4)]" /> : <Moon className="w-5 h-5 text-[var(--th-txt-4)]" />}
        </button>
        <button
          onClick={handleLogout}
          className="w-10 h-10 rounded-lg bg-[var(--th-subtle)] border border-[var(--th-border)] flex items-center justify-center shrink-0 transition-colors hover:bg-red-500/10 hover:border-red-500/30"
          aria-label="Sair"
        >
          <LogOut className="w-5 h-5 text-[var(--th-txt-4)] hover:text-red-400" />
        </button>
      </div>

      {/* ── DESKTOP layout ── */}
      <div className="hidden sm:flex items-center justify-between relative">
        <div>
          <h1 className="text-3xl font-bold">
            <span className="text-[var(--th-txt-1)]">Simple&Eco</span>{' '}
            <span className="bg-gradient-to-r from-[#FF8C00] to-[#D81B60] bg-clip-text text-transparent">Produção</span>
          </h1>
          <p className="text-base text-[var(--th-txt-3)] mt-2 flex items-center gap-2">
            <Calendar className="w-5 h-5" aria-hidden="true" />
            {formatDate(now)}
          </p>
        </div>

        {/* Center badge — only when sector selected */}
        {selectedSectorName && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
            <span className="px-3 py-1 rounded-lg bg-[var(--th-subtle)] border border-[var(--th-border)] text-[var(--th-txt-4)] font-semibold text-sm uppercase tracking-widest">
              {selectedSectorName}
            </span>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="h-12 px-4 rounded-lg bg-[var(--th-subtle)] border border-[var(--th-border)] flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-[var(--th-txt-1)] tracking-widest font-mono">{formatTime(now)}</span>
          </div>
          <button
            onClick={toggleTheme}
            className="w-12 h-12 rounded-lg bg-[var(--th-subtle)] border border-[var(--th-border)] flex items-center justify-center shrink-0 transition-colors hover:bg-[var(--th-hover)]"
            aria-label="Alternar tema"
          >
            {isDark ? <Sun className="w-6 h-6 text-[var(--th-txt-4)]" /> : <Moon className="w-6 h-6 text-[var(--th-txt-4)]" />}
          </button>
          <button
            onClick={handleLogout}
            className="w-12 h-12 rounded-lg bg-[var(--th-subtle)] border border-[var(--th-border)] flex items-center justify-center shrink-0 transition-colors hover:bg-red-500/10 hover:border-red-500/30"
            aria-label="Sair"
          >
            <LogOut className="w-6 h-6 text-[var(--th-txt-4)]" />
          </button>
        </div>
      </div>

    </header>
  )
}
