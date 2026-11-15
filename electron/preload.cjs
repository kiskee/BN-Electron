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
  },
})
