import { useState, useEffect } from 'react'
import { Calendar, Clock, Sun, Moon, LogOut, Menu, X, LayoutDashboard, TriangleAlert, ClipboardList, BarChart2, Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'

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
  lastSync: string | null
}

export default function Header({ toggleTheme, isDark }: HeaderProps) {
  const [now, setNow] = useState(new Date())
  const [menuOpen, setMenuOpen] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const isAdminPage = location.pathname === '/admin'
  const currentPageText = isAdminPage ? 'Administrador' : 'Produção'

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  function scrollTo(href: string) {
    setMenuOpen(false)
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      {/* ── MOBILE: fixed top header ── */}
      <header className="sm:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--th-card)]/60 backdrop-blur-xl shadow-[0_1px_0_var(--th-border)]">
        <div className="px-4 py-3">
          {/* Bar: logo + admin + hamburger */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xl font-bold leading-tight">
                <span className="text-[var(--th-txt-1)]">Simple&Eco</span>{' '}
                <span className="bg-gradient-to-r from-[#FF8C00] to-[#D81B60] bg-clip-text text-transparent">{currentPageText}</span>
            </div>
            <div className="flex items-center gap-1">
              {!isAdminPage && (
                <button
                  onClick={() => navigate('/admin')}
                  className="p-2 rounded-lg text-[var(--th-txt-3)] hover:text-[var(--th-txt-1)] hover:bg-[var(--th-hover)] transition-colors"
                  aria-label="Administrador"
                >
                  <Settings className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="p-2 text-[var(--th-txt-1)]"
                aria-label="Menu"
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
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
                  onClick={() => { void handleLogout(); setMenuOpen(false) }}
                  className="p-2 rounded-lg flex items-center gap-3 text-[var(--th-txt-3)] hover:bg-[var(--th-hover)] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Sair</span>
                </button>
                <p className="px-2 pt-1 text-[11px] text-[var(--th-txt-4)] tracking-wide">Versão 2.0</p>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* ── DESKTOP: inline header ── */}
      <header className="hidden sm:block pb-5 sm:pb-6 border-b border-[var(--th-border)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 text-2xl font-bold">
                <span className="text-[var(--th-txt-1)]">Simple&Eco</span>{' '}
                <span className="bg-gradient-to-r from-[#FF8C00] to-[#D81B60] bg-clip-text text-transparent">{currentPageText}</span>
            </div>
            <p className="text-sm text-[var(--th-txt-3)] flex items-center gap-1.5">
              <Calendar className="w-4 h-4" aria-hidden="true" />
              {formatDate(now)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
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
                onClick={() => navigate('/admin')}
                className="w-11 h-11 rounded-lg bg-[var(--th-card)] border border-[var(--th-border)] flex items-center justify-center transition-colors hover:bg-[var(--th-hover)]"
                aria-label="Ir para Administrador"
              >
                <Settings className="w-5 h-5 text-[var(--th-txt-4)]" />
              </button>
              <button
                onClick={() => { void handleLogout() }}
                className="w-11 h-11 rounded-lg bg-[var(--th-card)] border border-[var(--th-border)] flex items-center justify-center transition-colors hover:bg-red-500/10 hover:border-red-500/30"
                aria-label="Sair"
              >
                <LogOut className="w-5 h-5 text-[var(--th-txt-4)]" />
              </button>
            </div>
            <span className="text-[11px] text-[var(--th-txt-4)] tracking-wide">Versão 2.0</span>
          </div>
        </div>
      </header>
    </>
  )
}
