import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { registerBackendIpcHandlers } from './registerBackendIpcHandlers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function resolveRendererEntry(): { type: 'url' | 'file'; value: string } {
  if (process.env.VITE_DEV_SERVER_URL) {
    return {
      type: 'url',
      value: process.env.VITE_DEV_SERVER_URL,
    }
  }

  return {
    type: 'file',
    value: path.join(__dirname, '../dist/index.html'),
  }
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1400,
    height: 920,
    minWidth: 1080,
    minHeight: 680,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  const entry = resolveRendererEntry()
  if (entry.type === 'url') {
    void window.loadURL(entry.value)
  } else {
    void window.loadFile(entry.value)
  }

  return window
}

app.whenReady().then(() => {
  registerBackendIpcHandlers()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
