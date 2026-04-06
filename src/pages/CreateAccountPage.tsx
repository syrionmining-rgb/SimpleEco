import { useState, useEffect, FormEvent } from 'react'
import { Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { COMPANY_NAME } from '../lib/constants'
import { supabase } from '../lib/supabase'

function GlassInput({ children }: { children: React.ReactNode }) {
  const [focused, setFocused] = useState(false)
  return (
    <div
      className="rounded-2xl p-[1.5px] transition-all duration-200"
      style={{ background: focused ? 'linear-gradient(to right, #FF8C00, #D81B60)' : 'var(--th-border)' }}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
    >
      <div className="rounded-[14px] bg-[var(--th-page)]">
        {children}
      </div>
    </div>
  )
}

export default function CreateAccountPage() {
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const html = document.documentElement
    const wasDark = html.classList.contains('dark')
    html.classList.add('dark')
    return () => {
      if (!wasDark) html.classList.remove('dark')
    }
  }, [])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const nome = (fd.get('nome') as string).trim()
    const username = (fd.get('username') as string).trim().toLowerCase()
    const senha = fd.get('senha') as string
    const confirmar = fd.get('confirmar') as string

    if (senha !== confirmar) {
      setError('As senhas não coincidem.')
      return
    }
    if (senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.from('usuarios').insert({
        nome,
        username,
        senha_hash: senha,
        ativo: false,
      })
      if (err) {
        if (err.code === '23505') {
          setError('Este usuário já está cadastrado.')
        } else {
          setError('Não foi possível criar a conta. Tente novamente.')
        }
      } else {
        setSuccess(true)
      }
    } catch {
      setError('Não foi possível criar a conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="h-[100dvh] flex flex-col w-[100dvw] overflow-hidden relative"
      style={{ background: 'var(--th-page)', color: 'var(--th-txt-1)' }}
    >
      {/* Dots background — mobile only */}
      <div
        className="md:hidden absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />

      {/* Mobile back button — top left */}
      <button
        type="button"
        onClick={() => navigate('/login')}
        className="md:hidden absolute top-4 left-4 z-50 flex items-center gap-1.5 text-sm text-[var(--th-txt-4)] hover:text-[var(--th-txt-1)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <div className="relative flex-1 flex flex-col md:flex-row overflow-hidden">
        <section className="flex-1 flex flex-col md:items-center md:justify-center md:p-8 overflow-hidden">

          {/* Mobile title */}
          <div className="md:hidden flex-shrink-0 relative flex items-center justify-center" style={{ height: '28vh' }}>
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse 85% 85% at 50% 50%, var(--th-page) 0%, transparent 70%)' }}
            />
            <div className="relative z-10 login-anim delay-50 flex flex-col items-center gap-1">
              <span className="text-5xl font-bold font-surgena leading-none text-[var(--th-txt-1)]">{COMPANY_NAME}</span>
              <span className="inline-flex rounded-md bg-gradient-to-r from-[#FF8C00] to-[#D81B60] p-[1px]">
                <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-xs font-medium uppercase tracking-widest bg-[var(--th-page)]">
                  <span className="bg-gradient-to-r from-[#FF8C00] to-[#D81B60] bg-clip-text text-transparent">Produção</span>
                </span>
              </span>
            </div>
          </div>

          {/* Form area */}
          <div className="flex-1 md:flex-none flex flex-col justify-center items-center w-full pb-8 md:pb-0">
            <div className="relative w-full max-w-md px-8 md:px-0">

              {/* Mobile dark mask */}
              <div
                className="md:hidden pointer-events-none"
                style={{
                  position: 'fixed',
                  left: 0, right: 0,
                  top: '30%', bottom: 0,
                  background: 'radial-gradient(ellipse 100% 80% at 50% 40%, var(--th-page) 20%, transparent 100%)',
                  zIndex: 0,
                }}
              />

              <div className="relative z-[1] flex flex-col gap-4 md:gap-6">

                {/* Desktop brand */}
                <div className="login-anim delay-50 hidden md:flex flex-row items-center gap-3">
                  <span className="text-5xl font-bold font-surgena leading-none text-[var(--th-txt-1)]">{COMPANY_NAME}</span>
                  <span className="inline-flex rounded-md bg-gradient-to-r from-[#FF8C00] to-[#D81B60] p-[1px]">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-xs font-medium uppercase tracking-widest bg-[var(--th-page)]">
                      <span className="bg-gradient-to-r from-[#FF8C00] to-[#D81B60] bg-clip-text text-transparent">Produção</span>
                    </span>
                  </span>
                </div>

                {!success ? (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="login-anim delay-200 hidden md:flex items-center gap-1.5 text-sm text-[var(--th-txt-4)] hover:text-[var(--th-txt-1)] transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Voltar
                    </button>

                    <p className="login-anim delay-300 text-[var(--th-txt-4)]">
                      Preencha os dados para solicitar acesso.
                    </p>

                    <form className="w-full space-y-4" onSubmit={handleSubmit}>
                      <div className="login-anim delay-400">
                        <GlassInput>
                          <input
                            name="nome"
                            type="text"
                            placeholder="Nome completo"
                            autoComplete="name"
                            required
                            className="w-full bg-transparent text-base md:text-sm p-2.5 rounded-2xl focus:outline-none text-[var(--th-txt-1)] placeholder:text-[var(--th-txt-4)]"
                          />
                        </GlassInput>
                      </div>

                      <div className="login-anim delay-400">
                        <GlassInput>
                          <input
                            name="username"
                            type="email"
                            placeholder="Email"
                            autoComplete="email"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            required
                            className="w-full bg-transparent text-base md:text-sm p-2.5 rounded-2xl focus:outline-none text-[var(--th-txt-1)] placeholder:text-[var(--th-txt-4)]"
                          />
                        </GlassInput>
                      </div>

                      <div className="login-anim delay-500">
                        <GlassInput>
                          <div className="relative">
                            <input
                              name="senha"
                              type={showPass ? 'text' : 'password'}
                              placeholder="Senha"
                              autoComplete="new-password"
                              required
                              className="w-full bg-transparent text-base md:text-sm p-2.5 pr-10 rounded-2xl focus:outline-none text-[var(--th-txt-1)] placeholder:text-[var(--th-txt-4)]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPass(v => !v)}
                              className="absolute inset-y-0 right-3 flex items-center"
                            >
                              {showPass
                                ? <EyeOff className="w-5 h-5 text-[var(--th-txt-4)]" />
                                : <Eye className="w-5 h-5 text-[var(--th-txt-4)]" />}
                            </button>
                          </div>
                        </GlassInput>
                      </div>

                      <div className="login-anim delay-600">
                        <GlassInput>
                          <div className="relative">
                            <input
                              name="confirmar"
                              type={showConfirm ? 'text' : 'password'}
                              placeholder="Confirmar senha"
                              autoComplete="new-password"
                              required
                              className="w-full bg-transparent text-base md:text-sm p-2.5 pr-10 rounded-2xl focus:outline-none text-[var(--th-txt-1)] placeholder:text-[var(--th-txt-4)]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirm(v => !v)}
                              className="absolute inset-y-0 right-3 flex items-center"
                            >
                              {showConfirm
                                ? <EyeOff className="w-5 h-5 text-[var(--th-txt-4)]" />
                                : <Eye className="w-5 h-5 text-[var(--th-txt-4)]" />}
                            </button>
                          </div>
                        </GlassInput>
                      </div>

                      {error && (
                        <p className="text-red-400 text-xs text-center">{error}</p>
                      )}

                      <button
                        type="submit"
                        disabled={loading}
                        className="login-anim delay-600 w-full rounded-2xl py-2.5 font-medium transition-colors bg-white text-black hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Criando conta...' : 'Criar conta'}
                      </button>

                    </form>
                  </>
                ) : (
                  <div className="login-anim w-full flex flex-col items-center gap-6 text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#FF8C00] to-[#D81B60] p-[2px]">
                      <div className="w-full h-full rounded-full bg-[var(--th-page)] flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-[#FF8C00]" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <h2 className="text-xl font-semibold text-[var(--th-txt-1)]">Solicitação enviada</h2>
                      <p className="text-[var(--th-txt-4)] text-sm leading-relaxed max-w-xs">
                        Em breve um administrador irá ativar a sua conta.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/login')}
                      className="rounded-2xl px-6 py-2.5 font-medium transition-colors border border-[var(--th-border)] bg-[var(--th-page)] text-[var(--th-txt-4)] hover:bg-white/5"
                    >
                      Voltar ao login
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Desktop image panel */}
        <section className="hidden md:block flex-1 relative p-4">
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
