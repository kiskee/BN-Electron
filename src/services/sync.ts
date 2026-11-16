// Servicio de sincronización — habla con el motor del proceso principal
// (window.api.sync / window.api.records, expuestos por el preload)

import type { LocalRecord, RecordInput, SyncStatus } from '@/types/auth'

// ── Estado ──

export function getSyncStatus(): Promise<SyncStatus | null> {
  return window.api.sync.status()
}

export function syncNow(): Promise<SyncStatus | null> {
  return window.api.sync.now()
}

export function setSyncInterval(minutes: number): Promise<number> {
  return window.api.sync.setIntervalMinutes(minutes)
}

/** Suscribe a los cambios de estado del motor. Devuelve la función para cancelar. */
export function subscribeSyncStatus(callback: (status: SyncStatus) => void): () => void {
  return window.api.sync.onStatus(callback)
}

// ── Registros del negocio (genérico, se sincronizan solos) ──
// Los futuros módulos (clientes, pedidos, facturas...) usan estas funciones.

export function saveRecord(input: RecordInput): Promise<LocalRecord | null> {
  return window.api.records.save(input)
}

export function getRecord(entity: string, entityId: string): Promise<LocalRecord | null> {
  return window.api.records.get({ entity, entityId })
}

export function listRecords(entity: string, includeDeleted = false): Promise<LocalRecord[]> {
  return window.api.records.list({ entity, includeDeleted })
}
