# ⚡ Mi App de Escritorio — Vite + React + Tailwind + shadcn/ui + Electron

Proyecto base (starter) para crear aplicaciones de escritorio con:

| Tecnología       | Para qué sirve                                  |
| ---------------- | ----------------------------------------------- |
| **Vite**         | Bundler y servidor de desarrollo (súper rápido) |
| **React 19**     | Interfaz de usuario                             |
| **TypeScript 7** | Tipado estático                                 |
| **Tailwind CSS 4** | Estilos utilitarios                           |
| **shadcn/ui**    | Componentes de UI (Base UI + Lucide)            |
| **Electron 45**  | Convierte la app web en app de escritorio       |
| **electron-builder** | Genera los instaladores (.AppImage, .exe, .dmg) |

---

## 📋 Requisitos

- **Node.js** 20.19+ (o 22+). Verificar: `node -v`
- **npm** 10+. Verificar: `npm -v`

---

## 🛠️ Cómo se creó este proyecto (paso a paso)

> Estos son todos los comandos necesarios para crear el proyecto desde cero.
> Si quieres replicarlo, crea una carpeta vacía y ejecuta cada bloque en orden.

### 1. Crear el proyecto con Vite (React + TypeScript)

```bash
npm create vite@latest . -- --template react-ts
npm install
```

### 2. Instalar Tailwind CSS v4

```bash
npm install -D tailwindcss @tailwindcss/vite
```

Configurar el plugin en `vite.config.ts`:

```ts
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './', // ← IMPORTANTE: rutas relativas para Electron (file://)
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
```

Y dejar el CSS inicial en `src/index.css`:

```css
@import "tailwindcss";
```

### 3. Configurar el alias `@/` en TypeScript

En `tsconfig.app.json` (dentro de `compilerOptions`):

```json
"paths": {
  "@/*": ["./src/*"]
}
```

> ⚠️ Importante: agrega el mismo `paths` también en el `tsconfig.json` raíz,
> si no, el CLI de shadcn no resuelve el alias y crea una carpeta literal `@/`.
>
> ```json
> {
>   "compilerOptions": { "paths": { "@/*": ["./src/*"] } },
>   "files": [],
>   "references": [...]
> }
> ```
>
> Nota: con TypeScript 6/7 no se usa `baseUrl` (fue eliminado); los `paths`
> se resuelven relativos al `tsconfig`.

### 4. Instalar y configurar shadcn/ui

```bash
npx shadcn@latest init -y --no-monorepo -b base -p nova
```

- `-b base` → usa **Base UI** como librería de componentes (también puedes usar `-b radix` o `-b aria`)
- `-p nova` → preset de estilo **Nova** (iconos Lucide, fuente Geist)

Agregar componentes de UI (los que necesites):

```bash
npx shadcn@latest add button card badge
npx shadcn@latest add dialog dropdown-menu input form table # ... los que quieras
```

Los componentes quedan en `src/components/ui/`.

### 5. Agregar Electron

```bash
npm install -D electron electron-builder concurrently wait-on cross-env
```

Crear `electron/main.cjs` (proceso principal):

```js
const { app, BrowserWindow } = require('electron')
const path = require('node:path')

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL)

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
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
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

Crear `electron/preload.cjs` (puente seguro renderer ↔ main):

```js
const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
})
```

Agregar en `package.json`:

```json
{
  "main": "electron/main.cjs",
  "scripts": {
    "dev": "concurrently -k -n vite,electron -c cyan,magenta \"vite\" \"wait-on http://localhost:5173 && cross-env VITE_DEV_SERVER_URL=http://localhost:5173 electron .\"",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "start": "electron .",
    "dist": "npm run build && electron-builder",
    "dist:linux": "npm run build && electron-builder --linux",
    "dist:win": "npm run build && electron-builder --win",
    "dist:mac": "npm run build && electron-builder --mac"
  }
}
```

### 6. Configurar electron-builder (instaladores)

En `package.json`, la sección `"build"`:

```json
"build": {
  "appId": "com.danim.miappescritorio",
  "productName": "Mi App Escritorio",
  "directories": { "output": "release" },
  "files": ["dist/**", "electron/**", "package.json"],
  "linux": { "target": ["AppImage"], "category": "Utility" },
  "win": { "target": ["nsis"] },
  "mac": { "target": ["dmg"] }
}
```

---

## 🚀 Comandos de uso diario

| Comando              | Qué hace                                                        |
| -------------------- | --------------------------------------------------------------- |
| `npm run dev`        | 🔥 Desarrollo: abre la app con hot-reload (Vite + Electron)     |
| `npm run build`      | Compila TypeScript + genera el build web en `dist/`             |
| `npm run preview`    | Previsualiza el build web en el navegador (sin Electron)        |
| `npm run start`      | Abre la app de Electron usando el build de `dist/`              |
| `npm run dist`       | 📦 Genera el instalador para tu sistema (en `release/`)         |
| `npm run dist:linux` | 📦 Genera el **.AppImage** de Linux                             |
| `npm run dist:win`   | 📦 Genera el **.exe** (NSIS) de Windows                         |
| `npm run dist:mac`   | 📦 Genera el **.dmg** de macOS                                  |
| `npx shadcn@latest add <componente>` | Agrega un componente de shadcn/ui a `src/components/ui/` |

### Flujo típico

```bash
npm run dev        # desarrollar
npm run dist       # generar el instalador → release/Mi App Escritorio-0.1.0.AppImage
```

---

## 📁 Estructura del proyecto

```
.
├── electron/
│   ├── main.cjs          # Proceso principal de Electron (crea la ventana)
│   └── preload.cjs       # Puente seguro entre renderer y main
├── src/
│   ├── components/ui/    # Componentes de shadcn/ui (button, card, badge...)
│   ├── lib/
│   │   └── utils.ts      # Helper cn() de shadcn
│   ├── App.tsx           # Componente principal de la UI
│   ├── main.tsx          # Punto de entrada de React
│   ├── index.css         # Tema de Tailwind + variables de shadcn
│   └── vite-env.d.ts     # Tipos (incluye window.api de Electron)
├── dist/                 # Build web de producción (generado)
├── release/              # Instaladores generados (generado)
├── components.json       # Configuración de shadcn/ui
├── vite.config.ts        # Configuración de Vite (+ Tailwind, alias @/)
└── package.json          # Scripts, dependencias y config de electron-builder
```

---

## 🔌 Comunicación entre procesos (IPC)

El preload expone una API segura en `window.api` (ver `electron/preload.cjs`).
Ejemplo en un componente:

```tsx
const { electron } = window.api.versions
```

Para agregar más métodos:

1. Expón la función en `electron/preload.cjs` dentro de `contextBridge.exposeInMainWorld`.
2. Si necesitas el proceso principal, usa `ipcMain.handle()` en `electron/main.cjs` e `ipcRenderer.invoke()` en el preload.
3. Agrega los tipos en `src/vite-env.d.ts` (interface `ElectronAPI`).

---

## 🧯 Problemas comunes y soluciones

| Problema | Solución |
| -------- | -------- |
| shadcn crea una carpeta literal `@/` | Agrega `"paths": { "@/*": ["./src/*"] }` al `tsconfig.json` **raíz** y vuelve a ejecutar el comando. |
| Error `TS5102: Option 'baseUrl' has been removed` | Estás en TypeScript 6/7+: elimina `baseUrl`, los `paths` funcionan sin él. |
| Pantalla en negro al abrir el build | Verifica que `vite.config.ts` tenga `base: './'`. |
| `window.api` no existe en TypeScript | Revisa que `src/vite-env.d.ts` tenga la `interface Window` declarada. |
| Error al instalar Electron en Windows | Ejecuta PowerShell como administrador o `npm install-scripts approve electron-winstaller`. |
| Quieres usar Radix en vez de Base UI | `npx shadcn@latest init -y --no-monorepo -b radix` (luego re-agrega componentes). |
| La app no abre ventana en Linux (Wayland) | Prueba con `electron . --enable-features=UseOzonePlatform --ozone-platform=wayland`. |

---

## 📦 Generar el instalador final

```bash
npm run dist
```

El instalador queda en la carpeta `release/`:

- 🐧 Linux: `Mi App Escritorio-0.1.0.AppImage` (ejecutable portátil)
- 🪟 Windows: `Mi App Escritorio Setup 0.1.0.exe`
- 🍎 macOS: `Mi App Escritorio-0.1.0.dmg`

> 💡 Cada plataforma genera su instalador desde su propio sistema operativo
> (para hacer el `.exe` necesitas Windows o Wine, y para el `.dmg` necesitas macOS).
