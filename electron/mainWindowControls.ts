import { BrowserWindow, clipboard, ipcMain, nativeImage } from 'electron'

import { APP_WINDOW_CHANNELS } from './channels'

type WindowControlHandlers = {
  getMainWindowRef: () => BrowserWindow | null
  getNativeChromeEnabled: () => boolean
  setNativeChromeEnabled: (enabled: boolean) => void
  applyApplicationMenuForChromeMode: () => void
  recreateMainWindowForChromeMode: (currentWindow: BrowserWindow) => Promise<void>
}

export function registerWindowControlIpcHandlers(handlers: WindowControlHandlers): void {
  const normalizeClipboardPngBytes = (value: unknown): Buffer | null => {
    if (value instanceof Uint8Array) {
      return Buffer.from(value)
    }

    if (value instanceof ArrayBuffer) {
      return Buffer.from(value)
    }

    if (ArrayBuffer.isView(value)) {
      return Buffer.from(value.buffer, value.byteOffset, value.byteLength)
    }

    if (
      Array.isArray(value) &&
      value.every(
        (entry) =>
          typeof entry === 'number' &&
          Number.isInteger(entry) &&
          entry >= 0 &&
          entry <= 255,
      )
    ) {
      return Buffer.from(value)
    }

    return null
  }

  ipcMain.handle(APP_WINDOW_CHANNELS.minimize, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.handle(APP_WINDOW_CHANNELS.toggleMaximize, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) {
      return
    }

    if (window.isMaximized()) {
      window.unmaximize()
      return
    }

    window.maximize()
  })

  ipcMain.handle(APP_WINDOW_CHANNELS.close, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  ipcMain.handle(APP_WINDOW_CHANNELS.setFullscreen, (event, active: unknown) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) {
      return
    }

    window.setFullScreen(Boolean(active))
  })

  ipcMain.handle(APP_WINDOW_CHANNELS.isMaximized, (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
  })

  ipcMain.handle(APP_WINDOW_CHANNELS.isFullscreen, (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isFullScreen() ?? false
  })

  ipcMain.handle(APP_WINDOW_CHANNELS.writeClipboardPng, (_event, pngBytes: unknown) => {
    const normalized = normalizeClipboardPngBytes(pngBytes)
    if (!normalized || normalized.byteLength === 0) {
      return false
    }

    try {
      const image = nativeImage.createFromBuffer(normalized)
      if (image.isEmpty()) {
        return false
      }

      clipboard.writeImage(image)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle(APP_WINDOW_CHANNELS.getNativeChromeEnabled, () => {
    return handlers.getNativeChromeEnabled()
  })

  ipcMain.handle(APP_WINDOW_CHANNELS.setNativeChromeEnabled, async (event, enabled: unknown) => {
    const normalized = Boolean(enabled)
    if (handlers.getNativeChromeEnabled() === normalized) {
      return handlers.getNativeChromeEnabled()
    }

    handlers.setNativeChromeEnabled(normalized)
    handlers.applyApplicationMenuForChromeMode()

    const currentWindow = BrowserWindow.fromWebContents(event.sender) ?? handlers.getMainWindowRef()
    if (currentWindow && !currentWindow.isDestroyed()) {
      await handlers.recreateMainWindowForChromeMode(currentWindow)
    }

    return handlers.getNativeChromeEnabled()
  })
}
