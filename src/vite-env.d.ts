/// <reference types="vite/client" />

declare global {
  interface Window {
    // Puente expuesto por electron/preload.cjs
    api: import('./types/auth').WindowApi
  }
}

export {}
