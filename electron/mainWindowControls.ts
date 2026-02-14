import { BrowserWindow, ipcMain } from 'electron'

import { APP_WINDOW_CHANNELS } from './channels'

type WindowControlHandlers = {
  getMainWindowRef: () => BrowserWindow | null
  getNativeChromeEnabled: () => boolean
  setNativeChromeEnabled: (enabled: boolean) => void
  applyApplicationMenuForChromeMode: () => void
  recreateMainWindowForChromeMode: (currentWindow: BrowserWindow) => Promise<void>
}

export function registerWindowControlIpcHandlers(handlers: WindowControlHandlers): void {
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

  ipcMain.handle(APP_WINDOW_CHANNELS.isMaximized, (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
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
