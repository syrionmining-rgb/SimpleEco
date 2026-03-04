import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoadingAuth } = useAuth()
  if (isLoadingAuth) return null
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}
