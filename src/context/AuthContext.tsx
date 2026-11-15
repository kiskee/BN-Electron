// Proveedor global de sesión: login, registro, logout y restauración al arrancar.
//
// El access token vive solo 15 min, pero el refresh token (30 días) se renueva
// en silencio: la app se refresca sola ~1 min antes de cada expiración y al
// abrir al día siguiente. El usuario trabaja todo el día sin volver a loguearse.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue, type AuthState } from '@/context/auth-context'
import {
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

// Renovar el access token 1 min antes de que expire (nunca a última hora)
const REFRESH_MARGIN_MS = 60 * 1000

const EXPIRED_NOTICE = 'Tu sesión expiró. Inicia sesión nuevamente.'

// Restaura la sesión guardada en localStorage.
// Access token vigente → authed. Vencido pero con refresh token → 'loading'
// (el effect lo renueva en silencio). Sin nada → guest.
function readInitialState(): AuthState {
  const saved = loadSession()

  if (!saved) return { session: null, status: 'guest', notice: null }

  if (!isSessionExpired(saved)) return { session: saved, status: 'authed', notice: null }

  if (saved.tokens.refresh_token) return { session: saved, status: 'loading', notice: null }

  clearSession()
  return { session: null, status: 'guest', notice: EXPIRED_NOTICE }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(readInitialState)

  useEffect(() => {
    // ── Refresco silencioso de un access token ya vencido (al arrancar) ──
    if (state.status === 'loading' && state.session) {
      let cancelled = false
      const refreshToken = state.session.tokens.refresh_token

      refreshSession(refreshToken)
        .then((session) => {
          if (cancelled) return
          saveSession(session)
          setState({ session, status: 'authed', notice: null })
        })
        .catch(() => {
          if (cancelled) return
          clearSession()
          setState({ session: null, status: 'guest', notice: EXPIRED_NOTICE })
        })

      return () => {
        cancelled = true
      }
    }

    // ── Renovación programada antes de cada expiración ──
    if (state.status === 'authed' && state.session) {
      const session = state.session
      const msLeft = sessionMsLeft(session)
      if (!Number.isFinite(msLeft)) return

      const timer = setTimeout(() => {
        refreshSession(session.tokens.refresh_token)
          .then((newSession) => {
            saveSession(newSession)
            setState({ session: newSession, status: 'authed', notice: null })
          })
          .catch(() => {
            clearSession()
            setState({ session: null, status: 'guest', notice: EXPIRED_NOTICE })
          })
      }, Math.max(msLeft - REFRESH_MARGIN_MS, 1000))

      return () => clearTimeout(timer)
    }
  }, [state.status, state.session])

  const setNotice = useCallback((notice: string | null) => {
    setState((s) => ({ ...s, notice }))
  }, [])

  const login = useCallback(async (input: Parameters<AuthContextValue['login']>[0]) => {
    const session = await loginRequest(input)
    saveSession(session)
    setState({ session, status: 'authed', notice: null })
  }, [])

  const register = useCallback(async (input: Parameters<AuthContextValue['register']>[0]) => {
    await registerRequest(input)
  }, [])

  const refreshToken = state.session?.tokens.refresh_token

  const logout = useCallback(
    (reason?: 'expired') => {
      revokeSession(refreshToken) // revoca la sesión en el servidor
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
