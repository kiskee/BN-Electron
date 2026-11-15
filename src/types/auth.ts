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
  tokens: AuthTokens
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
  }
}
