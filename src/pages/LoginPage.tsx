import { useState, useEffect, useRef, FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { COMPANY_NAME } from '../lib/constants'

function TronLines() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const G = 22
    const TRAIL_MIN = 5
    const TRAIL_MAX = 12

    type Dir = 0 | 1 | 2 | 3
    const DX = [1, 0, -1, 0]
    const DY = [0, 1, 0, -1]

    function resize() {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    // Zona proibida: elipse ao redor do centro (onde fica o título)
    function inTitleZone(x: number, y: number): boolean {
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      const rx = canvas.width * 0.30
      const ry = canvas.height * 0.38
      return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1
    }

    type RGB = [number, number, number]
    interface Cycle {
      cx: number; cy: number; sub: number; dir: Dir
      straight: number
      speed: number   // px/s individual
      trail: Array<{ x: number; y: number }>
      maxTrail: number
      alpha: number   // opacidade base
      rgb: RGB
    }

    // Zona válida: somente acima do subtítulo (~top 50%)
    function safeY(): number {
      const topMax = Math.floor(canvas.height * 0.50 / G) * G
      const rows = Math.max(1, Math.ceil(topMax / G))
      return Math.floor(Math.random() * rows) * G
    }

    function rand(min: number, max: number) { return min + Math.random() * (max - min) }

    function make(rgb: RGB): Cycle {
      const cx = Math.floor(Math.random() * (Math.ceil(canvas.width / G) + 2)) * G
      const cy = safeY()
      const dir = (Math.random() < 0.5 ? 0 : 2) as Dir
      return {
        cx, cy,
        sub: Math.random() * G,
        dir, straight: 0,
        speed: rand(25, 70),
        trail: [{ x: cx, y: cy }],
        maxTrail: Math.round(rand(TRAIL_MIN, TRAIL_MAX)),
        alpha: rand(0.4, 1.0),
        rgb,
      }
    }

    // Lê --th-txt-4 do DOM para usar no canvas
    const txt4 = getComputedStyle(document.documentElement).getPropertyValue('--th-txt-4').trim()
    // Converte para RGB (suporta "r g b", "#rrggbb" e "rgba(...)")
    let lineColor: RGB = [120, 120, 120]
    const hexMatch = txt4.match(/^#([0-9a-f]{3,8})/i)
    const rgbaMatch = txt4.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/)
    const spaceMatch = txt4.match(/^([\d.]+)\s+([\d.]+)\s+([\d.]+)/)
    if (rgbaMatch) lineColor = [+rgbaMatch[1], +rgbaMatch[2], +rgbaMatch[3]]
    else if (hexMatch) {
      const h = hexMatch[1].length === 3
        ? hexMatch[1].split('').map(c => parseInt(c + c, 16))
        : [parseInt(txt4.slice(1,3),16), parseInt(txt4.slice(3,5),16), parseInt(txt4.slice(5,7),16)]
      lineColor = h as RGB
    } else if (spaceMatch) lineColor = [Math.round(+spaceMatch[1]), Math.round(+spaceMatch[2]), Math.round(+spaceMatch[3])]

    const cycles: Cycle[] = Array.from({ length: 6 }, () => make(lineColor))

    let raf: number
    let t0 = performance.now()

    function frame(now: number) {
      const dt = Math.min((now - t0) / 1000, 0.05)
      t0 = now
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const c of cycles) {
        c.sub += c.speed * dt

        while (c.sub >= G) {
          c.sub -= G
          // Move to next grid cell
          c.cx += DX[c.dir] * G
          c.cy += DY[c.dir] * G
          // Wrap — limpa trail para não desenhar linha de travessia
          if (c.cx < -G * 2)               { c.cx = canvas.width + G;  c.trail = [] }
          if (c.cx > canvas.width + G * 2)  { c.cx = -G;               c.trail = [] }
          if (c.cy < -G * 2)               { c.cy = canvas.height + G; c.trail = [] }
          if (c.cy > canvas.height + G * 2) { c.cy = -G;               c.trail = [] }

          // Push APÓS mover — sem viradas, cada linha vai sempre na mesma direção
          c.trail.push({ x: c.cx, y: c.cy })
          if (c.trail.length > c.maxTrail) c.trail.shift()
        }

        // Head extends from current pos in current dir
        const hx = c.cx + DX[c.dir] * c.sub
        const hy = c.cy + DY[c.dir] * c.sub
        const pts = [...c.trail, { x: hx, y: hy }]
        const [r, g, b] = c.rgb

        for (let i = 1; i < pts.length; i++) {
          const frac = i / pts.length
          const alpha = Math.pow(frac, 2.5) * 0.75 * c.alpha
          ctx.save()
          ctx.globalAlpha = alpha
          ctx.strokeStyle = `rgb(${r},${g},${b})`
          ctx.lineWidth = 1.5
          ctx.shadowColor = `rgb(${r},${g},${b})`
          ctx.shadowBlur = 10 * frac
          ctx.lineCap = 'square'
          ctx.beginPath()
          ctx.moveTo(pts[i - 1].x, pts[i - 1].y)
          ctx.lineTo(pts[i].x, pts[i].y)
          ctx.stroke()
          ctx.restore()
        }

        ctx.save()
        ctx.globalAlpha = 1
        ctx.fillStyle = `rgb(${r},${g},${b})`
        ctx.shadowColor = `rgb(${r},${g},${b})`
        ctx.shadowBlur = 18
        ctx.beginPath()
        ctx.arc(hx, hy, 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" />
  )
}

function GlassInput({ children }: { children: React.ReactNode }) {
  const [focused, setFocused] = useState(false)
  return (
    <div
      className="rounded-2xl p-[1.5px] transition-all duration-200"
      style={{ background: focused ? 'linear-gradient(to right, rgba(255,140,0,0.6), rgba(216,27,96,0.6))' : 'var(--th-border)' }}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
    >
      <div className="rounded-[14px] bg-[var(--th-page)]">
        {children}
      </div>
    </div>
  )
}

export default function LoginPage() {
  const { login, loginWithGoogle, loginWithApple, isAuthenticated, isLoadingAuth } = useAuth()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [formReady, setFormReady] = useState(false)

  useEffect(() => {
    setFormReady(true)
  }, [])

  useEffect(() => {
    const html = document.documentElement
    const wasDark = html.classList.contains('dark')
    const storedTheme = localStorage.getItem('se_theme')
    if (storedTheme === 'light') {
      html.classList.remove('dark')
    } else {
      html.classList.add('dark')
    }
    return () => {
      if (wasDark) html.classList.add('dark')
      else html.classList.remove('dark')
    }
  }, [])

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, isLoadingAuth, navigate])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const user = (fd.get('email') as string).trim()
    const pass = fd.get('password') as string
    const rememberMe = fd.get('rememberMe') === 'on'

    setLoading(true)
    setError('')
    try {
      const ok = await login(user, pass, rememberMe)
      if (ok) {
        navigate('/', { replace: true })
      } else {
        setError('Usuário ou senha incorretos.')
      }
    } catch {
      setError('Nao foi possivel entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="h-[100dvh] flex flex-col w-[100dvw] overflow-hidden relative"
      style={{ background: 'var(--th-page)', color: 'var(--th-txt-1)' }}
    >
      {/* ── Full-page dots background — mobile only ── */}
      <div
        className="md:hidden absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />

      {/* ── Tron lines — full page, mobile only ── */}
      <div className="md:hidden absolute inset-0 pointer-events-none">
        <TronLines />
      </div>

      <div className="relative flex-1 flex flex-col md:flex-row overflow-hidden">
        <section className="flex-1 md:flex-1 flex flex-col items-center justify-center md:p-8 overflow-hidden relative">

          {/* ── Mobile: título — fluxo normal, zona fixa no topo ── */}
          <div className="md:hidden flex-shrink-0 relative flex items-center justify-center" style={{ height: '25vh' }}>
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 85% 85% at 50% 50%, var(--th-page) 0%, transparent 70%)',
              }}
            />
            <div className="relative z-10 login-title-anim flex flex-col items-center gap-2">
              <span className="text-5xl font-bold font-surgena leading-none text-[var(--th-txt-1)]">{COMPANY_NAME}</span>
              <span className="inline-flex rounded-md bg-gradient-to-r from-[#FF8C00] to-[#D81B60] p-[1px]">
                <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-xs font-medium uppercase tracking-widest bg-[var(--th-page)]">
                  <span className="bg-gradient-to-r from-[#FF8C00] to-[#D81B60] bg-clip-text text-transparent">Produção</span>
                </span>
              </span>
            </div>
          </div>

          {/* ── Formulário — centrado no espaço restante (mobile) ── */}
          <div className={`flex-1 md:flex-none flex flex-col justify-center items-center w-full pb-12 md:pb-0 ${formReady ? 'login-form-reveal' : 'opacity-0'}`}>
          <div className="relative w-full max-w-md md:max-w-[420px] px-8 md:px-0">
            {/* Overlay fade — mobile e desktop, atrás do formulário */}
            <div
              className="md:hidden pointer-events-none"
              style={{
                position: 'fixed',
                left: '-10%', right: '-10%',
                top: '20%', bottom: '-10%',
                background: 'var(--th-page)',
                WebkitMask: 'radial-gradient(ellipse 70% 75% at 50% 50%, black 30%, transparent 100%)',
                mask: 'radial-gradient(ellipse 70% 75% at 50% 50%, black 30%, transparent 100%)',
                zIndex: 0,
              }}
            />
            {/* Overlay fade desktop — atrás do formulário */}
            <div
              className="hidden md:block absolute pointer-events-none"
              style={{
                inset: '-64px -80px',
                background: 'var(--th-page)',
                WebkitMask: 'radial-gradient(ellipse 70% 75% at 50% 50%, black 30%, transparent 100%)',
                mask: 'radial-gradient(ellipse 70% 75% at 50% 50%, black 30%, transparent 100%)',
                zIndex: 0,
              }}
            />
            <div className="relative z-[1] flex flex-col gap-6 md:gap-8 md:items-center">
              {/* Brand heading — desktop only */}
              <div className="login-anim delay-50 hidden md:flex flex-col items-start gap-2 self-start">
                <span className="text-4xl font-bold font-surgena leading-none text-[var(--th-txt-1)]">{COMPANY_NAME}</span>
                <span className="inline-flex rounded-md bg-gradient-to-r from-[#FF8C00] to-[#D81B60] p-[1px] -translate-y-[2px]">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-xs font-medium uppercase tracking-widest bg-[var(--th-page)]">
                    <span className="bg-gradient-to-r from-[#FF8C00] to-[#D81B60] bg-clip-text text-transparent">Produção</span>
                  </span>
                </span>
              </div>

              <p className="login-anim delay-200 text-[var(--th-txt-4)] self-start">
                Acesse sua conta para iniciar o monitoramento.
              </p>

              <form className="w-full space-y-5 md:space-y-6" onSubmit={handleSubmit}>
                <div className="login-anim delay-300">
                  <label className="hidden md:block text-sm font-medium text-[var(--th-txt-4)] mb-2">Usuário ou Email</label>
                  <GlassInput>
                    <input
                      name="email"
                      type="text"
                      placeholder="Usuário ou Email"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      required
                      className="w-full bg-transparent text-base md:text-sm p-3 md:p-3.5 rounded-2xl focus:outline-none text-[var(--th-txt-1)] placeholder:text-[var(--th-txt-4)]"
                    />
                  </GlassInput>
                </div>

                <div className="login-anim delay-400">
                  <label className="hidden md:block text-sm font-medium text-[var(--th-txt-4)] mb-2">Senha</label>
                  <GlassInput>
                    <div className="relative">
                      <input
                        name="password"
                        type={showPass ? 'text' : 'password'}
                        placeholder="Senha"
                        autoComplete="current-password"
                        required
                        className="w-full bg-transparent text-base md:text-sm p-3 pr-10 md:py-3.5 md:pl-3.5 md:pr-12 rounded-2xl focus:outline-none text-[var(--th-txt-1)] placeholder:text-[var(--th-txt-4)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(v => !v)}
                        className="absolute inset-y-0 right-3 flex items-center"
                        aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                        aria-pressed={showPass}
                      >
                        {showPass ? (
                          <EyeOff className="w-5 h-5 text-[var(--th-txt-4)] hover:text-[var(--th-txt-1)] transition-colors" />
                        ) : (
                          <Eye className="w-5 h-5 text-[var(--th-txt-4)] hover:text-[var(--th-txt-1)] transition-colors" />
                        )}
                      </button>
                    </div>
                  </GlassInput>
                </div>

                <div className="login-anim delay-500 flex items-center justify-between text-sm">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="rememberMe" className="login-checkbox" />
                    <span className="text-[var(--th-txt-4)]">Manter conectado</span>
                  </label>
                  {error && <span className="text-red-400 text-xs">{error}</span>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="login-anim delay-600 w-full rounded-2xl py-3 md:py-3.5 font-medium transition-colors bg-white text-black hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verificando...' : 'Entrar'}
                </button>

                <div className="login-anim delay-600 flex items-center gap-3">
                  <div className="flex-1 h-px bg-[var(--th-border)]" />
                  <span className="text-xs text-[var(--th-txt-4)]">ou</span>
                  <div className="flex-1 h-px bg-[var(--th-border)]" />
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/criar-conta')}
                  className="login-anim delay-600 w-full rounded-2xl py-3 md:py-3.5 font-medium transition-colors border border-[var(--th-border)] bg-[var(--th-page)] text-[var(--th-txt-1)] hover:bg-white/5 flex items-center justify-center gap-2"
                >
                  Criar conta
                </button>
              </form>
            </div>
          </div>
          </div>
        </section>

        <section className="hidden md:block md:flex-1 relative p-4">
          <div
            className="login-slide-right delay-300 absolute inset-4 rounded-3xl"
            style={{
              backgroundImage: 'url(/unnamed.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        </section>
      </div>
    </div>
  )
}
