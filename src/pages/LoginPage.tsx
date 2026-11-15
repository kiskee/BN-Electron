import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import logo from '@/assets/logo.png'
import AuthLayout from '@/components/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/auth-context'
import { AuthError } from '@/services/auth'

function LoginPage() {
  const { login, notice, setNotice } = useAuth()
  const location = useLocation()
  const registrado = Boolean((location.state as { registered?: boolean } | null)?.registered)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setCargando(true)

    try {
      await login({ email: email.trim(), password })
      // El estado pasa a 'authed' y ProtectedRoute redirige al Home
    } catch (err) {
      setError(
        err instanceof AuthError ? err.message : 'Error inesperado. Intenta de nuevo.',
      )
    } finally {
      setCargando(false)
    }
  }

  return (
    <AuthLayout>
      {/* ── Tarjeta de login ── */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/40 bg-white/95 p-8 shadow-2xl">
        {/* Logo */}
        <div className="flex flex-col items-center text-center">
          <img
            src={logo}
            alt="Blanco & Negro Sastrería"
            className="h-28 w-28 rounded-full object-cover shadow-xl ring-4 ring-white"
          />
          <p className="mt-4 text-sm text-[#6b4c7a]">Inicia sesión para continuar</p>
        </div>

        {/* Avisos */}
        {registrado && !error && (
          <div
            role="status"
            className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
          >
            Usuario creado exitosamente. Inicia sesión para continuar.
          </div>
        )}
        {notice && !error && (
          <div
            role="status"
            className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700"
          >
            {notice}
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="correo">Correo</Label>
            <Input
              id="correo"
              type="email"
              placeholder="tucorreo@ejemplo.com"
              className="h-11"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contrasena">Contraseña</Label>
            <div className="relative">
              <Input
                id="contrasena"
                type={verPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="h-11 pr-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setVerPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b4c7a] transition-colors hover:text-[#4a2c59]"
                aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {verPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={cargando}
            className="h-11 w-full bg-[#1a1a1a] text-white hover:bg-[#4a2c59]"
          >
            {cargando ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Iniciando sesión…
              </>
            ) : (
              'Iniciar sesión'
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-[#6b4c7a]">
          ¿Olvidaste tu contraseña?
        </p>

        <p className="mt-2 text-center text-sm text-[#6b4c7a]">
          ¿No tienes cuenta?{' '}
          <Link
            to="/register"
            className="font-medium text-[#4a2c59] underline underline-offset-4 hover:text-[#834d94]"
          >
            Regístrate
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

export default LoginPage
