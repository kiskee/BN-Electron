// Tipos compartidos del flujo de autenticación
// (espejo de las respuestas del backend B&N)

export interface AuthUser {
  id: string
  nombre: string
  username: string
  email: string
  role: 'admin' | 'empleado'
  ultimoLogin: string | null
  createdAt?: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface AuthSession {
  user: AuthUser
  /** null = sesión offline local (sin tokens de la nube) */
  tokens: AuthTokens | null
  offline?: boolean
}

export interface LoginInput {
  email?: string
  username?: string
  password: string
}

export interface RegisterInput {
  nombre: string
  username: string
  email: string
  password: string
}

export interface ValidationError {
  field: string
  message: string
}

export interface ApiBody {
  error?: string
  code?: string
  message?: string
  details?: ValidationError[]
  retryAfter?: number
  user?: AuthUser
  tokens?: AuthTokens
}

export interface ApiResponse {
  status: number
  body: ApiBody | null
}

export interface WindowApi {
  platform: string
  versions: {
    electron: string
    chrome: string
    node: string
  }
  auth: {
    login: (payload: LoginInput) => Promise<ApiResponse>
    register: (payload: RegisterInput) => Promise<ApiResponse>
    refresh: (payload: { refresh_token: string }) => Promise<ApiResponse>
    logout: (payload: { refresh_token: string }) => Promise<ApiResponse>
    saveLocalCredentials: (payload: LocalCredentialsInput) => Promise<void>
    verifyLocal: (payload: { identifier: string; password: string }) => Promise<{ user: AuthUser } | null>
  }
  settings: {
    get: (key: string) => Promise<string | null>
    set: (key: string, value: string) => Promise<void>
  }
  syncMeta: {
    get: (key: string) => Promise<string | null>
    set: (key: string, value: string) => Promise<void>
  }
  records: {
    save: (payload: RecordInput) => Promise<LocalRecord | null>
    get: (payload: { entity: string; entityId: string }) => Promise<LocalRecord | null>
    list: (payload: { entity: string; includeDeleted?: boolean }) => Promise<LocalRecord[]>
  }
  sync: {
    setSession: (session: AuthSession | null) => Promise<void>
    now: () => Promise<SyncStatus | null>
    status: () => Promise<SyncStatus | null>
    setIntervalMinutes: (minutes: number) => Promise<number>
    onStatus: (callback: (status: SyncStatus) => void) => () => void
  }
  system: {
    info: () => Promise<SystemInfo>
  }
}

export interface LocalCredentialsInput {
  email?: string
  username?: string
  password: string
  user: AuthUser
}

export interface SystemInfo {
  platform: string
  versions: {
    electron: string
    chrome: string
    node: string
  }
  dbPath: string | null
  counts: Record<string, number>
}

// ── Sincronización y registros locales ──

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'synced' | 'offline' | 'error'
  lastSyncAt: string | null
  pending: number
  lastError: string | null
  intervalMinutes: number
  origin: string | null
}

export interface RecordInput {
  entity: string
  entityId: string
  data: Record<string, unknown>
  deleted?: boolean
  updatedAt?: string
  origin?: string
}

export interface LocalRecord {
  entity: string
  entityId: string
  data: Record<string, unknown>
  updatedAt: string
  deleted: boolean
  dirty: boolean
  origin: string | null
}
