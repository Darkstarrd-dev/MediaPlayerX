import {
  app,
  BrowserWindow,
  Menu,
  protocol,
  session,
  type MenuItemConstructorOptions,
} from "electron";
import { pathToFileURL } from "node:url";

import { APP_WINDOW_CHANNELS, MEDIA_PROTOCOL_SCHEME } from "./channels";
import { registerBenchIpcHandlers } from "./registerBenchIpcHandlers";
import { registerBackendIpcHandlers } from "./registerBackendIpcHandlers";
import {
  getRuntimeDiagnosticsLogPath,
  isRuntimeDiagnosticsVerboseEnabled,
  logRuntimeDiagnostic,
  serializeUnknownError,
} from "./runtimeDiagnostics";
import { applyElectronProxy, resolveUserDataDir } from "./mainRuntimeConfig";
import { installMainWindowNavigationGuards } from "./mainWindowGuards";
import { registerWindowControlIpcHandlers } from "./mainWindowControls";
import {
  resolveAppWindowIconPath,
  resolvePreloadEntry,
  resolveRendererEntry,
  resolveStartupSplashBannerSrc,
} from "./mainPaths";
import {
  resolveBenchMode,
  shouldOpenDevTools,
  tryConfigureCrashDumpsDir,
} from "./mainBenchRuntime";
import {
  STARTUP_SPLASH_WINDOW_CONFIG,
  renderStartupSplashHtml,
} from "./startupSplashTemplate";
import { runThemeGalleryCaptureIfEnabled } from "./themeGalleryCaptureRuntime";

const STARTUP_SPLASH_TIMEOUT_MS = 12_000;
const STARTUP_SPLASH_MIN_DURATION_MAX_MS = 120_000;
const STARTUP_SEQUENCE_STARTED_AT_MS = Date.now();

let nativeChromeEnabled = false;
let mainWindowRef: BrowserWindow | null = null;

function buildContentSecurityPolicy(isPackaged: boolean): string {
  const scriptSource = isPackaged
    ? "'self'"
    : "'self' 'unsafe-eval' 'unsafe-inline'";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    `script-src ${scriptSource}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${MEDIA_PROTOCOL_SCHEME}:`,
    `media-src 'self' data: blob: ${MEDIA_PROTOCOL_SCHEME}:`,
    "font-src 'self' data:",
    "connect-src 'self' http: https: ws: wss:",
    "worker-src 'self' blob:",
    "form-action 'self'",
  ].join("; ");
}

function configureSessionSecurityPolicies(): void {
  const currentSession = session.defaultSession;
  const contentSecurityPolicy = buildContentSecurityPolicy(app.isPackaged);

  currentSession.setPermissionRequestHandler(
    (webContents, permission, callback, details) => {
      logRuntimeDiagnostic(
        "permission-request-blocked",
        {
          permission,
          requestingUrl: details.requestingUrl,
          embeddingOrigin: details.embeddingOrigin,
          isMainFrame: details.isMainFrame,
          webContentsId: webContents.id,
        },
        "warn",
      );
      callback(false);
    },
  );

  currentSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = details.responseHeaders ?? {};
    const hasContentSecurityPolicyHeader = Object.keys(responseHeaders).some(
      (headerName) => headerName.toLowerCase() === "content-security-policy",
    );

    if (hasContentSecurityPolicyHeader) {
      callback({ responseHeaders });
      return;
    }

    callback({
      responseHeaders: {
        ...responseHeaders,
        "Content-Security-Policy": [contentSecurityPolicy],
      },
    });
  });
}

function buildNativeChromeMenuTemplate(): MenuItemConstructorOptions[] {
  return [
    {
      label: "File",
      submenu: [{ role: "close" }],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "zoom" }, { role: "close" }],
    },
    {
      label: "Help",
      submenu: [],
    },
  ];
}

function applyApplicationMenuForChromeMode(): void {
  if (nativeChromeEnabled) {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate(buildNativeChromeMenuTemplate()),
    );
    return;
  }

  Menu.setApplicationMenu(null);
}

function applyWindowMenuState(window: BrowserWindow): void {
  window.setAutoHideMenuBar(!nativeChromeEnabled);
  window.setMenuBarVisibility(nativeChromeEnabled);
}

function createStartupSplashWindow(): BrowserWindow {
  const appWindowIconPath = resolveAppWindowIconPath() ?? undefined;
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
  });

  splashWindow.setMenuBarVisibility(false);
  splashWindow.once("ready-to-show", () => {
    logRuntimeDiagnostic(
      "startup-splash-ready",
      { windowId: splashWindow.webContents.id },
      "info",
      true,
    );
    if (!splashWindow.isDestroyed()) {
      splashWindow.show();
    }
  });

  const html = renderStartupSplashHtml({
    bannerSrc: resolveStartupSplashBannerSrc(),
  });
  void splashWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
  );

  return splashWindow;
}

function bindStartupWindowTransition(
  mainWindow: BrowserWindow,
  splashWindow: BrowserWindow | null,
): void {
  let revealed = false;
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  let revealDelayTimer: ReturnType<typeof setTimeout> | null = null;
  const startupSplashMinDurationMs = resolveStartupSplashMinDurationMs();

  const revealMainWindow = (
    reason: "ready-to-show" | "timeout" | "did-fail-load",
  ) => {
    if (revealed) {
      return;
    }

    const elapsedMs = Date.now() - STARTUP_SEQUENCE_STARTED_AT_MS;
    const remainingDelayMs = startupSplashMinDurationMs - elapsedMs;

    if (remainingDelayMs > 0) {
      if (!revealDelayTimer) {
        revealDelayTimer = setTimeout(() => {
          revealDelayTimer = null;
          revealMainWindow(reason);
        }, remainingDelayMs);
        revealDelayTimer.unref?.();
      }
      return;
    }

    revealed = true;

    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }

    if (revealDelayTimer) {
      clearTimeout(revealDelayTimer);
      revealDelayTimer = null;
    }

    if (!mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }

    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }

    logRuntimeDiagnostic(
      "startup-main-revealed",
      { reason, windowId: mainWindow.webContents.id },
      "info",
      true,
    );
  };

  mainWindow.once("ready-to-show", () => {
    revealMainWindow("ready-to-show");
  });

  mainWindow.webContents.once("did-fail-load", () => {
    revealMainWindow("did-fail-load");
  });

  fallbackTimer = setTimeout(() => {
    revealMainWindow("timeout");
  }, STARTUP_SPLASH_TIMEOUT_MS);
  fallbackTimer.unref?.();

  mainWindow.once("closed", () => {
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
    }
    if (revealDelayTimer) {
      clearTimeout(revealDelayTimer);
    }
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.destroy();
    }
  });
}

function resolveStartupSplashMinDurationMs(): number {
  const rawValue = (
    process.env.MEDIA_PLAYERX_SPLASH_MIN_DURATION_MS ?? ""
  ).trim();
  if (rawValue.length === 0) {
    return 0;
  }

  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return 0;
  }

  return Math.min(Math.floor(parsedValue), STARTUP_SPLASH_MIN_DURATION_MAX_MS);
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
]);

applyElectronProxy(app);

tryConfigureCrashDumpsDir();

const userDataDir = resolveUserDataDir();
if (userDataDir) {
  app.setPath("userData", userDataDir);
}

if (process.platform === "win32") {
  app.setAppUserModelId("com.darkstarrd.mediaplayerx");
}

function recreateMainWindowForChromeMode(
  currentWindow: BrowserWindow,
): Promise<void> {
  const wasMaximized = currentWindow.isMaximized();
  const wasVisible = currentWindow.isVisible();
  const bounds = currentWindow.getBounds();

  const nextWindow = createMainWindow();
  mainWindowRef = nextWindow;
  nextWindow.once("closed", () => {
    if (mainWindowRef === nextWindow) {
      mainWindowRef = null;
    }
  });

  if (!wasMaximized) {
    nextWindow.setBounds(bounds);
  }

  if (wasMaximized) {
    nextWindow.maximize();
  }

  return new Promise((resolve) => {
    let settled = false;

    const finalize = () => {
      if (settled) {
        return;
      }
      settled = true;

      if (!nextWindow.isDestroyed() && wasVisible) {
        nextWindow.show();
        nextWindow.focus();
      }

      if (!currentWindow.isDestroyed()) {
        currentWindow.destroy();
      }

      resolve();
    };

    nextWindow.once("ready-to-show", finalize);
    nextWindow.webContents.once("did-fail-load", finalize);
  });
}

function createMainWindow(): BrowserWindow {
  const benchMode = resolveBenchMode();
  const appWindowIconPath = resolveAppWindowIconPath() ?? undefined;
  const window = new BrowserWindow({
    width: 1400,
    height: 920,
    minWidth: 1080,
    minHeight: 680,
    show: false,
    paintWhenInitiallyHidden: true,
    frame: nativeChromeEnabled,
    thickFrame: process.platform === "win32",
    autoHideMenuBar: !nativeChromeEnabled,
    backgroundColor: "#f2eee7",
    icon: appWindowIconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      navigateOnDragDrop: false,
      backgroundThrottling: benchMode ? false : true,
      preload: resolvePreloadEntry(),
    },
  });

  applyWindowMenuState(window);

  const entry = resolveRendererEntry();
  installMainWindowNavigationGuards(window, entry);

  window.webContents.once("dom-ready", () => {
    logRuntimeDiagnostic(
      "startup-main-dom-ready",
      { windowId: window.webContents.id },
      "info",
      true,
    );
  });

  window.webContents.once("did-finish-load", () => {
    logRuntimeDiagnostic(
      "startup-main-did-finish-load",
      { windowId: window.webContents.id },
      "info",
      true,
    );
  });

  window.once("ready-to-show", () => {
    logRuntimeDiagnostic(
      "startup-main-ready-to-show",
      { windowId: window.webContents.id },
      "info",
      true,
    );
  });

  const emitMaximizedState = () => {
    if (window.isDestroyed()) {
      return;
    }
    window.webContents.send(
      APP_WINDOW_CHANNELS.maximizedStateChanged,
      window.isMaximized(),
    );
  };

  window.on("maximize", emitMaximizedState);
  window.on("unmaximize", emitMaximizedState);
  window.once("ready-to-show", emitMaximizedState);

  if (benchMode) {
    try {
      window.webContents.setBackgroundThrottling(false);
    } catch {
      // ignore
    }
    window.once("ready-to-show", () => {
      try {
        window.show();
        window.focus();
      } catch {
        // ignore
      }
    });
  }

  if (entry.type === "url") {
    logRuntimeDiagnostic(
      "startup-main-load-url",
      { target: entry.value },
      "info",
      true,
    );
    if (benchMode === "dom" || benchMode === "e2e") {
      const url = new URL(entry.value);
      url.searchParams.set("bench", benchMode);
      void window.loadURL(url.toString());
    } else {
      void window.loadURL(entry.value);
    }
  } else {
    logRuntimeDiagnostic(
      "startup-main-load-file",
      { target: entry.value },
      "info",
      true,
    );
    if (benchMode === "dom" || benchMode === "e2e") {
      const fileUrl = pathToFileURL(entry.value);
      fileUrl.searchParams.set("bench", benchMode);
      void window.loadURL(fileUrl.toString());
    } else {
      void window.loadFile(entry.value);
    }
  }

  window.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL) => {
      logRuntimeDiagnostic(
        "renderer-did-fail-load",
        {
          errorCode,
          errorDescription,
          validatedURL,
          webContentsId: window.webContents.id,
        },
        "error",
        true,
      );
    },
  );

  window.webContents.on("render-process-gone", (_event, details) => {
    const appMetrics = app.getAppMetrics().map((metric) => ({
      pid: metric.pid,
      type: metric.type,
      memory: metric.memory,
      creationTime: metric.creationTime,
      cpu: metric.cpu,
    }));

    logRuntimeDiagnostic(
      "renderer-process-gone",
      {
        details,
        webContentsId: window.webContents.id,
        currentUrl: window.webContents.getURL(),
        memoryUsage: process.memoryUsage(),
        appMetrics,
      },
      "error",
      true,
    );
  });

  window.webContents.on(
    "console-message",
    (_event, level, message, line, sourceId) => {
      const isSubtitleMetrics = message.includes("[subtitle][metrics]");
      if (resolveBenchMode() || isSubtitleMetrics) {
        console.log("[renderer]", { level, message, line, sourceId });
      }
    },
  );

  if (benchMode && shouldOpenDevTools()) {
    window.webContents.openDevTools({ mode: "detach" });
  }

  return window;
}

function openMainWindow(): BrowserWindow {
  const benchMode = resolveBenchMode();
  const splashWindow = benchMode ? null : createStartupSplashWindow();
  const mainWindow = createMainWindow();
  mainWindowRef = mainWindow;
  mainWindow.once("closed", () => {
    if (mainWindowRef === mainWindow) {
      mainWindowRef = null;
    }
  });

  if (!benchMode) {
    bindStartupWindowTransition(mainWindow, splashWindow);
  }

  runThemeGalleryCaptureIfEnabled(mainWindow);

  return mainWindow;
}

app.whenReady().then(() => {
  logRuntimeDiagnostic(
    "app-ready",
    {
      diagnosticsLogPath: getRuntimeDiagnosticsLogPath(),
      isPackaged: app.isPackaged,
      versions: process.versions,
    },
    "info",
    true,
  );

  applyApplicationMenuForChromeMode();
  configureSessionSecurityPolicies();
  registerWindowControlIpcHandlers({
    getMainWindowRef: () => mainWindowRef,
    getNativeChromeEnabled: () => nativeChromeEnabled,
    setNativeChromeEnabled: (enabled) => {
      nativeChromeEnabled = enabled;
    },
    applyApplicationMenuForChromeMode,
    recreateMainWindowForChromeMode,
  });
  registerBackendIpcHandlers();
  registerBenchIpcHandlers();
  openMainWindow();

  if (isRuntimeDiagnosticsVerboseEnabled()) {
    const timer = setInterval(() => {
      logRuntimeDiagnostic("heartbeat", {
        memoryUsage: process.memoryUsage(),
        windowCount: BrowserWindow.getAllWindows().length,
      });
    }, 10_000);

    timer.unref?.();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      openMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("child-process-gone", (_event, details) => {
  logRuntimeDiagnostic(
    "child-process-gone",
    { details, memoryUsage: process.memoryUsage() },
    "error",
    true,
  );
});

process.on("uncaughtException", (error) => {
  logRuntimeDiagnostic(
    "uncaught-exception",
    { error: serializeUnknownError(error) },
    "error",
    true,
  );
});

process.on("unhandledRejection", (reason) => {
  logRuntimeDiagnostic(
    "unhandled-rejection",
    { reason: serializeUnknownError(reason) },
    "error",
    true,
  );
});
