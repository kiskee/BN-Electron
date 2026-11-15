import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import logo from '@/assets/logo.png'
import AuthLayout from '@/components/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/auth-context'
import { AuthError } from '@/services/auth'
import { validateRegisterForm, type RegisterFormErrors } from '@/lib/validation'

function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [nombre, setNombre] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [errores, setErrores] = useState<RegisterFormErrors>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorGeneral(null)

    const data = {
      nombre,
      username,
      email,
      password,
      confirmar,
    }
    const errs = validateRegisterForm(data)
    setErrores(errs)
    if (Object.keys(errs).length > 0) return

    setCargando(true)
    try {
      await register({
        nombre: nombre.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
      })
      // Éxito: volvemos al login con aviso de usuario creado
      navigate('/login', { state: { registered: true }, replace: true })
    } catch (err) {
      if (err instanceof AuthError) {
        // 409: email o username duplicados (los marca el backend)
        if (err.code === 'EMAIL_TAKEN') setErrores({ email: 'El email ya está registrado' })
        else if (err.code === 'USERNAME_TAKEN') setErrores({ username: 'El username ya está en uso' })
        else if (err.code === 'VALIDATION_ERROR') {
          const fieldErrors: RegisterFormErrors = {}
          for (const d of err.details) {
            if (d.field === 'nombre' || d.field === 'username' || d.field === 'email' || d.field === 'password') {
              fieldErrors[d.field] = d.message
            }
          }
          setErrores(fieldErrors)
        }
        setErrorGeneral(err.message)
      } else {
        setErrorGeneral('Error inesperado. Intenta de nuevo.')
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <AuthLayout>
      {/* ── Tarjeta de registro ── */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/40 bg-white/95 p-8 shadow-2xl">
        {/* Logo */}
        <div className="flex flex-col items-center text-center">
          <img
            src={logo}
            alt="Blanco & Negro Sastrería"
            className="h-24 w-24 rounded-full object-cover shadow-xl ring-4 ring-white"
          />
          <h2 className="mt-4 text-xl font-semibold text-[#4a2c59]">Crea tu cuenta</h2>
          <p className="mt-1 text-sm text-[#6b4c7a]">Únete a Blanco &amp; Negro Sastrería</p>
        </div>

        {errorGeneral && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {errorGeneral}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              type="text"
              placeholder="Tu nombre completo"
              className="h-11"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="name"
              aria-invalid={Boolean(errores.nombre)}
              required
            />
            {errores.nombre && <p className="text-xs text-red-600">{errores.nombre}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="tu_usuario"
              className="h-11"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              aria-invalid={Boolean(errores.username)}
              required
            />
            {errores.username && <p className="text-xs text-red-600">{errores.username}</p>}
          </div>

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
              aria-invalid={Boolean(errores.email)}
              required
            />
            {errores.email && <p className="text-xs text-red-600">{errores.email}</p>}
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
                autoComplete="new-password"
                aria-invalid={Boolean(errores.password)}
                required
              />
              <button
                type="button"
                onClick={() => setVerPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b4c7a] transition-colors hover:text-[#4a2c59]"
                aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {verPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errores.password ? (
              <p className="text-xs text-red-600">{errores.password}</p>
            ) : (
              <p className="text-xs text-[#6b4c7a]">
                Mínimo 8 caracteres, con mayúscula, minúscula y número
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmar">Confirmar contraseña</Label>
            <div className="relative">
              <Input
                id="confirmar"
                type={verPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="h-11 pr-11"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                autoComplete="new-password"
                aria-invalid={Boolean(errores.confirmar)}
                required
              />
            </div>
            {errores.confirmar && <p className="text-xs text-red-600">{errores.confirmar}</p>}
          </div>

          <Button
            type="submit"
            disabled={cargando}
            className="h-11 w-full bg-[#1a1a1a] text-white hover:bg-[#4a2c59]"
          >
            {cargando ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Creando cuenta…
              </>
            ) : (
              'Crear cuenta'
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[#6b4c7a]">
          ¿Ya tienes cuenta?{' '}
          <Link
            to="/login"
            className="font-medium text-[#4a2c59] underline underline-offset-4 hover:text-[#834d94]"
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

export default RegisterPage
