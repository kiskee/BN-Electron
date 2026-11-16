// Base de datos local (SQLite) — vive en la carpeta de datos del usuario,
// NUNCA dentro del ejecutable. Usa node:sqlite (incluido en Node 24):
// sin módulos nativos, funciona igual en Linux y Windows.
const { DatabaseSync } = require('node:sqlite')
const path = require('node:path')
const fs = require('node:fs')

// Abre (o crea) la base y garantiza el esquema.
// Esquema de la Fase A: credenciales offline, ajustes y andamiaje de sync
// (sync_meta y outbox los usa la Fase B de sincronización).
function openDatabase(userDataDir) {
  fs.mkdirSync(userDataDir, { recursive: true })
  const dbPath = path.join(userDataDir, 'datos.db')
  const db = new DatabaseSync(dbPath)

  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA foreign_keys = ON;')
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_cache (
      username       TEXT PRIMARY KEY,
      email          TEXT,
      password_hash  TEXT NOT NULL,
      hash_encrypted INTEGER NOT NULL DEFAULT 0,
      user_json      TEXT NOT NULL,
      updated_at     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS outbox (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      entity     TEXT NOT NULL,
      entity_id  TEXT NOT NULL,
      action     TEXT NOT NULL,
      payload    TEXT,
      created_at TEXT NOT NULL,
      synced     INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS records (
      entity     TEXT NOT NULL,
      entity_id  TEXT NOT NULL,
      data       TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted    INTEGER NOT NULL DEFAULT 0,
      origin     TEXT,
      dirty      INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (entity, entity_id)
    );

    CREATE INDEX IF NOT EXISTS idx_records_dirty ON records (dirty);
    CREATE INDEX IF NOT EXISTS idx_records_updated ON records (updated_at);
  `)

  return { db, dbPath }
}

// ── Caché de credenciales (login offline) ──

function saveAuthCache(db, { username, email, passwordHash, hashEncrypted, userJson }) {
  db.prepare(`
    INSERT INTO auth_cache (username, email, password_hash, hash_encrypted, user_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(username) DO UPDATE SET
      email = excluded.email,
      password_hash = excluded.password_hash,
      hash_encrypted = excluded.hash_encrypted,
      user_json = excluded.user_json,
      updated_at = excluded.updated_at
  `).run(username, email ?? null, passwordHash, hashEncrypted ? 1 : 0, userJson, new Date().toISOString())
}

function findAuthCache(db, identifier) {
  return db.prepare(`
    SELECT * FROM auth_cache WHERE username = ? OR email = ? LIMIT 1
  `).get(identifier, identifier)
}

// ── Ajustes (clave/valor) ──

function getSetting(db, key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  return row ? row.value : null
}

function setSetting(db, key, value) {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value)
}

// ── Estado de sincronización (Fase B) ──

function getSyncMeta(db, key) {
  const row = db.prepare('SELECT value FROM sync_meta WHERE key = ?').get(key)
  return row ? row.value : null
}

function setSyncMeta(db, key, value) {
  db.prepare(`
    INSERT INTO sync_meta (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value)
}

// Marca un cambio como pendiente de subir (outbox / Fase B)
function enqueueOutbox(db, { entity, entityId, action, payload }) {
  db.prepare(`
    INSERT INTO outbox (entity, entity_id, action, payload, created_at, synced)
    VALUES (?, ?, ?, ?, ?, 0)
  `).run(entity, entityId, action, payload ?? null, new Date().toISOString())
}

// Diagnóstico: ruta y conteos de la base
function dbInfo(db, dbPath) {
  const count = (table) => {
    try {
      const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()
      return Number(row?.n ?? 0)
    } catch {
      return 0
    }
  }

  return {
    dbPath,
    counts: {
      auth_cache: count('auth_cache'),
      settings: count('settings'),
      sync_meta: count('sync_meta'),
      outbox: count('outbox'),
      records: count('records'),
    },
  }
}

// ── Registros del negocio (genérico: se sincronizan con la nube) ──
// entity: "clientes" | "pedidos" | "facturas" | ... entityId: UUID local.

function rowToRecord(row) {
  return {
    entity: row.entity,
    entityId: row.entity_id,
    data: JSON.parse(row.data),
    updatedAt: row.updated_at,
    deleted: Number(row.deleted) === 1,
    dirty: Number(row.dirty) === 1,
    origin: row.origin ?? null,
  }
}

// Guarda un registro localmente y lo marca como pendiente de sincronizar
function saveRecord(db, { entity, entityId, data, deleted = false, updatedAt, origin }) {
  const ts = updatedAt ?? new Date().toISOString()
  db.prepare(`
    INSERT INTO records (entity, entity_id, data, updated_at, deleted, origin, dirty)
    VALUES (?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(entity, entity_id) DO UPDATE SET
      data = excluded.data,
      updated_at = excluded.updated_at,
      deleted = excluded.deleted,
      origin = excluded.origin,
      dirty = 1
  `).run(entity, entityId, JSON.stringify(data ?? {}), ts, deleted ? 1 : 0, origin ?? null)

  return getRecord(db, entity, entityId)
}

function getRecord(db, entity, entityId) {
  const row = db.prepare('SELECT * FROM records WHERE entity = ? AND entity_id = ?').get(entity, entityId)
  return row ? rowToRecord(row) : null
}

function listRecords(db, entity, { includeDeleted = false } = {}) {
  const rows = includeDeleted
    ? db.prepare('SELECT * FROM records WHERE entity = ? ORDER BY updated_at').all(entity)
    : db.prepare('SELECT * FROM records WHERE entity = ? AND deleted = 0 ORDER BY updated_at').all(entity)
  return rows.map(rowToRecord)
}

function countPendingRecords(db) {
  try {
    const row = db.prepare('SELECT COUNT(*) AS n FROM records WHERE dirty = 1').get()
    return Number(row?.n ?? 0)
  } catch {
    return 0
  }
}

function listDirtyRecords(db, limit = 200) {
  return db.prepare('SELECT * FROM records WHERE dirty = 1 ORDER BY updated_at LIMIT ?').all(limit).map(rowToRecord)
}

function markRecordClean(db, entity, entityId) {
  db.prepare('UPDATE records SET dirty = 0 WHERE entity = ? AND entity_id = ?').run(entity, entityId)
}

// Aplica un registro remoto (LWW): solo si es igual o más nuevo que el local
function applyRemoteRecord(db, rec) {
  const local = getRecord(db, rec.entity, rec.entityId)

  if (!local) {
    db.prepare(`
      INSERT INTO records (entity, entity_id, data, updated_at, deleted, origin, dirty)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(rec.entity, rec.entityId, JSON.stringify(rec.data ?? {}), rec.updatedAt, rec.deleted ? 1 : 0, rec.origin ?? null)
    return 'applied'
  }

  if (rec.updatedAt >= local.updatedAt) {
    db.prepare(`
      UPDATE records SET data = ?, updated_at = ?, deleted = ?, origin = ?, dirty = 0
      WHERE entity = ? AND entity_id = ?
    `).run(JSON.stringify(rec.data ?? {}), rec.updatedAt, rec.deleted ? 1 : 0, rec.origin ?? local.origin, rec.entity, rec.entityId)
    return 'applied'
  }

  return 'skipped' // el local es más nuevo: se manda en el próximo push
}

module.exports = {
  openDatabase,
  saveAuthCache,
  findAuthCache,
  getSetting,
  setSetting,
  getSyncMeta,
  setSyncMeta,
  enqueueOutbox,
  dbInfo,
  saveRecord,
  getRecord,
  listRecords,
  countPendingRecords,
  listDirtyRecords,
  markRecordClean,
  applyRemoteRecord,
}
