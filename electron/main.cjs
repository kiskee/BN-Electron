const { app, BrowserWindow, ipcMain, nativeImage } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const { openDatabase, getSetting, setSetting, getSyncMeta, setSyncMeta, dbInfo } = require('./db.cjs')
const { saveLocalCredentials, verifyLocal } = require('./local-auth.cjs')

// ── Variables de entorno (.env en la raíz del proyecto) ──
// LOGIN, REGISTER, REFRESH y LOGOUT apuntan a los endpoints de auth.
// OJO: en la app empaquetada el .env vive dentro del app.asar y
// process.loadEnvFile NO puede leer de ahí (usa bindings crudos de Node).
// fs.readFileSync sí está parcheado por Electron para leer asar, así que
// leemos el archivo a mano y lo parseamos.
function loadEnvFile() {
  const candidates = [
    path.join(__dirname, '..', '.env'), // dev (raíz del proyecto) y empaquetado (app.asar/.env)
    path.join(app.getAppPath(), '.env'), // raíz del paquete
    path.join(process.resourcesPath, 'app.asar', '.env'), // junto al ejecutable empaquetado
    path.join(process.resourcesPath, '.env'), // .env externo (junto al binario)
    path.join(process.cwd(), '.env'),
  ]

  for (const file of candidates) {
    try {
      const raw = fs.readFileSync(file, 'utf8')
      for (const line of raw.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
        // No pisar variables ya definidas en el entorno del sistema
        if (match && process.env[match[1]] === undefined) {
          process.env[match[1]] = match[2].trim()
        }
      }
      console.log(`[auth] .env cargado desde: ${file}`)
      return file
    } catch {
      // Probar el siguiente candidato
    }
  }

  console.warn('[auth] No se encontró el archivo .env — LOGIN/REGISTER/REFRESH/LOGOUT deben venir del entorno')
  return null
}

loadEnvFile()

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL)

// ── Llamadas HTTP al backend de auth ──
// Se hacen desde el proceso principal (Node) para evitar los problemas de
// CORS del renderer y mantener las URLs fuera del bundle de la interfaz.
async function authRequest(url, payload) {
  if (!url) {
    return {
      status: 0,
      body: {
        error: 'El endpoint de autenticación no está configurado en el archivo .env',
        code: 'CONFIG_ERROR',
      },
    }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload ?? {}),
      signal: AbortSignal.timeout(15000),
    })

    const body = await res.json().catch(() => null)
    return { status: res.status, body }
  } catch {
    return {
      status: 0,
      body: {
        error: 'No se pudo conectar con el servidor. Revisa tu conexión.',
        code: 'NETWORK_ERROR',
      },
    }
  }
}

// Endpoints derivados del LOGIN si no están definidos explícitamente en .env
function derivedEndpoint(fallbackPath) {
  const login = process.env.LOGIN
  return login ? login.replace(/\/auth\/login\/?$/, fallbackPath) : undefined
}

const REFRESH_URL = process.env.REFRESH || derivedEndpoint('/auth/refresh')
const LOGOUT_URL = process.env.LOGOUT || derivedEndpoint('/auth/logout')

ipcMain.handle('auth:login', (_event, payload) => authRequest(process.env.LOGIN, payload))
ipcMain.handle('auth:register', (_event, payload) => authRequest(process.env.REGISTER, payload))
ipcMain.handle('auth:refresh', (_event, payload) => authRequest(REFRESH_URL, payload))
ipcMain.handle('auth:logout', (_event, payload) => authRequest(LOGOUT_URL, payload))

// ── Base de datos local (SQLite en la carpeta de datos del usuario) ──
let db = null
let dbPath = null

// ── Login offline y ajustes (IPC local) ──
// Cachear credenciales tras login online para poder entrar sin internet
ipcMain.handle('auth:saveLocalCredentials', async (_event, payload) => {
  if (!db) return
  await saveLocalCredentials(db, payload)
})

// Verificar contraseña contra la copia local (modo sin conexión)
ipcMain.handle('auth:verifyLocal', async (_event, payload) => {
  if (!db) return null
  const user = await verifyLocal(db, payload)
  return user ? { user } : null
})

// Ajustes clave/valor (ej: intervalo de sincronización)
ipcMain.handle('settings:get', (_event, key) => (db ? getSetting(db, key) : null))
ipcMain.handle('settings:set', (_event, key, value) => {
  if (db) setSetting(db, key, value)
})

// Estado de sincronización (lo usa la Fase B)
ipcMain.handle('syncMeta:get', (_event, key) => (db ? getSyncMeta(db, key) : null))
ipcMain.handle('syncMeta:set', (_event, key, value) => {
  if (db) setSyncMeta(db, key, value)
})

// Diagnóstico: ruta de la base, conteos y versiones
ipcMain.handle('system:info', () => ({
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  ...(db ? dbInfo(db, dbPath) : { dbPath: null, counts: {} }),
}))

function createWindow() {
  // Icono de la ventana (barra de tareas / escritorio).
  // fs.readFileSync sí lee dentro del asar; nativeImage.createFromBuffer lo recibe en memoria.
  let windowIcon
  try {
    windowIcon = nativeImage.createFromBuffer(fs.readFileSync(path.join(__dirname, 'icon.png')))
  } catch {
    // Sin icono: usa el de por defecto
  }

  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    icon: windowIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL) // servidor de Vite
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html')) // build de producción
  }
}

app.whenReady().then(() => {
  // Abrir la base local antes de crear la ventana
  try {
    const opened = openDatabase(app.getPath('userData'))
    db = opened.db
    dbPath = opened.dbPath
    console.log(`[db] base local abierta: ${dbPath}`)
  } catch (err) {
    console.error('[db] no se pudo abrir la base local:', err)
  }

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Cerrar la base local limpiamente al salir
app.on('will-quit', () => {
  try {
    if (db) db.close()
  } catch {
    // ya estaba cerrada
  }
})
