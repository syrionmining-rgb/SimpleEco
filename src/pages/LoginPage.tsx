import { useState, useEffect, FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

// Avatares embutidos via URL pública
const testimonials = [
  {
    avatarSrc: 'https://randomuser.me/api/portraits/women/57.jpg',
    name: 'Sarah Chen',
    handle: '@sarahdigital',
    text: 'Plataforma incrível! A experiência do usuário é perfeita e as funcionalidades são exatamente o que eu precisava.',
  },
  {
    avatarSrc: 'https://randomuser.me/api/portraits/men/64.jpg',
    name: 'Marcus Johnson',
    handle: '@marcustech',
    text: 'Este sistema transformou nossa linha de produção. Design limpo, recursos poderosos e excelente suporte.',
  },
  {
    avatarSrc: 'https://randomuser.me/api/portraits/men/32.jpg',
    name: 'David Martinez',
    handle: '@davidcreates',
    text: 'Já usei muitas plataformas, mas esta se destaca. Intuitiva, confiável e genuinamente útil para a produtividade.',
  },
]

const HERO_IMG =
  'https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80'

function GlassInput({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--th-border)] bg-[var(--th-subtle)] backdrop-blur-sm transition-colors focus-within:border-[#FF8C00]/70 focus-within:bg-[#FF8C00]/5">
      {children}
    </div>
  )
}

function TestimonialCard({
  t,
  delay,
}: {
  t: (typeof testimonials)[0]
  delay: string
}) {
  return (
    <div
      className={`${delay} flex items-start gap-3 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 p-5 w-64`}
      style={{ animation: '.8s ease-out forwards testimonialIn' }}
    >
      <img
        src={t.avatarSrc}
        className="h-10 w-10 object-cover rounded-2xl shrink-0"
        alt={t.name}
      />
      <div className="text-sm leading-snug text-white">
        <p className="font-medium">{t.name}</p>
        <p className="text-white/50">{t.handle}</p>
        <p className="mt-1 text-white/80">{t.text}</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')

  // Força dark mode enquanto a página de login está visível
  useEffect(() => {
    const html = document.documentElement
    const wasDark = html.classList.contains('dark')
    html.classList.add('dark')
    return () => {
      if (!wasDark) html.classList.remove('dark')
    }
  }, [])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const user = (fd.get('email') as string).trim()
    const pass = fd.get('password') as string
    const ok = login(user, pass)
    if (ok) {
      navigate('/', { replace: true })
    } else {
      setError('Usuário ou senha incorretos.')
    }
  }

  return (
    <div
      className="h-[100dvh] flex flex-col w-[100dvw] overflow-hidden"
      style={{ background: 'var(--th-page)', color: 'var(--th-txt-1)' }}
    >
      {/* ── Conteúdo: form + hero ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      {/* ── LEFT: form ── */}
      <section className="flex-1 flex items-center justify-center px-10 py-5 md:p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-4 md:gap-6">

            {/* Logo — acima do título */}
            <div className="login-anim delay-50">
              <span className="text-xl md:text-2xl font-bold">
                <span className="text-[var(--th-txt-1)]">Simple&amp;Eco</span>{' '}
                <span className="bg-gradient-to-r from-[#FF8C00] to-[#D81B60] bg-clip-text text-transparent">Produção</span>
              </span>
            </div>

            {/* Title */}
            <h1
              className="login-anim delay-100 text-3xl md:text-5xl font-semibold leading-tight"
            >
              <span className="font-light tracking-tighter text-[var(--th-txt-1)]">
                Bem-vindo
              </span>
            </h1>

            <p className="login-anim delay-200 text-[var(--th-txt-4)]">
              Acesse sua conta para continuar monitorando a produção.
            </p>

            {/* Form */}
            <form className="space-y-3 md:space-y-5" onSubmit={handleSubmit}>

              {/* User */}
              <div className="login-anim delay-300">
                <label className="text-sm font-medium text-[var(--th-txt-4)]">
                  Usuário
                </label>
                <GlassInput>
                  <input
                    name="email"
                    type="text"
                    placeholder="Digite seu usuário"
                    autoComplete="username"
                    required
                    className="w-full bg-transparent text-sm p-3 md:p-4 rounded-2xl focus:outline-none text-[var(--th-txt-1)] placeholder:text-[var(--th-txt-4)]"
                  />
                </GlassInput>
              </div>

              {/* Password */}
              <div className="login-anim delay-400">
                <label className="text-sm font-medium text-[var(--th-txt-4)]">
                  Senha
                </label>
                <GlassInput>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPass ? 'text' : 'password'}
                      placeholder="Digite sua senha"
                      autoComplete="current-password"
                      required
                      className="w-full bg-transparent text-sm p-3 md:p-4 pr-12 rounded-2xl focus:outline-none text-[var(--th-txt-1)] placeholder:text-[var(--th-txt-4)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute inset-y-0 right-3 flex items-center"
                      tabIndex={-1}
                    >
                      {showPass
                        ? <EyeOff className="w-5 h-5 text-[var(--th-txt-4)] hover:text-[var(--th-txt-1)] transition-colors" />
                        : <Eye className="w-5 h-5 text-[var(--th-txt-4)] hover:text-[var(--th-txt-1)] transition-colors" />}
                    </button>
                  </div>
                </GlassInput>
              </div>

              {/* Remember + error */}
              <div className="login-anim delay-500 flex items-center justify-between text-sm">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    className="login-checkbox"
                  />
                  <span className="text-[var(--th-txt-1)]/90">
                    Manter conectado
                  </span>
                </label>
                {error && (
                  <span className="text-red-400 text-xs">{error}</span>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="login-anim delay-600 w-full rounded-2xl py-3 md:py-4 font-medium transition-colors bg-white text-black hover:bg-white/90"
              >
                Entrar
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── RIGHT: hero (desktop only) ── */}
      <section className="hidden md:block flex-1 relative p-4">
        <div
          className="login-slide-right delay-300 absolute inset-4 rounded-3xl"
          style={{
            backgroundImage: 'url(/unnamed.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      </section>
      </div>
    </div>
  )
}
