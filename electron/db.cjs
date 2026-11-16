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
    },
  }
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
}
