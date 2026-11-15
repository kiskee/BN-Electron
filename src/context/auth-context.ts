// Contexto y hook de autenticación (sin componentes, para fast refresh)

import { createContext, useContext } from 'react'
import type { AuthSession, LoginInput, RegisterInput } from '@/types/auth'

export type AuthStatus = 'loading' | 'authed' | 'guest'

export interface AuthState {
  session: AuthSession | null
  status: AuthStatus
  notice: string | null
}

export interface AuthContextValue extends AuthState {
  setNotice: (notice: string | null) => void
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: (reason?: 'expired') => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
