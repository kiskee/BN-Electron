const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  auth: {
    // Devuelven { status, body } — el renderer interpreta el resultado
    login: (payload) => ipcRenderer.invoke('auth:login', payload),
    register: (payload) => ipcRenderer.invoke('auth:register', payload),
    refresh: (payload) => ipcRenderer.invoke('auth:refresh', payload),
    logout: (payload) => ipcRenderer.invoke('auth:logout', payload),
    // Login offline (base local SQLite)
    saveLocalCredentials: (payload) => ipcRenderer.invoke('auth:saveLocalCredentials', payload),
    verifyLocal: (payload) => ipcRenderer.invoke('auth:verifyLocal', payload),
  },
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  },
  syncMeta: {
    get: (key) => ipcRenderer.invoke('syncMeta:get', key),
    set: (key, value) => ipcRenderer.invoke('syncMeta:set', key, value),
  },
  system: {
    info: () => ipcRenderer.invoke('system:info'),
  },
})
