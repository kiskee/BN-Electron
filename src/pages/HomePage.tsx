// Página inicial autenticada — dashboard placeholder
// (los módulos reales se agregan después: clientes, pedidos, inventario…)

import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Clock,
  LogOut,
  Mail,
  Package,
  Scissors,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react'
import logo from '@/assets/logo.png'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth-context'
import type { AuthUser } from '@/types/auth'

const modulos = [
  {
    titulo: 'Clientes',
    descripcion: 'Registro y seguimiento de clientes de la sastrería',
    Icono: Users,
  },
  {
    titulo: 'Pedidos',
    descripcion: 'Órdenes de trabajo, medidas y estados de confección',
    Icono: ClipboardList,
  },
  {
    titulo: 'Inventario',
    descripcion: 'Telas, insumos y materiales disponibles',
    Icono: Package,
  },
  {
    titulo: 'Reportes',
    descripcion: 'Ventas, productividad y estadísticas del negocio',
    Icono: BarChart3,
  },
]

function RoleBadge({ role }: { role: AuthUser['role'] }) {
  const esAdmin = role === 'admin'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        esAdmin
          ? 'bg-[#4a2c59] text-white'
          : 'bg-[#f1e7f7] text-[#4a2c59]'
      }`}
    >
      <ShieldCheck className="h-3 w-3" />
      {esAdmin ? 'Administrador' : 'Empleado'}
    </span>
  )
}

function HomePage() {
  const { session, logout } = useAuth()
  const user = session?.user

  const fecha = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#faf7fc]">
      {/* ── Barra superior ── */}
      <header className="relative z-10 bg-gradient-to-r from-[#4a2c59] via-[#834d94] to-[#9566a2] text-white shadow-lg">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Blanco & Negro Sastrería"
              className="h-11 w-11 rounded-full object-cover shadow ring-2 ring-white/60"
            />
            <div>
              <h1
                className="font-serif text-2xl font-semibold leading-tight"
                style={{ fontVariant: 'small-caps' }}
              >
                Blanco <span className="italic font-normal">&amp;</span> Negro
              </h1>
              <p className="text-[10px] tracking-[0.35em] text-white/80">SASTRERÍA</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5">
              <User className="h-4 w-4 text-white/90" />
              <span className="text-sm font-medium">{user?.nombre}</span>
              {user && <RoleBadge role={user.role} />}
            </div>
            <Button
              variant="outline"
              onClick={() => logout()}
              className="border-white/40 bg-transparent text-white hover:bg-white/15 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      {/* ── Contenido ── */}
      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {/* Bienvenida */}
        <section>
          <p className="flex items-center gap-2 text-sm text-[#6b4c7a]">
            <CalendarDays className="h-4 w-4" />
            <span className="capitalize">{fecha}</span>
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[#2b1635]">
            Bienvenido, {user?.nombre?.split(' ')[0]}
          </h2>
          <p className="mt-1 text-[#6b4c7a]">
            Panel de Blanco &amp; Negro Sastrería. Aquí aparecerán tus módulos de trabajo.
          </p>
        </section>

        {/* Tarjeta del usuario */}
        <section className="mt-8 rounded-2xl border border-[#e0d2e9] bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f1e7f7] text-[#4a2c59]">
              <User className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-[#2b1635]">{user?.nombre}</h3>
                {user && <RoleBadge role={user.role} />}
              </div>
              <div className="mt-2 grid grid-cols-1 gap-1 text-sm text-[#6b4c7a] sm:grid-cols-2">
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {user?.email}
                </p>
                <p className="flex items-center gap-2">
                  <Scissors className="h-4 w-4" />
                  @{user?.username}
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Último acceso:{' '}
                  {user?.ultimoLogin
                    ? new Date(user.ultimoLogin).toLocaleString('es-ES')
                    : 'Este es tu primer acceso'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Módulos futuros */}
        <section className="mt-8">
          <h3 className="text-lg font-semibold text-[#2b1635]">Módulos</h3>
          <p className="text-sm text-[#6b4c7a]">Próximamente en tu panel de sastrería</p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {modulos.map(({ titulo, descripcion, Icono }) => (
              <div
                key={titulo}
                className="group rounded-2xl border border-[#e0d2e9] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f1e7f7] text-[#4a2c59]">
                    <Icono className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-[#f1e7f7] px-2.5 py-0.5 text-xs text-[#6b4c7a]">
                    Próximamente
                  </span>
                </div>
                <h4 className="mt-3 font-semibold text-[#2b1635]">{titulo}</h4>
                <p className="mt-1 text-sm text-[#6b4c7a]">{descripcion}</p>
                <p className="mt-3 flex items-center gap-1 text-sm text-[#4a2c59] opacity-60">
                  Ver módulo
                  <ChevronRight className="h-4 w-4" />
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── Pie ── */}
      <footer className="relative z-10 border-t border-[#e0d2e9] bg-white/60 py-4 text-center text-xs text-[#6b4c7a]">
        Blanco &amp; Negro Sastrería · {fecha}
      </footer>
    </div>
  )
}

export default HomePage
