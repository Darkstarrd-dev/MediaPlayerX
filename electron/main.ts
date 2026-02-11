import { app, BrowserWindow, protocol } from 'electron'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { MEDIA_PROTOCOL_SCHEME } from './channels'
import { registerBenchIpcHandlers } from './registerBenchIpcHandlers'
import { registerBackendIpcHandlers } from './registerBackendIpcHandlers'
import {
  getRuntimeDiagnosticsLogPath,
  isRuntimeDiagnosticsVerboseEnabled,
  logRuntimeDiagnostic,
  serializeUnknownError,
} from './runtimeDiagnostics'

function collectAppRootCandidates(): string[] {
  const candidates = new Set<string>()

  try {
    const appPath = app.getAppPath()
    if (appPath.trim().length > 0) {
      candidates.add(path.resolve(appPath))
    }
  } catch {
    // ignore app path probing errors
  }

  const argvEntry = process.argv[1]
  if (typeof argvEntry === 'string' && argvEntry.trim().length > 0) {
    const entryDir = path.dirname(path.resolve(argvEntry))
    candidates.add(path.resolve(entryDir, '..'))
    candidates.add(entryDir)
  }

  candidates.add(path.resolve(process.cwd()))
  return Array.from(candidates)
}

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

function resolveUserDataDir(): string | null {
  const explicit = (process.env.MEDIA_PLAYERX_USER_DATA_DIR ?? '').trim()
  if (explicit.length > 0) {
    return path.resolve(explicit)
  }
  return null
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

tryConfigureCrashDumpsDir()

const userDataDir = resolveUserDataDir()
if (userDataDir) {
  app.setPath('userData', userDataDir)
}

function resolveRendererEntry(): { type: 'url' | 'file'; value: string } {
  if (process.env.VITE_DEV_SERVER_URL) {
    return {
      type: 'url',
      value: process.env.VITE_DEV_SERVER_URL,
    }
  }

  const rendererRelativeCandidates = [
    ['dist', 'index.html'],
    ['..', 'dist', 'index.html'],
  ] as const

  for (const root of collectAppRootCandidates()) {
    for (const relativeCandidate of rendererRelativeCandidates) {
      const candidate = path.resolve(root, ...relativeCandidate)
      if (existsSync(candidate)) {
        return {
          type: 'file',
          value: candidate,
        }
      }
    }
  }

  const fallbackRoot = collectAppRootCandidates()[0] ?? path.resolve(process.cwd())

  return {
    type: 'file',
    value: path.join(fallbackRoot, 'dist', 'index.html'),
  }
}

function resolveBenchMode(): string | null {
  const value = (process.env.MEDIA_PLAYERX_BENCH ?? '').trim()
  return value.length > 0 ? value : null
}

function resolveBenchOutDir(): string | null {
  const raw = (process.env.MEDIA_PLAYERX_BENCH_OUT_DIR ?? '').trim()
  return raw.length > 0 ? path.resolve(raw) : null
}

function resolveBenchIdentity(): { candidateId: string | null; runTag: string | null } {
  const raw = (process.env.MEDIA_PLAYERX_BENCH_CONFIG_JSON ?? '').trim()
  if (!raw) {
    return { candidateId: null, runTag: null }
  }

  try {
    const parsed = JSON.parse(raw) as { candidateId?: unknown; runTag?: unknown }
    const candidateId = typeof parsed.candidateId === 'string' ? parsed.candidateId : null
    const runTag = typeof parsed.runTag === 'string' ? parsed.runTag : null
    return { candidateId, runTag }
  } catch {
    return { candidateId: null, runTag: null }
  }
}

function tryConfigureCrashDumpsDir(): void {
  const benchMode = resolveBenchMode()
  if (!benchMode) {
    return
  }

  const outDir = resolveBenchOutDir()
  if (!outDir) {
    return
  }

  const identity = resolveBenchIdentity()
  const safeCandidate = (identity.candidateId ?? 'unknown').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 64)
  const safeRunTag = (identity.runTag ?? String(Date.now())).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 96)
  const crashDir = path.join(outDir, 'crash-dumps', `${safeCandidate}-${safeRunTag}`)

  try {
    mkdirSync(crashDir, { recursive: true })
    app.setPath('crashDumps', crashDir)
    console.log('[main] crashDumps configured', { crashDir })
  } catch (error) {
    console.warn('[main] crashDumps configure failed', { error: (error as Error).message })
  }
}

function shouldOpenDevTools(): boolean {
  const raw = (process.env.MEDIA_PLAYERX_BENCH_DEVTOOLS ?? '').trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes'
}

function resolvePreloadEntry(): string {
  const roots = collectAppRootCandidates()
  const fileNames = ['preload.cjs', 'preload.js', 'preload.ts']
  const relativeDirs = ['dist-electron', '']

  for (const root of roots) {
    for (const relativeDir of relativeDirs) {
      for (const fileName of fileNames) {
        const resolved = path.join(root, relativeDir, fileName)
        if (existsSync(resolved)) {
          return resolved
        }
      }
    }
  }

  const fallbackRoot = roots[0] ?? path.resolve(process.cwd())
  return path.join(fallbackRoot, 'dist-electron', 'preload.cjs')
}

function createMainWindow(): BrowserWindow {
  const benchMode = resolveBenchMode()
  const window = new BrowserWindow({
    width: 1400,
    height: 920,
    minWidth: 1080,
    minHeight: 680,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      navigateOnDragDrop: false,
      backgroundThrottling: benchMode ? false : true,
      preload: resolvePreloadEntry(),
    },
  })

  // Prevent the default Electron behavior where dropping a file onto the window
  // navigates the current page to a file:// URL.
  // This must be handled in the main process; renderer preventDefault alone is not reliable.
  const entry = resolveRendererEntry()
  const allowedOrigin = entry.type === 'url' ? new URL(entry.value).origin : null
  const allowedFileBase =
    entry.type === 'file'
      ? (() => {
          const url = pathToFileURL(entry.value)
          url.search = ''
          url.hash = ''
          return url.toString()
        })()
      : null

  window.webContents.on('will-navigate', (event, url) => {
    if (allowedOrigin) {
      try {
        if (new URL(url).origin === allowedOrigin) {
          return
        }
      } catch {
        // fallthrough
      }
    }

    if (allowedFileBase && url.startsWith(allowedFileBase)) {
      return
    }

    event.preventDefault()
  })

  window.webContents.on('will-frame-navigate', (event) => {
    // Frame navigations are not expected in this app; block defensively.
    event.preventDefault()
  })

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  if (benchMode) {
    try {
      window.webContents.setBackgroundThrottling(false)
    } catch {
      // ignore
    }
    window.once('ready-to-show', () => {
      try {
        window.show()
        window.focus()
      } catch {
        // ignore
      }
    })
  }

  if (entry.type === 'url') {
    if (benchMode) {
      const url = new URL(entry.value)
      url.searchParams.set('bench', benchMode)
      void window.loadURL(url.toString())
    } else {
      void window.loadURL(entry.value)
    }
  } else {
    if (benchMode) {
      const fileUrl = pathToFileURL(entry.value)
      fileUrl.searchParams.set('bench', benchMode)
      void window.loadURL(fileUrl.toString())
    } else {
      void window.loadFile(entry.value)
    }
  }

  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    logRuntimeDiagnostic(
      'renderer-did-fail-load',
      {
        errorCode,
        errorDescription,
        validatedURL,
        webContentsId: window.webContents.id,
      },
      'error',
      true,
    )
  })

  window.webContents.on('render-process-gone', (_event, details) => {
    const appMetrics = app.getAppMetrics().map((metric) => ({
      pid: metric.pid,
      type: metric.type,
      memory: metric.memory,
      creationTime: metric.creationTime,
      cpu: metric.cpu,
    }))

    logRuntimeDiagnostic(
      'renderer-process-gone',
      {
        details,
        webContentsId: window.webContents.id,
        currentUrl: window.webContents.getURL(),
        memoryUsage: process.memoryUsage(),
        appMetrics,
      },
      'error',
      true,
    )
  })

  window.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (resolveBenchMode()) {
      console.log('[renderer]', { level, message, line, sourceId })
    }
  })

  if (benchMode && shouldOpenDevTools()) {
    window.webContents.openDevTools({ mode: 'detach' })
  }

  return window
}

app.whenReady().then(() => {
  logRuntimeDiagnostic(
    'app-ready',
    {
      diagnosticsLogPath: getRuntimeDiagnosticsLogPath(),
      isPackaged: app.isPackaged,
      versions: process.versions,
    },
    'info',
    true,
  )

  registerBackendIpcHandlers()
  registerBenchIpcHandlers()
  createMainWindow()

  if (isRuntimeDiagnosticsVerboseEnabled()) {
    const timer = setInterval(() => {
      logRuntimeDiagnostic('heartbeat', {
        memoryUsage: process.memoryUsage(),
        windowCount: BrowserWindow.getAllWindows().length,
      })
    }, 10_000)

    timer.unref?.()
  }

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

app.on('child-process-gone', (_event, details) => {
  logRuntimeDiagnostic('child-process-gone', { details, memoryUsage: process.memoryUsage() }, 'error', true)
})

process.on('uncaughtException', (error) => {
  logRuntimeDiagnostic('uncaught-exception', { error: serializeUnknownError(error) }, 'error', true)
})

process.on('unhandledRejection', (reason) => {
  logRuntimeDiagnostic('unhandled-rejection', { reason: serializeUnknownError(reason) }, 'error', true)
})
