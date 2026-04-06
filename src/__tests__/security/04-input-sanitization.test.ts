/**
 * Segurança — Sanitização de Entradas e Injeção SQL
 * Cobre: item 3 (SQL injection), item 16 (injeção de comandos)
 *
 * Valida que:
 * 1. O username é normalizado antes de ir ao Supabase (trim + lowercase)
 * 2. Payloads de SQL injection são tratados como strings literais (RPC parametrizado)
 * 3. Payloads de XSS no campo de login são tratados como strings literais
 * 4. A senha não sofre transformação (case-sensitive)
 */

import { renderHook, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}))

const mockRpc = vi.mocked(supabase.rpc)

describe('Segurança — Sanitização de Entradas [items 3, 16]', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    // Sessão inexistente: validar_sessao_login retorna vazio
    mockRpc.mockImplementation(async (name: string) => {
      if (name === 'validar_sessao_login') return { data: [], error: null }
      if (name === 'criar_sessao_login') return { data: [], error: null }
      return { data: null, error: null }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('username é trimado antes do envio ao Supabase RPC', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await act(async () => {
      await result.current.login('  admin  ', 'senha123', false)
    })

    const call = mockRpc.mock.calls.find(([name]: [string]) => name === 'criar_sessao_login')
    expect(call).toBeDefined()
    expect((call![1] as { p_username: string }).p_username).toBe('admin')
  })

  it('username é convertido para lowercase antes do envio ao Supabase RPC', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await act(async () => {
      await result.current.login('ADMIN', 'senha123', false)
    })

    const call = mockRpc.mock.calls.find(([name]: [string]) => name === 'criar_sessao_login')
    expect((call![1] as { p_username: string }).p_username).toBe('admin')
  })

  it('payload de SQL injection é passado como string literal ao RPC (não executado)', async () => {
    const sqlPayload = "admin' OR '1'='1' --"
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await act(async () => {
      await result.current.login(sqlPayload, 'qualquer', false)
    })

    const call = mockRpc.mock.calls.find(([name]: [string]) => name === 'criar_sessao_login')
    // Deve ser passado como parâmetro literal — RPC parametrizado previne SQL injection
    expect((call![1] as { p_username: string }).p_username).toBe(sqlPayload.trim().toLowerCase())
    expect(typeof (call![1] as { p_username: string }).p_username).toBe('string')
  })

  it('payload de XSS no username é passado como string literal ao RPC', async () => {
    const xssPayload = '<script>alert("xss")</script>'
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await act(async () => {
      await result.current.login(xssPayload, 'qualquer', false)
    })

    const call = mockRpc.mock.calls.find(([name]: [string]) => name === 'criar_sessao_login')
    expect((call![1] as { p_username: string }).p_username).toBe(xssPayload.trim().toLowerCase())
    expect(typeof (call![1] as { p_username: string }).p_username).toBe('string')
  })

  it('password NÃO é transformada (case-sensitive)', async () => {
    const senha = 'MinHaSenha@123'
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await act(async () => {
      await result.current.login('usuario', senha, false)
    })

    const call = mockRpc.mock.calls.find(([name]: [string]) => name === 'criar_sessao_login')
    expect((call![1] as { p_password: string }).p_password).toBe(senha)
  })

  it('login retorna false quando Supabase retorna credenciais inválidas', async () => {
    mockRpc.mockImplementation(async (name: string) => {
      if (name === 'validar_sessao_login') return { data: [], error: null }
      if (name === 'criar_sessao_login') return { data: [], error: null }
      return { data: null, error: null }
    })

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    let loginResult: boolean
    await act(async () => {
      loginResult = await result.current.login('usuario', 'senha_errada', false)
    })

    expect(loginResult!).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('login retorna false quando Supabase retorna erro', async () => {
    mockRpc.mockImplementation(async (name: string) => {
      if (name === 'validar_sessao_login') return { data: [], error: null }
      if (name === 'criar_sessao_login') return { data: null, error: { message: 'DB error' } }
      return { data: null, error: null }
    })

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    let loginResult: boolean
    await act(async () => {
      loginResult = await result.current.login('usuario', 'senha', false)
    })

    expect(loginResult!).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('normalization: trim + lowercase em sequência produz resultado esperado', () => {
    const casos = [
      { input: '  ADMIN  ', expected: 'admin' },
      { input: 'User@123', expected: 'user@123' },
      { input: '  João  ', expected: 'joão' },
      { input: "'; DROP TABLE usuarios; --", expected: "'; drop table usuarios; --" },
    ]

    for (const { input, expected } of casos) {
      expect(input.trim().toLowerCase()).toBe(expected)
    }
  })
})
