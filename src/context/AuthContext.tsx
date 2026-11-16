// Proveedor global de sesión: login, registro, logout y restauración al arrancar.
//
// Tolerante a caídas de internet: si un refresh falla por RED (no por sesión
// inválida), NO se desloguea — se reintenta luego. Y las sesiones offline
// locales (sin tokens) funcionan sin nube en absoluto.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue, type AuthState } from '@/context/auth-context'
import {
  AuthError,
  clearSession,
  isSessionExpired,
  loadSession,
  login as loginRequest,
  refreshSession,
  register as registerRequest,
  revokeSession,
  saveSession,
  sessionMsLeft,
} from '@/services/auth'
import type { AuthSession } from '@/types/auth'

// Renovar el access token 1 min antes de que expire (nunca a última hora)
const REFRESH_MARGIN_MS = 60 * 1000
// Reintentar el refresh cada minuto cuando no hay conexión
const REFRESH_RETRY_MS = 60 * 1000

const EXPIRED_NOTICE = 'Tu sesión expiró. Inicia sesión nuevamente.'

function isNetworkError(err: unknown): boolean {
  return err instanceof AuthError && (err.code === 'NETWORK_ERROR' || err.code === 'OFFLINE_LOGIN_FAILED')
}

// Restaura la sesión guardada en localStorage.
// Sesión offline local → authed. Access token vigente → authed.
// Vencido pero con refresh token → 'loading' (renovación silenciosa).
function readInitialState(): AuthState {
  const saved = loadSession()

  if (!saved) return { session: null, status: 'guest', notice: null }

  // Sesión offline local (sin tokens): siempre válida en este PC
  if (!saved.tokens) return { session: saved, status: 'authed', notice: null }

  if (!isSessionExpired(saved)) return { session: saved, status: 'authed', notice: null }

  if (saved.tokens.refresh_token) return { session: saved, status: 'loading', notice: null }

  clearSession()
  return { session: null, status: 'guest', notice: EXPIRED_NOTICE }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(readInitialState)

  useEffect(() => {
    const session = state.session
    // Sin sesión, o sesión offline local: nada que renovar en la nube
    if (!session?.tokens) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const attempt = () => {
      refreshSession(session.tokens!.refresh_token!)
        .then((newSession: AuthSession) => {
          if (cancelled) return
          saveSession(newSession)
          setState({ session: newSession, status: 'authed', notice: null })
        })
        .catch((err: unknown) => {
          if (cancelled) return

          if (isNetworkError(err)) {
            // Sin conexión: NO deslogueamos — trabajamos local y reintentamos
            if (state.status === 'loading') {
              // El effect se re-programa al cambiar a 'authed'
              setState((s) => ({ ...s, status: 'authed' }))
            } else {
              timer = setTimeout(attempt, REFRESH_RETRY_MS)
            }
            return
          }

          // Sesión realmente inválida en el servidor: cerrar sesión
          clearSession()
          setState({ session: null, status: 'guest', notice: EXPIRED_NOTICE })
        })
    }

    if (state.status === 'loading') {
      // Access token vencido al arrancar: renovación silenciosa
      attempt()
      return () => {
        cancelled = true
        if (timer) clearTimeout(timer)
      }
    }

    // Authed: renovar justo antes de cada expiración (15 min por token)
    const msLeft = sessionMsLeft(session)
    if (!Number.isFinite(msLeft)) return

    timer = setTimeout(attempt, Math.max(msLeft - REFRESH_MARGIN_MS, 1000))
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [state.status, state.session])

  const setNotice = useCallback((notice: string | null) => {
    setState((s) => ({ ...s, notice }))
  }, [])

  // La sesión vive en el renderer; el motor de sync (proceso principal)
  // la necesita para subir/bajar datos con su Bearer token
  useEffect(() => {
    void window.api.sync.setSession(state.session)
  }, [state.session])

  const login = useCallback(async (input: Parameters<AuthContextValue['login']>[0]) => {
    const session = await loginRequest(input)
    saveSession(session)
    setState({ session, status: 'authed', notice: null })
  }, [])

  const register = useCallback(async (input: Parameters<AuthContextValue['register']>[0]) => {
    await registerRequest(input)
  }, [])

  const refreshToken = state.session?.tokens?.refresh_token

  const logout = useCallback(
    (reason?: 'expired') => {
      revokeSession(refreshToken) // revoca la sesión en el servidor (si hay red)
      clearSession()
      setState({
        session: null,
        status: 'guest',
        notice: reason === 'expired' ? EXPIRED_NOTICE : null,
      })
    },
    [refreshToken],
  )

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, setNotice, login, register, logout }),
    [state, setNotice, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
