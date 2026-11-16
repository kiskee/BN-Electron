// Login offline: guarda una copia local de las credenciales (hash bcrypt,
// cifrado con safeStorage del SO cuando está disponible) para poder entrar
// aunque no haya internet. La contraseña en texto plano NUNCA se guarda.
const bcrypt = require('bcryptjs')
const { safeStorage } = require('electron')
const { saveAuthCache, findAuthCache } = require('./db.cjs')

const BCRYPT_COST = 10 // suficiente y rápido para PCs modestos

// Cifra con el llavero del SO (DPAPI en Windows). Si no está disponible,
// guardamos el hash igual: sigue siendo un hash, nunca texto plano.
async function protect(plain) {
  try {
    const available = await safeStorage.isAsyncEncryptionAvailable()
    if (available) {
      const buf = await safeStorage.encryptStringAsync(plain)
      return { data: buf.toString('base64'), encrypted: true }
    }
  } catch {
    // sin llavero disponible
  }
  return { data: plain, encrypted: false }
}

async function unprotect(data, encrypted) {
  if (encrypted) {
    try {
      // decryptStringAsync resuelve a { shouldReEncrypt, result }
      const decrypted = await safeStorage.decryptStringAsync(Buffer.from(data, 'base64'))
      return typeof decrypted === 'string' ? decrypted : (decrypted?.result ?? null)
    } catch {
      return null // no se pudo descifrar (otra máquina/perfil): forzamos login online
    }
  }
  return data
}

// Guarda/actualiza las credenciales del usuario tras un login online exitoso
async function saveLocalCredentials(db, { email, username, password, user }) {
  const name = username || user?.username
  if (!name || !password || !user) return

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST)
  const { data, encrypted } = await protect(passwordHash)

  saveAuthCache(db, {
    username: name,
    email: email ?? user.email,
    passwordHash: data,
    hashEncrypted: encrypted,
    userJson: JSON.stringify(user),
  })
}

// Verifica la contraseña contra la copia local. Devuelve el usuario o null.
async function verifyLocal(db, { identifier, password }) {
  if (!identifier || !password) return null

  const row = findAuthCache(db, identifier.trim())
  if (!row) return null

  const hash = await unprotect(row.password_hash, Number(row.hash_encrypted) === 1)
  if (!hash) return null

  const ok = await bcrypt.compare(password, hash)
  if (!ok) return null

  try {
    return JSON.parse(row.user_json)
  } catch {
    return null
  }
}

module.exports = { saveLocalCredentials, verifyLocal }
