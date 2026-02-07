import { app, BrowserWindow, protocol } from 'electron'
import { existsSync } from 'node:fs'
import path from 'node:path'

import { MEDIA_PROTOCOL_SCHEME } from './channels'
import { registerBackendIpcHandlers } from './registerBackendIpcHandlers'

const __dirname = path.dirname(path.resolve(process.argv[1] ?? '.'))

function normalizeProxyServer(rawValue: string | undefined): string | null {
  const value = (rawValue ?? '').trim()
  if (!value) {
    return null
  }

  if (value.startsWith('socks5h://')) {
    return `socks5://${value.slice('socks5h://'.length)}`
  }

  return value
}

function resolveProxyServer(): string | null {
  return (
    normalizeProxyServer(process.env.MEDIA_PLAYERX_PROXY_SERVER) ??
    normalizeProxyServer(process.env.ALL_PROXY) ??
    normalizeProxyServer(process.env.all_proxy) ??
    normalizeProxyServer(process.env.HTTPS_PROXY) ??
    normalizeProxyServer(process.env.https_proxy) ??
    normalizeProxyServer(process.env.HTTP_PROXY) ??
    normalizeProxyServer(process.env.http_proxy)
  )
}

function resolveProxyBypassList(): string {
  const raw =
    process.env.MEDIA_PLAYERX_PROXY_BYPASS ??
    process.env.NO_PROXY ??
    process.env.no_proxy ??
    'localhost,127.0.0.1,::1,<local>,*.local'

  return raw
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join(';')
}

function applyElectronProxy(): void {
  const proxyServer = resolveProxyServer()
  if (!proxyServer) {
    return
  }

  app.commandLine.appendSwitch('proxy-server', proxyServer)
  app.commandLine.appendSwitch('proxy-bypass-list', resolveProxyBypassList())
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: MEDIA_PROTOCOL_SCHEME,
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
    },
  },
])

applyElectronProxy()

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

function resolvePreloadEntry(): string {
  const candidates = ['preload.cjs', 'preload.js', 'preload.ts']
  for (const candidate of candidates) {
    const resolved = path.join(__dirname, candidate)
    if (existsSync(resolved)) {
      return resolved
    }
  }

  return path.join(__dirname, 'preload.cjs')
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
      preload: resolvePreloadEntry(),
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
