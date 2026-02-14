import { app, BrowserWindow, Menu, protocol, type MenuItemConstructorOptions } from 'electron'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { APP_WINDOW_CHANNELS, MEDIA_PROTOCOL_SCHEME } from './channels'
import { registerBenchIpcHandlers } from './registerBenchIpcHandlers'
import { registerBackendIpcHandlers } from './registerBackendIpcHandlers'
import {
  getRuntimeDiagnosticsLogPath,
  isRuntimeDiagnosticsVerboseEnabled,
  logRuntimeDiagnostic,
  serializeUnknownError,
} from './runtimeDiagnostics'
import { applyElectronProxy, resolveUserDataDir } from './mainRuntimeConfig'
import { installMainWindowNavigationGuards } from './mainWindowGuards'
import { registerWindowControlIpcHandlers } from './mainWindowControls'
import { STARTUP_SPLASH_WINDOW_CONFIG, renderStartupSplashHtml } from './startupSplashTemplate'

const STARTUP_SPLASH_TIMEOUT_MS = 12_000
const STARTUP_SPLASH_MIN_DURATION_MAX_MS = 120_000
const STARTUP_SEQUENCE_STARTED_AT_MS = Date.now()

let nativeChromeEnabled = false
let mainWindowRef: BrowserWindow | null = null

function buildNativeChromeMenuTemplate(): MenuItemConstructorOptions[] {
  return [
    {
      label: 'File',
      submenu: [{ role: 'close' }],
    },
    {
      label: 'Edit',
      submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }],
    },
    {
      label: 'View',
      submenu: [{ role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'close' }],
    },
    {
      label: 'Help',
      submenu: [],
    },
  ]
}

function applyApplicationMenuForChromeMode(): void {
  if (nativeChromeEnabled) {
    Menu.setApplicationMenu(Menu.buildFromTemplate(buildNativeChromeMenuTemplate()))
    return
  }

  Menu.setApplicationMenu(null)
}

function applyWindowMenuState(window: BrowserWindow): void {
  window.setAutoHideMenuBar(!nativeChromeEnabled)
  window.setMenuBarVisibility(nativeChromeEnabled)
}

function createStartupSplashWindow(): BrowserWindow {
  const appWindowIconPath = resolveAppWindowIconPath() ?? undefined
  const splashWindow = new BrowserWindow({
    width: STARTUP_SPLASH_WINDOW_CONFIG.width,
    height: STARTUP_SPLASH_WINDOW_CONFIG.height,
    minWidth: STARTUP_SPLASH_WINDOW_CONFIG.width,
    minHeight: STARTUP_SPLASH_WINDOW_CONFIG.height,
    maxWidth: STARTUP_SPLASH_WINDOW_CONFIG.width,
    maxHeight: STARTUP_SPLASH_WINDOW_CONFIG.height,
    show: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    transparent: true,
    autoHideMenuBar: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: STARTUP_SPLASH_WINDOW_CONFIG.backgroundColor,
    icon: appWindowIconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  })

  splashWindow.setMenuBarVisibility(false)
  splashWindow.once('ready-to-show', () => {
    logRuntimeDiagnostic('startup-splash-ready', { windowId: splashWindow.webContents.id }, 'info', true)
    if (!splashWindow.isDestroyed()) {
      splashWindow.show()
    }
  })

  const html = renderStartupSplashHtml({ bannerSrc: resolveStartupSplashBannerSrc() })
  void splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

  return splashWindow
}

function bindStartupWindowTransition(mainWindow: BrowserWindow, splashWindow: BrowserWindow | null): void {
  let revealed = false
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null
  let revealDelayTimer: ReturnType<typeof setTimeout> | null = null
  const startupSplashMinDurationMs = resolveStartupSplashMinDurationMs()

  const revealMainWindow = (reason: 'ready-to-show' | 'timeout' | 'did-fail-load') => {
    if (revealed) {
      return
    }

    const elapsedMs = Date.now() - STARTUP_SEQUENCE_STARTED_AT_MS
    const remainingDelayMs = startupSplashMinDurationMs - elapsedMs

    if (remainingDelayMs > 0) {
      if (!revealDelayTimer) {
        revealDelayTimer = setTimeout(() => {
          revealDelayTimer = null
          revealMainWindow(reason)
        }, remainingDelayMs)
        revealDelayTimer.unref?.()
      }
      return
    }

    revealed = true

    if (fallbackTimer) {
      clearTimeout(fallbackTimer)
      fallbackTimer = null
    }

    if (revealDelayTimer) {
      clearTimeout(revealDelayTimer)
      revealDelayTimer = null
    }

    if (!mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
    }

    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close()
    }

    logRuntimeDiagnostic('startup-main-revealed', { reason, windowId: mainWindow.webContents.id }, 'info', true)
  }

  mainWindow.once('ready-to-show', () => {
    revealMainWindow('ready-to-show')
  })

  mainWindow.webContents.once('did-fail-load', () => {
    revealMainWindow('did-fail-load')
  })

  fallbackTimer = setTimeout(() => {
    revealMainWindow('timeout')
  }, STARTUP_SPLASH_TIMEOUT_MS)
  fallbackTimer.unref?.()

  mainWindow.once('closed', () => {
    if (fallbackTimer) {
      clearTimeout(fallbackTimer)
    }
    if (revealDelayTimer) {
      clearTimeout(revealDelayTimer)
    }
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.destroy()
    }
  })
}

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

function resolveStartupSplashBannerSrc(): string | null {
  const explicitPath = (process.env.MEDIA_PLAYERX_SPLASH_BANNER_PATH ?? '').trim()
  if (explicitPath.length > 0) {
    const resolvedExplicitPath = path.resolve(explicitPath)
    if (existsSync(resolvedExplicitPath)) {
      const explicitDataUrl = resolveImageDataUrl(resolvedExplicitPath)
      if (explicitDataUrl) {
        return explicitDataUrl
      }
    }
  }

  const relativeCandidates = [
    ['src', 'assets', 'banner.png'],
    ['..', 'src', 'assets', 'banner.png'],
  ] as const

  for (const root of collectAppRootCandidates()) {
    for (const relativeCandidate of relativeCandidates) {
      const candidate = path.resolve(root, ...relativeCandidate)
      if (existsSync(candidate)) {
        const dataUrl = resolveImageDataUrl(candidate)
        if (dataUrl) {
          return dataUrl
        }
      }
    }
  }

  return null
}

function resolveImageMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()

  if (ext === '.png') {
    return 'image/png'
  }

  if (ext === '.jpg' || ext === '.jpeg') {
    return 'image/jpeg'
  }

  if (ext === '.webp') {
    return 'image/webp'
  }

  if (ext === '.gif') {
    return 'image/gif'
  }

  if (ext === '.svg') {
    return 'image/svg+xml'
  }

  return 'application/octet-stream'
}

function resolveImageDataUrl(filePath: string): string | null {
  try {
    const buffer = readFileSync(filePath)
    if (buffer.length === 0) {
      return null
    }

    const mimeType = resolveImageMimeType(filePath)
    return `data:${mimeType};base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}

function resolveStartupSplashMinDurationMs(): number {
  const rawValue = (process.env.MEDIA_PLAYERX_SPLASH_MIN_DURATION_MS ?? '').trim()
  if (rawValue.length === 0) {
    return 0
  }

  const parsedValue = Number(rawValue)
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return 0
  }

  return Math.min(Math.floor(parsedValue), STARTUP_SPLASH_MIN_DURATION_MAX_MS)
}

function resolveAppWindowIconPath(): string | null {
  const explicitIconPath = (process.env.MEDIA_PLAYERX_APP_ICON_PATH ?? '').trim()
  if (explicitIconPath.length > 0) {
    const resolvedExplicitPath = path.isAbsolute(explicitIconPath)
      ? explicitIconPath
      : path.resolve(process.cwd(), explicitIconPath)
    if (existsSync(resolvedExplicitPath)) {
      return resolvedExplicitPath
    }
  }

  const platformIconCandidates =
    process.platform === 'win32'
      ? ['build/icons/icon.ico', 'build/icons/256x256.png', 'src/assets/icon.png']
      : process.platform === 'darwin'
        ? ['build/icons/icon.icns', 'build/icons/512x512.png', 'src/assets/icon.png']
        : ['build/icons/512x512.png', 'build/icons/256x256.png', 'src/assets/icon.png']

  for (const rootPath of collectAppRootCandidates()) {
    for (const relativePath of platformIconCandidates) {
      const candidatePath = path.resolve(rootPath, relativePath)
      if (existsSync(candidatePath)) {
        return candidatePath
      }
    }
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

applyElectronProxy(app)

tryConfigureCrashDumpsDir()

const userDataDir = resolveUserDataDir()
if (userDataDir) {
  app.setPath('userData', userDataDir)
}

if (process.platform === 'win32') {
  app.setAppUserModelId('com.darkstarrd.mediaplayerx')
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

function recreateMainWindowForChromeMode(currentWindow: BrowserWindow): Promise<void> {
  const wasMaximized = currentWindow.isMaximized()
  const wasVisible = currentWindow.isVisible()
  const bounds = currentWindow.getBounds()

  const nextWindow = createMainWindow()
  mainWindowRef = nextWindow
  nextWindow.once('closed', () => {
    if (mainWindowRef === nextWindow) {
      mainWindowRef = null
    }
  })

  if (!wasMaximized) {
    nextWindow.setBounds(bounds)
  }

  if (wasMaximized) {
    nextWindow.maximize()
  }

  return new Promise((resolve) => {
    let settled = false

    const finalize = () => {
      if (settled) {
        return
      }
      settled = true

      if (!nextWindow.isDestroyed() && wasVisible) {
        nextWindow.show()
        nextWindow.focus()
      }

      if (!currentWindow.isDestroyed()) {
        currentWindow.destroy()
      }

      resolve()
    }

    nextWindow.once('ready-to-show', finalize)
    nextWindow.webContents.once('did-fail-load', finalize)
  })
}

function createMainWindow(): BrowserWindow {
  const benchMode = resolveBenchMode()
  const appWindowIconPath = resolveAppWindowIconPath() ?? undefined
  const window = new BrowserWindow({
    width: 1400,
    height: 920,
    minWidth: 1080,
    minHeight: 680,
    show: false,
    paintWhenInitiallyHidden: true,
    frame: nativeChromeEnabled,
    thickFrame: process.platform === 'win32',
    autoHideMenuBar: !nativeChromeEnabled,
    backgroundColor: '#f2eee7',
    icon: appWindowIconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      navigateOnDragDrop: false,
      backgroundThrottling: benchMode ? false : true,
      preload: resolvePreloadEntry(),
    },
  })

  applyWindowMenuState(window)

  const entry = resolveRendererEntry()
  installMainWindowNavigationGuards(window, entry)

  window.webContents.once('dom-ready', () => {
    logRuntimeDiagnostic('startup-main-dom-ready', { windowId: window.webContents.id }, 'info', true)
  })

  window.webContents.once('did-finish-load', () => {
    logRuntimeDiagnostic('startup-main-did-finish-load', { windowId: window.webContents.id }, 'info', true)
  })

  window.once('ready-to-show', () => {
    logRuntimeDiagnostic('startup-main-ready-to-show', { windowId: window.webContents.id }, 'info', true)
  })

  const emitMaximizedState = () => {
    if (window.isDestroyed()) {
      return
    }
    window.webContents.send(APP_WINDOW_CHANNELS.maximizedStateChanged, window.isMaximized())
  }

  window.on('maximize', emitMaximizedState)
  window.on('unmaximize', emitMaximizedState)
  window.once('ready-to-show', emitMaximizedState)

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
    logRuntimeDiagnostic('startup-main-load-url', { target: entry.value }, 'info', true)
    if (benchMode) {
      const url = new URL(entry.value)
      url.searchParams.set('bench', benchMode)
      void window.loadURL(url.toString())
    } else {
      void window.loadURL(entry.value)
    }
  } else {
    logRuntimeDiagnostic('startup-main-load-file', { target: entry.value }, 'info', true)
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

function openMainWindow(): BrowserWindow {
  const benchMode = resolveBenchMode()
  const splashWindow = benchMode ? null : createStartupSplashWindow()
  const mainWindow = createMainWindow()
  mainWindowRef = mainWindow
  mainWindow.once('closed', () => {
    if (mainWindowRef === mainWindow) {
      mainWindowRef = null
    }
  })

  if (!benchMode) {
    bindStartupWindowTransition(mainWindow, splashWindow)
  }

  return mainWindow
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

  applyApplicationMenuForChromeMode()
  registerWindowControlIpcHandlers({
    getMainWindowRef: () => mainWindowRef,
    getNativeChromeEnabled: () => nativeChromeEnabled,
    setNativeChromeEnabled: (enabled) => {
      nativeChromeEnabled = enabled
    },
    applyApplicationMenuForChromeMode,
    recreateMainWindowForChromeMode,
  })
  registerBackendIpcHandlers()
  registerBenchIpcHandlers()
  openMainWindow()

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
      openMainWindow()
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
