// Servicio de autenticación — llama al backend vía IPC (window.api.auth)
// y administra la sesión guardada en localStorage.

import type {
  ApiResponse,
  AuthSession,
  LoginInput,
  RegisterInput,
  ValidationError,
} from '@/types/auth'

const SESSION_KEY = 'bn.session'

// ── Errores ──

export class AuthError extends Error {
  code: string
  status: number
  details: ValidationError[]
  retryAfter: number | null

  constructor(
    message: string,
    options: { code?: string; status?: number; details?: ValidationError[]; retryAfter?: number | null } = {},
  ) {
    super(message)
    this.name = 'AuthError'
    this.code = options.code ?? 'UNKNOWN'
    this.status = options.status ?? 0
    this.details = options.details ?? []
    this.retryAfter = options.retryAfter ?? null
  }
}

function buildError(res: ApiResponse): AuthError {
  const body = res.body
  const code = body?.code ?? 'UNKNOWN'

  if (code === 'VALIDATION_ERROR' && body?.details?.length) {
    return new AuthError(body.details.map((d) => d.message).join(' · '), {
      code,
      status: res.status,
      details: body.details,
    })
  }

  if (code === 'RATE_LIMIT_EXCEEDED') {
    const segundos = body?.retryAfter ?? 60
    return new AuthError(`Demasiados intentos. Intenta de nuevo en ${segundos} segundos.`, {
      code,
      status: res.status,
      retryAfter: body?.retryAfter ?? null,
    })
  }

  const messages: Record<string, string> = {
    INVALID_CREDENTIALS: 'Credenciales inválidas. Verifica tu correo y contraseña.',
    INVALID_REFRESH_TOKEN: 'Tu sesión expiró. Inicia sesión nuevamente.',
    EMAIL_TAKEN: 'El email ya está registrado.',
    USERNAME_TAKEN: 'El username ya está en uso.',
    NETWORK_ERROR: body?.error ?? 'No se pudo conectar con el servidor. Revisa tu conexión.',
    CONFIG_ERROR: body?.error ?? 'El endpoint de autenticación no está configurado.',
  }

  return new AuthError(messages[code] ?? body?.error ?? 'Error inesperado. Intenta de nuevo.', {
    code,
    status: res.status,
    details: body?.details ?? [],
    retryAfter: body?.retryAfter ?? null,
  })
}

// ── Requests ──

export async function login(input: LoginInput): Promise<AuthSession> {
  const res = await window.api.auth.login(input)

  if (res.status === 200 && res.body?.user && res.body?.tokens) {
    return { user: res.body.user, tokens: res.body.tokens }
  }

  throw buildError(res)
}

export async function register(input: RegisterInput): Promise<void> {
  const res = await window.api.auth.register(input)

  if (res.status !== 201) {
    throw buildError(res)
  }
}

// Renovación silenciosa: cambia el refresh token (30 días) por access token nuevo.
// El backend rota el refresh token, así que la respuesta ya trae tokens nuevos.
export async function refreshSession(refreshToken: string): Promise<AuthSession> {
  const res = await window.api.auth.refresh({ refresh_token: refreshToken })

  if (res.status === 200 && res.body?.user && res.body?.tokens) {
    return { user: res.body.user, tokens: res.body.tokens }
  }

  throw buildError(res)
}

// Revoca el refresh token en el servidor (logout) — sin esperar respuesta
export function revokeSession(refreshToken: string | undefined): void {
  if (!refreshToken) return
  void window.api.auth.logout({ refresh_token: refreshToken }).catch(() => {})
}

// ── Sesión en localStorage ──

export function saveSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null

    const session = JSON.parse(raw) as AuthSession
    if (!session?.user?.id || !session?.tokens?.access_token) return null

    return session
  } catch {
    return null
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

// ── Expiración del access token (15 min según el backend) ──

function getTokenExp(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof json.exp === 'number' ? json.exp : null
  } catch {
    return null
  }
}

export function isSessionExpired(session: AuthSession): boolean {
  const exp = getTokenExp(session.tokens.access_token)
  if (exp === null) return false // sin exp legible: confiamos en el 401 del backend
  return exp * 1000 <= Date.now()
}

/** Milisegundos que faltan para que expire el access token (mínimo 0). */
export function sessionMsLeft(session: AuthSession): number {
  const exp = getTokenExp(session.tokens.access_token)
  if (exp === null) return Number.POSITIVE_INFINITY
  return Math.max(0, exp * 1000 - Date.now())
}
