// Indicador de sincronización — estado del motor + botón manual + intervalo.
// Vive en la barra superior del Home (sobre el fondo morado).

import { useEffect, useState } from 'react'
import type { SyncStatus } from '@/types/auth'
import { getSyncStatus, setSyncInterval, subscribeSyncStatus, syncNow } from '@/services/sync'

const INTERVALOS = [15, 30, 60, 120]

function tiempoRelativo(iso: string | null): string {
  if (!iso) return 'nunca'
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutos < 1) return 'recién'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  return horas < 24 ? `hace ${horas} h` : `hace ${Math.floor(horas / 24)} d`
}

const ESTADOS: Record<SyncStatus['state'], { color: string; texto: string }> = {
  idle: { color: 'bg-white/50', texto: 'En espera' },
  syncing: { color: 'bg-sky-300 animate-pulse', texto: 'Sincronizando…' },
  synced: { color: 'bg-emerald-300', texto: 'Sincronizado' },
  offline: { color: 'bg-red-300', texto: 'Sin conexión' },
  error: { color: 'bg-amber-300', texto: 'Error de sync' },
}

function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let cancelado = false

    void getSyncStatus().then((s) => {
      if (!cancelado && s) setStatus(s)
    })

    const unsubscribe = subscribeSyncStatus((s) => {
      setStatus(s)
      setEnviando(s.state === 'syncing')
    })

    return () => {
      cancelado = true
      unsubscribe()
    }
  }, [])

  async function handleSyncNow() {
    setEnviando(true)
    const s = await syncNow()
    if (s) setStatus(s)
    setEnviando(false)
  }

  async function handleIntervalChange(value: string) {
    const aplicado = await setSyncInterval(Number(value))
    setStatus((prev) => (prev ? { ...prev, intervalMinutes: aplicado } : prev))
  }

  const estado = ESTADOS[status?.state ?? 'idle']

  return (
    <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs text-white">
      {/* Estado */}
      <span className={`h-2 w-2 shrink-0 rounded-full ${estado.color}`} aria-hidden />
      <span className="whitespace-nowrap">
        {status?.state === 'synced'
          ? `Sincronizado · ${tiempoRelativo(status.lastSyncAt)}`
          : estado.texto}
      </span>

      {/* Cambios pendientes */}
      {(status?.pending ?? 0) > 0 && (
        <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] whitespace-nowrap">
          {status!.pending} pendiente{status!.pending === 1 ? '' : 's'}
        </span>
      )}

      {/* Botón manual */}
      <button
        type="button"
        onClick={handleSyncNow}
        disabled={enviando || status?.state === 'syncing'}
        className="rounded-full bg-white/25 px-2.5 py-1 font-medium transition-colors hover:bg-white/40 disabled:opacity-50"
      >
        {enviando || status?.state === 'syncing' ? (
          <span className="block h-3 w-3 animate-spin rounded-full border border-white/40 border-t-white" />
        ) : (
          'Sincronizar ahora'
        )}
      </button>

      {/* Intervalo automático */}
      <select
        aria-label="Intervalo de sincronización"
        value={status?.intervalMinutes ?? 60}
        onChange={(e) => handleIntervalChange(e.target.value)}
        className="rounded-full bg-white/15 px-2 py-1 text-[11px] text-white outline-none hover:bg-white/25"
      >
        {INTERVALOS.map((min) => (
          <option key={min} value={min} className="text-[#2b1635]">
            cada {min} min
          </option>
        ))}
      </select>
    </div>
  )
}

export default SyncIndicator
