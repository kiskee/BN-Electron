import type { ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import logo from '@/assets/logo.png'
import { AuthBackground, AuthBrand } from '@/components/AuthLayout'
import { AuthProvider } from '@/context/AuthContext'
import { useAuth } from '@/context/auth-context'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'

// Pantalla mientras se restaura la sesión guardada
function LoadingScreen() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4">
      <AuthBackground />
      <AuthBrand />
      <div className="relative z-10 flex flex-col items-center rounded-3xl border border-white/40 bg-white/95 px-10 py-8 shadow-2xl">
        <img
          src={logo}
          alt="Blanco & Negro Sastrería"
          className="h-20 w-20 rounded-full object-cover shadow-xl ring-4 ring-white"
        />
        <div className="mt-4 h-6 w-6 animate-spin rounded-full border-2 border-[#e0d2e9] border-t-[#4a2c59]" />
        <p className="mt-3 text-sm text-[#6b4c7a]">Cargando…</p>
      </div>
    </div>
  )
}

// Solo para usuarios sin sesión (login y registro)
function GuestRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return <LoadingScreen />
  if (status === 'authed') return <Navigate to="/" replace />
  return <>{children}</>
}

// Solo para usuarios con sesión iniciada (home y futuros módulos)
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return <LoadingScreen />
  if (status === 'guest') return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <RegisterPage />
              </GuestRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}

export default App
