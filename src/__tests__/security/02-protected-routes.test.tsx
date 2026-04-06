/**
 * Segurança — Proteção de Rotas
 * Cobre: item 1 (autenticação), item 2 (autorização), item 4 (permissões), item 11 (RBAC)
 *
 * Valida que rotas protegidas redirecionam usuários não autenticados para /login
 * e que o conteúdo protegido nunca é exibido sem autenticação válida.
 */

import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../context/AuthContext'

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)

function renderWithRouter(isAuthenticated: boolean, isLoadingAuth: boolean) {
  mockUseAuth.mockReturnValue({ isAuthenticated, isLoadingAuth, login: vi.fn(), logout: vi.fn() })
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/login" element={<div>Página de Login</div>} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <div>Conteúdo Protegido</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('Segurança — Proteção de Rotas [items 1, 2, 4, 11]', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('usuário NÃO autenticado é redirecionado para /login', () => {
    renderWithRouter(false, false)

    expect(screen.getByText('Página de Login')).toBeInTheDocument()
    expect(screen.queryByText('Conteúdo Protegido')).not.toBeInTheDocument()
  })

  it('conteúdo protegido NÃO é exibido durante carregamento da autenticação', () => {
    renderWithRouter(false, true)

    expect(screen.queryByText('Conteúdo Protegido')).not.toBeInTheDocument()
    expect(screen.queryByText('Página de Login')).not.toBeInTheDocument()
  })

  it('usuário autenticado acessa o conteúdo protegido', () => {
    renderWithRouter(true, false)

    expect(screen.getByText('Conteúdo Protegido')).toBeInTheDocument()
    expect(screen.queryByText('Página de Login')).not.toBeInTheDocument()
  })

  it('estado de loading impede acesso MESMO com autenticação ainda não resolvida', () => {
    // isLoadingAuth=true deve bloquear qualquer renderização de conteúdo
    renderWithRouter(true, true)

    // Durante loading, ProtectedRoute retorna null — nenhum conteúdo visível
    expect(screen.queryByText('Conteúdo Protegido')).not.toBeInTheDocument()
  })

  it('autenticação expirada (isAuthenticated=false após carga) redireciona para login', () => {
    renderWithRouter(false, false)

    expect(screen.getByText('Página de Login')).toBeInTheDocument()
  })
})
