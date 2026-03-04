import { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { supabase } from '../supabase'

interface AuthContextType {
  isAuthenticated: boolean
  login: (user: string, pass: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('se_auth') === '1'
  })

  const login = useCallback(async (user: string, pass: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('verificar_login', {
      p_username: user,
      p_password: pass,
    })
    if (error) {
      console.error('Erro ao validar login:', error.message)
      return false
    }
    if (data && data.length > 0) {
      localStorage.setItem('se_auth', '1')
      localStorage.setItem('se_user', data[0].nome ?? user)
      setIsAuthenticated(true)
      return true
    }
    return false
  }, [])

  function logout() {
    localStorage.removeItem('se_auth')
    localStorage.removeItem('se_user')
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
