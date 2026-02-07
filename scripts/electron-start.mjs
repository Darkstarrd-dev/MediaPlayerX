import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

function resolveElectronBinary(projectRoot) {
  return process.platform === 'win32'
    ? path.join(projectRoot, 'node_modules', '.bin', 'electron.cmd')
    : path.join(projectRoot, 'node_modules', '.bin', 'electron')
}

function normalizeProxyServer(rawValue) {
  const value = String(rawValue ?? '').trim()
  if (!value) {
    return null
  }

  if (value.startsWith('socks5h://')) {
    return `socks5://${value.slice('socks5h://'.length)}`
  }

  return value
}

function resolveProxyServer(env) {
  return (
    normalizeProxyServer(env.MEDIA_PLAYERX_PROXY_SERVER) ??
    normalizeProxyServer(env.ALL_PROXY) ??
    normalizeProxyServer(env.all_proxy) ??
    normalizeProxyServer(env.HTTPS_PROXY) ??
    normalizeProxyServer(env.https_proxy) ??
    normalizeProxyServer(env.HTTP_PROXY) ??
    normalizeProxyServer(env.http_proxy)
  )
}

function withProxyEnv(baseEnv) {
  const env = { ...baseEnv }
  const proxyServer = resolveProxyServer(baseEnv)
  if (!proxyServer) {
    return env
  }

  env.MEDIA_PLAYERX_PROXY_SERVER = env.MEDIA_PLAYERX_PROXY_SERVER ?? proxyServer
  env.HTTP_PROXY = env.HTTP_PROXY ?? env.http_proxy ?? proxyServer
  env.HTTPS_PROXY = env.HTTPS_PROXY ?? env.https_proxy ?? proxyServer
  env.ALL_PROXY = env.ALL_PROXY ?? env.all_proxy ?? proxyServer
  env.NO_PROXY = env.NO_PROXY ?? env.no_proxy ?? 'localhost,127.0.0.1,::1'
  return env
}

const projectRoot = process.cwd()
const electronBinary = resolveElectronBinary(projectRoot)
const libraryRoot = path.resolve(process.env.MEDIA_PLAYERX_LIBRARY_ROOT ?? path.join(projectRoot, 'library'))
const useShell = process.platform === 'win32'
const baseEnv = withProxyEnv(process.env)

await mkdir(libraryRoot, { recursive: true })

const child = spawn(electronBinary, ['dist-electron/main.cjs'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: useShell,
  env: {
    ...baseEnv,
    VITE_MEDIA_REPOSITORY_MODE: 'real',
    MEDIA_PLAYERX_LIBRARY_ROOT: libraryRoot,
  },
})

child.once('error', (error) => {
  console.error(error)
  process.exit(1)
})

child.once('exit', (code) => {
  process.exit(code ?? 0)
})
