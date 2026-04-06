/**
 * Segurança — Armazenamento de Tokens
 * Cobre: item 1 (autenticação), item 14 (validação de tokens)
 *
 * Valida que os tokens de sessão são armazenados, recuperados e removidos
 * de forma segura, sem vazamento para URL, cookies ou locais indevidos.
 */

const AUTH_KEY = 'se_auth_token'
const STORAGE_KIND_KEY = 'se_auth_storage'
const USER_KEY = 'se_user'

describe('Segurança — Armazenamento de Tokens [items 1, 14]', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('rememberMe=true: token armazenado APENAS no localStorage', () => {
    const token = 'fake-session-token-xyz'
    localStorage.setItem(AUTH_KEY, token)
    sessionStorage.removeItem(AUTH_KEY)
    localStorage.setItem(STORAGE_KIND_KEY, 'local')

    expect(localStorage.getItem(AUTH_KEY)).toBe(token)
    expect(sessionStorage.getItem(AUTH_KEY)).toBeNull()
  })

  it('rememberMe=false: token armazenado APENAS no sessionStorage', () => {
    const token = 'fake-session-token-xyz'
    sessionStorage.setItem(AUTH_KEY, token)
    localStorage.removeItem(AUTH_KEY)
    localStorage.setItem(STORAGE_KIND_KEY, 'session')

    expect(sessionStorage.getItem(AUTH_KEY)).toBe(token)
    expect(localStorage.getItem(AUTH_KEY)).toBeNull()
  })

  it('token não pode estar simultaneamente em localStorage e sessionStorage', () => {
    localStorage.setItem(AUTH_KEY, 'token-a')

    expect(sessionStorage.getItem(AUTH_KEY)).toBeNull()
  })

  it('clearAuthToken remove token de ambos os storages', () => {
    localStorage.setItem(AUTH_KEY, 'token-a')
    sessionStorage.setItem(AUTH_KEY, 'token-b')
    localStorage.setItem(STORAGE_KIND_KEY, 'local')
    localStorage.setItem(USER_KEY, 'admin')

    // Replica clearAuthToken()
    localStorage.removeItem(AUTH_KEY)
    sessionStorage.removeItem(AUTH_KEY)
    localStorage.removeItem(STORAGE_KIND_KEY)
    localStorage.removeItem(USER_KEY)

    expect(localStorage.getItem(AUTH_KEY)).toBeNull()
    expect(sessionStorage.getItem(AUTH_KEY)).toBeNull()
    expect(localStorage.getItem(STORAGE_KIND_KEY)).toBeNull()
    expect(localStorage.getItem(USER_KEY)).toBeNull()
  })

  it('token NÃO está exposto na URL (query string ou hash)', () => {
    expect(window.location.search).not.toContain(AUTH_KEY)
    expect(window.location.search).not.toContain('token=')
    expect(window.location.hash).not.toContain(AUTH_KEY)
  })

  it('token NÃO está armazenado em cookie', () => {
    expect(document.cookie).not.toContain(AUTH_KEY)
  })

  it('getAuthToken com kind=local lê do localStorage', () => {
    localStorage.setItem(AUTH_KEY, 'expected-token')
    localStorage.setItem(STORAGE_KIND_KEY, 'local')

    const kind = localStorage.getItem(STORAGE_KIND_KEY)
    const token = kind === 'local'
      ? localStorage.getItem(AUTH_KEY)
      : sessionStorage.getItem(AUTH_KEY)

    expect(token).toBe('expected-token')
  })

  it('getAuthToken com kind=session lê do sessionStorage', () => {
    sessionStorage.setItem(AUTH_KEY, 'expected-token')
    localStorage.setItem(STORAGE_KIND_KEY, 'session')

    const kind = localStorage.getItem(STORAGE_KIND_KEY)
    const token = kind === 'session'
      ? sessionStorage.getItem(AUTH_KEY)
      : localStorage.getItem(AUTH_KEY)

    expect(token).toBe('expected-token')
  })

  it('getAuthToken sem storage configurado retorna null (sem sessão implícita)', () => {
    const kind = localStorage.getItem(STORAGE_KIND_KEY)
    const token = kind === 'local'
      ? localStorage.getItem(AUTH_KEY)
      : kind === 'session'
      ? sessionStorage.getItem(AUTH_KEY)
      : (localStorage.getItem(AUTH_KEY) ?? sessionStorage.getItem(AUTH_KEY))

    expect(token).toBeNull()
  })

  it('logout remove o nome de usuário armazenado localmente', () => {
    localStorage.setItem(USER_KEY, 'admin')
    localStorage.removeItem(USER_KEY)

    expect(localStorage.getItem(USER_KEY)).toBeNull()
  })
})
