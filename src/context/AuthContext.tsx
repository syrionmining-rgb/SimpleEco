import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  isAuthenticated: boolean
  isLoadingAuth: boolean
  login: (user: string, pass: string, rememberMe: boolean) => Promise<boolean>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const AUTH_STORAGE_KEY = 'se_auth_token'
const USER_STORAGE_KEY = 'se_user'
const STORAGE_KIND_KEY = 'se_auth_storage'
const STORAGE_LOCAL = 'local'
const STORAGE_SESSION = 'session'

function setAuthToken(token: string, rememberMe: boolean) {
  const target = rememberMe ? localStorage : sessionStorage
  const other = rememberMe ? sessionStorage : localStorage
  target.setItem(AUTH_STORAGE_KEY, token)
  other.removeItem(AUTH_STORAGE_KEY)
  localStorage.setItem(STORAGE_KIND_KEY, rememberMe ? STORAGE_LOCAL : STORAGE_SESSION)
}

function clearAuthToken() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(STORAGE_KIND_KEY)
}

function getAuthToken(): string | null {
  const kind = localStorage.getItem(STORAGE_KIND_KEY)
  if (kind === STORAGE_LOCAL) return localStorage.getItem(AUTH_STORAGE_KEY)
  if (kind === STORAGE_SESSION) return sessionStorage.getItem(AUTH_STORAGE_KEY)
  return localStorage.getItem(AUTH_STORAGE_KEY) ?? sessionStorage.getItem(AUTH_STORAGE_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)

  const validateStoredSession = useCallback(async () => {
    const token = getAuthToken()
    if (!token) {
      setIsAuthenticated(false)
      setIsLoadingAuth(false)
      return
    }

    try {
      const { data, error } = await supabase.rpc('validar_sessao_login', {
        p_token: token,
      })
      if (error || !Array.isArray(data) || data.length === 0) {
        clearAuthToken()
        localStorage.removeItem(USER_STORAGE_KEY)
        setIsAuthenticated(false)
      } else {
        localStorage.setItem(USER_STORAGE_KEY, data[0].nome ?? data[0].username ?? '')
        setIsAuthenticated(true)
      }
    } catch {
      clearAuthToken()
      localStorage.removeItem(USER_STORAGE_KEY)
      setIsAuthenticated(false)
    } finally {
      setIsLoadingAuth(false)
    }
  }, [])

  useEffect(() => {
    void validateStoredSession()
  }, [validateStoredSession])

  const login = useCallback(async (user: string, pass: string, rememberMe: boolean): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('criar_sessao_login', {
        p_username: user,
        p_password: pass,
      })
      if (error || !Array.isArray(data) || data.length === 0) {
        if (error) console.error('Erro ao validar login:', error.message)
        clearAuthToken()
        localStorage.removeItem(USER_STORAGE_KEY)
        setIsAuthenticated(false)
        return false
      }

      const session = data[0]
      if (!session?.token) {
        clearAuthToken()
        localStorage.removeItem(USER_STORAGE_KEY)
        setIsAuthenticated(false)
        return false
      }

      setAuthToken(session.token, rememberMe)
      localStorage.setItem(USER_STORAGE_KEY, session.nome ?? user)
      setIsAuthenticated(true)
      return true
    } catch {
      clearAuthToken()
      localStorage.removeItem(USER_STORAGE_KEY)
      setIsAuthenticated(false)
      return false
    }
  }, [])

  async function logout() {
    const token = getAuthToken()
    if (token) {
      try {
        await supabase.rpc('revogar_sessao_login', { p_token: token })
      } catch {
        // no-op: limpeza local ainda deve ocorrer
      }
    }
    clearAuthToken()
    localStorage.removeItem(USER_STORAGE_KEY)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoadingAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
