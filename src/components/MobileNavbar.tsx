import { LayoutDashboard, TriangleAlert, ClipboardList, BarChart2 } from 'lucide-react'

const items = [
  { label: 'Visão Geral', icon: LayoutDashboard, href: '#overview' },
  { label: 'Atrasados',   icon: TriangleAlert,   href: '#atrasados' },
  { label: 'Programados', icon: ClipboardList,    href: '#programados' },
  { label: 'Gráficos',    icon: BarChart2,        href: '#graficos' },
]

export default function MobileNavbar() {
  function scrollTo(href: string) {
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--th-card)] border-t border-[var(--th-border)] flex items-stretch">
      {items.map(({ label, icon: Icon, href }) => (
        <button
          key={href}
          onClick={() => scrollTo(href)}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[var(--th-txt-4)] hover:text-[var(--th-txt-1)] hover:bg-[var(--th-hover)] transition-colors"
        >
          <Icon className="w-5 h-5" />
          <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
        </button>
      ))}
    </nav>
  )
}
