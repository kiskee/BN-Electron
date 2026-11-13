import logo from '@/assets/logi.jpeg'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Destellos de purpurina (como el fondo del logo)
const purpurina =
  'radial-gradient(2px 2px at 24px 32px, rgba(255,255,255,0.55), transparent 100%), ' +
  'radial-gradient(1.5px 1.5px at 96px 18px, rgba(255,255,255,0.40), transparent 100%), ' +
  'radial-gradient(2px 2px at 148px 72px, rgba(255,255,255,0.50), transparent 100%), ' +
  'radial-gradient(1.5px 1.5px at 42px 118px, rgba(255,255,255,0.35), transparent 100%), ' +
  'radial-gradient(2.5px 2.5px at 178px 138px, rgba(255,255,255,0.45), transparent 100%), ' +
  'radial-gradient(1.5px 1.5px at 118px 168px, rgba(255,255,255,0.30), transparent 100%)'

function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* ── Fondo morado (colores del logo) ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#4a2c59] via-[#834d94] to-[#9566a2]" />

      {/* Purpurina */}
      <div
        className="absolute inset-0 opacity-70"
        style={{ backgroundImage: purpurina, backgroundSize: '200px 200px' }}
      />

      {/* Resplandores suaves */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#9566a2]/50 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#4a2c59]/60 blur-3xl" />

      {/* ── Tarjeta de login ── */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/40 bg-white/95 p-8 shadow-2xl">
        {/* Logo */}
        <div className="flex flex-col items-center text-center">
          <img
            src={logo}
            alt="Blanco & Negro Sastrería"
            className="h-32 w-32 rounded-2xl object-cover shadow-xl ring-4 ring-white"
          />
          <h1 className="mt-5 text-2xl font-bold text-[#2b1635]">Sistema de Gestión</h1>
          <p className="mt-1 text-sm text-[#6b4c7a]">Inicia sesión para continuar</p>
        </div>

        {/* Formulario (visual) */}
        <div className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="correo">Correo</Label>
            <Input
              id="correo"
              type="email"
              placeholder="tucorreo@ejemplo.com"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contrasena">Contraseña</Label>
            <Input
              id="contrasena"
              type="password"
              placeholder="••••••••"
              className="h-11"
            />
          </div>

          <Button className="h-11 w-full bg-[#1a1a1a] text-white hover:bg-[#4a2c59]">
            Iniciar sesión
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-[#6b4c7a]">
          ¿Olvidaste tu contraseña?
        </p>
      </div>

      {/* Fecha abajo */}
      <p className="absolute bottom-4 text-xs text-white/70">
        Hoy es {new Date().toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>
    </div>
  )
}

export default LoginPage
