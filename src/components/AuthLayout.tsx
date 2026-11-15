// Fondo y encabezado compartidos por las pantallas de autenticación
// (mantiene la estética morada de Blanco & Negro Sastrería)

import type { ReactNode } from 'react'

// Destellos de purpurina (como el fondo del logo)
const purpurina =
  'radial-gradient(2px 2px at 24px 32px, rgba(255,255,255,0.55), transparent 100%), ' +
  'radial-gradient(1.5px 1.5px at 96px 18px, rgba(255,255,255,0.40), transparent 100%), ' +
  'radial-gradient(2px 2px at 148px 72px, rgba(255,255,255,0.50), transparent 100%), ' +
  'radial-gradient(1.5px 1.5px at 42px 118px, rgba(255,255,255,0.35), transparent 100%), ' +
  'radial-gradient(2.5px 2.5px at 178px 138px, rgba(255,255,255,0.45), transparent 100%), ' +
  'radial-gradient(2px 2px at 118px 168px, rgba(255,255,255,0.30), transparent 100%)'

export function AuthBackground() {
  return (
    <>
      {/* Fondo morado (colores del logo) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#4a2c59] via-[#834d94] to-[#9566a2]" />

      {/* Purpurina */}
      <div
        className="absolute inset-0 opacity-70"
        style={{ backgroundImage: purpurina, backgroundSize: '200px 200px' }}
      />

      {/* Resplandores suaves */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#9566a2]/50 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#4a2c59]/60 blur-3xl" />
    </>
  )
}

export function AuthBrand() {
  return (
    <div className="relative z-10 mb-6 text-center">
      <h1
        className="font-serif text-5xl font-semibold text-white"
        style={{ fontVariant: 'small-caps', textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}
      >
        Blanco <span className="italic font-normal">&amp;</span> Negro
      </h1>
      <p
        className="mt-1 font-serif text-xl text-white/90"
        style={{ letterSpacing: '0.45em', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
      >
        SASTRERÍA
      </p>
    </div>
  )
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4">
      <AuthBackground />
      <AuthBrand />
      {children}

      {/* Fecha abajo */}
      <p className="absolute bottom-4 text-xs text-white/70">
        Hoy es{' '}
        {new Date().toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>
    </div>
  )
}
