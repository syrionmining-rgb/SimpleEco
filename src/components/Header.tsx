import { useState, useEffect } from 'react'
import { Calendar, Clock, Sun, Moon, LogOut, Database, Menu, X, LayoutDashboard, TriangleAlert, ClipboardList, BarChart2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

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

const navItems = [
  { label: 'Visão Geral',  icon: LayoutDashboard, href: '#overview'     },
  { label: 'Atrasados',    icon: TriangleAlert,   href: '#atrasados'    },
  { label: 'Programados',  icon: ClipboardList,    href: '#programados'  },
  { label: 'Gráficos',     icon: BarChart2,        href: '#graficos'     },
]

interface HeaderProps {
  toggleTheme: () => void
  isDark: boolean
}

export default function Header({ toggleTheme, isDark }: HeaderProps) {
  const [now, setNow] = useState(new Date())
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function scrollTo(href: string) {
    setMenuOpen(false)
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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
    } catch {
      // sem sync_log ainda
    }
  }

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    fetchLastSync()
    const id = setInterval(fetchLastSync, 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      {/* ── MOBILE: fixed top header ── */}
      <header className="sm:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--th-card)]/60 backdrop-blur-xl shadow-[0_1px_0_var(--th-border)]">
        <div className="px-4 py-3">
          {/* Bar: logo + hamburger */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold leading-tight">
              <span className="text-[var(--th-txt-1)]">Simple&Eco</span>{' '}
              <span className="bg-gradient-to-r from-[#FF8C00] to-[#D81B60] bg-clip-text text-transparent">Produção</span>
            </h1>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="p-2 text-[var(--th-txt-1)]"
              aria-label="Menu"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Expanded menu */}
          {menuOpen && (
            <nav className="mt-4 pt-4 border-t border-[var(--th-border)]">
              {/* Nav links */}
              <div className="flex flex-col gap-1 mb-4">
                {navItems.map(({ label, icon: Icon, href }) => (
                  <button
                    key={href}
                    onClick={() => scrollTo(href)}
                    className="w-full text-left p-2 rounded-lg flex items-center gap-3 text-[var(--th-txt-3)] hover:text-[var(--th-txt-1)] hover:bg-[var(--th-hover)] transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>

              {/* Info + actions */}
              <div className="border-t border-[var(--th-border)] pt-4 flex flex-col gap-1">
                {/* DB sync */}
                <div className="p-2 flex items-center gap-3 text-[var(--th-txt-3)]">
                  <Database className="w-4 h-4 shrink-0" />
                  <div className="flex flex-col leading-snug">
                    <span className="text-[10px] uppercase tracking-widest font-medium">Banco atualizado</span>
                    <span className="text-sm font-semibold text-[var(--th-txt-1)] font-mono">{lastSync ?? '—'}</span>
                  </div>
                </div>
                {/* Clock */}
                <div className="p-2 flex items-center gap-3 text-[var(--th-txt-3)]">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-semibold text-[var(--th-txt-1)] font-mono tracking-widest">{formatTime(now)}</span>
                </div>
                {/* Theme */}
                <button
                  onClick={() => { toggleTheme(); setMenuOpen(false) }}
                  className="p-2 rounded-lg flex items-center gap-3 text-[var(--th-txt-3)] hover:text-[var(--th-txt-1)] hover:bg-[var(--th-hover)] transition-colors"
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span className="text-sm">{isDark ? 'Tema claro' : 'Tema escuro'}</span>
                </button>
                {/* Logout */}
                <button
                  onClick={() => { handleLogout(); setMenuOpen(false) }}
                  className="p-2 rounded-lg flex items-center gap-3 text-[var(--th-txt-3)] hover:bg-[var(--th-hover)] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Sair</span>
                </button>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* ── DESKTOP: inline header ── */}
      <header className="hidden sm:block pb-5 sm:pb-6 border-b border-[var(--th-border)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold">
              <span className="text-[var(--th-txt-1)]">Simple&Eco</span>{' '}
              <span className="bg-gradient-to-r from-[#FF8C00] to-[#D81B60] bg-clip-text text-transparent">Produção</span>
            </h1>
            <p className="text-base text-[var(--th-txt-3)] flex items-center gap-2">
              <Calendar className="w-5 h-5" aria-hidden="true" />
              {formatDate(now)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 rounded-xl border border-[var(--th-border)] bg-[var(--th-card)] px-4 py-3 shrink-0">
              <Clock className="w-5 h-5 text-[var(--th-txt-4)] shrink-0" aria-hidden="true" />
              <span className="text-sm font-bold text-[var(--th-txt-1)] tracking-widest font-mono">{formatTime(now)}</span>
            </div>
            <button
              onClick={toggleTheme}
              className="w-11 h-11 rounded-lg bg-[var(--th-card)] border border-[var(--th-border)] flex items-center justify-center transition-colors hover:bg-[var(--th-hover)]"
              aria-label="Alternar tema"
            >
              {isDark ? <Sun className="w-5 h-5 text-[var(--th-txt-4)]" /> : <Moon className="w-5 h-5 text-[var(--th-txt-4)]" />}
            </button>
            <button
              onClick={handleLogout}
              className="w-11 h-11 rounded-lg bg-[var(--th-card)] border border-[var(--th-border)] flex items-center justify-center transition-colors hover:bg-red-500/10 hover:border-red-500/30"
              aria-label="Sair"
            >
              <LogOut className="w-5 h-5 text-[var(--th-txt-4)]" />
            </button>
          </div>
        </div>
      </header>
    </>
  )
}
