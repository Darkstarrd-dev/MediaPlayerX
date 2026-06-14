import type { App } from 'electron'
import path from 'node:path'

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

export function applyElectronProxy(app: App): void {
  const proxyServer = resolveProxyServer()
  if (!proxyServer) {
    // 阻止 Chromium 在 Windows 上默认执行 WPAD 代理自动检测，避免首请求超时延迟
    app.commandLine.appendSwitch('no-proxy-server')
    return
  }

  app.commandLine.appendSwitch('proxy-server', proxyServer)
  app.commandLine.appendSwitch('proxy-bypass-list', resolveProxyBypassList())
}

export function resolveUserDataDir(): string | null {
  const explicit = (process.env.MEDIA_PLAYERX_USER_DATA_DIR ?? '').trim()
  if (explicit.length > 0) {
    return path.resolve(explicit)
  }
  return null
}
