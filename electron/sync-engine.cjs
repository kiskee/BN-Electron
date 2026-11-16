// Motor de sincronización local-first (multi-PC).
//
// Diseño: los datos SIEMPRE se guardan en SQLite local (instantáneo).
// El motor sube lo pendiente (dirty) y baja lo nuevo cada rato:
// al abrir la app + cada N minutos (configurable) + al cerrar + manual.
//
// Conflictos: LWW (gana la modificación más reciente). Los borrados viajan
// como tumbas (deleted=true) para que se propaguen a los demás PCs.
//
// Sin dependencias de Electron: recibe la base, las URLs y un callback de
// estado — así se puede probar con node puro.
const { listDirtyRecords, markRecordClean, countPendingRecords, applyRemoteRecord } = require('./db.cjs')

const DEFAULT_INTERVAL_MIN = 60
const MIN_INTERVAL_MIN = 5
const MAX_INTERVAL_MIN = 240
const PUSH_BATCH = 200
const PULL_PAGE = 500
const MAX_LOOPS = 20 // seguridad: máx ~4000 registros por sincronización
const FETCH_TIMEOUT_MS = 20000
const CHANGE_DEBOUNCE_MS = 30000

class SyncHttpError extends Error {
  constructor(status, body) {
    super(body?.error ?? `Error HTTP ${status}`)
    this.status = status
    this.name = 'SyncHttpError'
  }
}

function isNetworkError(err) {
  if (err instanceof SyncHttpError) return false
  // fetch falló (sin red / DNS / timeout)
  return true
}

function decodeExp(token) {
  try {
    const payload = token.split('.')[1]
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return typeof json.exp === 'number' ? json.exp : null
  } catch {
    return null
  }
}

function createSyncEngine({ db, urls, onChange }) {
  const state = {
    state: 'idle', // idle | syncing | synced | offline | error
    lastSyncAt: null,
    pending: 0,
    lastError: null,
    intervalMinutes: DEFAULT_INTERVAL_MIN,
    origin: null,
  }

  let session = null // { tokens: { access_token, refresh_token } } — lo pasa el renderer
  let currentPromise = null
  let timer = null
  let changeTimer = null
  let booted = false

  // ── Estado ──

  function snapshot() {
    return {
      state: state.state,
      lastSyncAt: state.lastSyncAt,
      pending: countPendingRecords(db),
      lastError: state.lastError,
      intervalMinutes: state.intervalMinutes,
      origin: state.origin,
    }
  }

  function emit() {
    if (onChange) onChange(snapshot())
  }

  // ── Sesión (la administra el renderer; el motor solo la usa) ──

  function setSession(nextSession) {
    session = nextSession && nextSession.tokens ? nextSession : null

    // Primera sesión disponible: sincronizar al abrir la app
    if (session && !booted) {
      booted = true
      setTimeout(() => {
        void syncNow()
      }, 2000)
    }
    emit()
  }

  function hasValidToken() {
    const token = session?.tokens?.access_token
    if (!token) return false
    const exp = decodeExp(token)
    if (exp === null) return true // sin exp legible: dejamos que el server decida
    return exp * 1000 - 60000 > Date.now()
  }

  // ── HTTP ──

  async function fetchJson(url, options = {}) {
    let res
    try {
      res = await fetch(url, { ...options, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    } catch (err) {
      err.isNetwork = true
      throw err
    }
    const body = await res.json().catch(() => null)
    if (!res.ok) throw new SyncHttpError(res.status, body)
    return body
  }

  // ── Push: subir pendientes (LWW en el server) ──

  async function pushAll() {
    for (let loop = 0; loop < MAX_LOOPS; loop++) {
      const rows = listDirtyRecords(db, PUSH_BATCH)
      if (rows.length === 0) return

      const body = await fetchJson(urls.push, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.tokens.access_token}`,
        },
        body: JSON.stringify({
          origin: state.origin ?? undefined,
          changes: rows.map((r) => ({
            entity: r.entity,
            entityId: r.entityId,
            data: r.deleted ? null : r.data,
            updatedAt: r.updatedAt,
            deleted: r.deleted,
          })),
        }),
      })

      // Aceptados Y rechazados quedan limpios: los rechazados los trae el pull
      // con la versión más reciente del server (LWW)
      const done = new Set([
        ...(body.accepted ?? []).map((a) => a.entityId),
        ...(body.rejected ?? []).map((a) => a.entityId),
      ])

      for (const row of rows) {
        if (done.has(row.entityId)) markRecordClean(db, row.entity, row.entityId)
      }

      if (done.size === 0) return // nada avanzó: no hacer bucle
    }
  }

  // ── Pull: bajar novedades desde la última sincronización ──

  async function pullSince() {
    for (let loop = 0; loop < MAX_LOOPS; loop++) {
      const since = state.lastSyncAt ? `&since=${encodeURIComponent(state.lastSyncAt)}` : ''
      const body = await fetchJson(`${urls.pull}?limit=${PULL_PAGE}${since}`, {
        headers: { Authorization: `Bearer ${session.tokens.access_token}` },
      })

      for (const rec of body.records ?? []) {
        applyRemoteRecord(db, rec)
      }

      if (body.serverTime) state.lastSyncAt = body.serverTime

      if (!body.hasMore) return
    }
  }

  // ── Sincronización completa ──
  // Las pasadas se SERIALIZAN: si ya hay una en curso, la esperamos y
  // corremos otra para no perder los cambios más recientes (nada se ignora).

  async function runSyncPass() {
    state.state = 'syncing'
    state.lastError = null
    emit()

    try {
      await pushAll()
      await pullSince()
      state.state = 'synced'
      if (!state.lastSyncAt) state.lastSyncAt = new Date().toISOString()
    } catch (err) {
      if (isNetworkError(err)) {
        state.state = 'offline'
        state.lastError = 'Sin conexión con el servidor'
      } else {
        state.state = 'error'
        state.lastError = err?.message ?? 'Error de sincronización'
      }
    } finally {
      emit()
    }

    return snapshot()
  }

  function syncNow() {
    if (!session) return Promise.resolve(snapshot()) // sin sesión de nube: nada que hacer

    if (!hasValidToken()) {
      state.lastError = 'Esperando renovación de sesión para sincronizar'
      emit()
      return Promise.resolve(snapshot())
    }

    if (!currentPromise) {
      currentPromise = runSyncPass().finally(() => {
        currentPromise = null
      })
      return currentPromise
    }

    // Pasada en curso: al terminar, correr una más (recoge lo que llegó entretanto)
    return currentPromise.then(
      () => (currentPromise ? currentPromise : syncNow()),
      () => (currentPromise ? currentPromise : syncNow()),
    )
  }

  // ── Programación ──

  function reschedule() {
    if (timer) clearInterval(timer)
    const minutes = Math.min(MAX_INTERVAL_MIN, Math.max(MIN_INTERVAL_MIN, Number(state.intervalMinutes) || DEFAULT_INTERVAL_MIN))
    timer = setInterval(() => {
      void syncNow()
    }, minutes * 60 * 1000)
    if (timer.unref) timer.unref()
  }

  function setIntervalMinutes(minutes) {
    state.intervalMinutes = Math.min(MAX_INTERVAL_MIN, Math.max(MIN_INTERVAL_MIN, Number(minutes) || DEFAULT_INTERVAL_MIN))
    reschedule()
    emit()
    return state.intervalMinutes
  }

  // Tras guardar un registro local: intentar subirlo pronto (debounce)
  function notifyLocalChange() {
    if (changeTimer) clearTimeout(changeTimer)
    changeTimer = setTimeout(() => {
      void syncNow()
    }, CHANGE_DEBOUNCE_MS)
    if (changeTimer.unref) changeTimer.unref()
    emit()
  }

  function start({ intervalMinutes, lastSyncAt, origin } = {}) {
    if (origin) state.origin = origin
    if (lastSyncAt) state.lastSyncAt = lastSyncAt
    if (intervalMinutes) state.intervalMinutes = Math.min(MAX_INTERVAL_MIN, Math.max(MIN_INTERVAL_MIN, Number(intervalMinutes) || DEFAULT_INTERVAL_MIN))
    reschedule()
    emit()
  }

  function stop() {
    if (timer) clearInterval(timer)
    if (changeTimer) clearTimeout(changeTimer)
    timer = null
    changeTimer = null
  }

  return {
    setSession,
    syncNow,
    notifyLocalChange,
    setIntervalMinutes,
    start,
    stop,
    getStatus: snapshot,
  }
}

module.exports = { createSyncEngine, DEFAULT_INTERVAL_MIN }
