import type { BrowserWindow } from 'electron'
import { pathToFileURL } from 'node:url'

export type RendererEntry = { type: 'url' | 'file'; value: string }

export function installMainWindowNavigationGuards(window: BrowserWindow, entry: RendererEntry): void {
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
    event.preventDefault()
  })

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
}
