import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'

function resolveNpmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

function resolveElectronBinary(projectRoot) {
  return process.platform === 'win32'
    ? path.join(projectRoot, 'node_modules', '.bin', 'electron.cmd')
    : path.join(projectRoot, 'node_modules', '.bin', 'electron')
}

function terminateChild(child) {
  if (!child || child.killed) {
    return
  }
  child.kill('SIGTERM')
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

async function runCommand(projectRoot, command, args, env) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env,
      stdio: 'inherit',
    })

    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) {
        resolve(undefined)
        return
      }
      reject(new Error(`command failed: ${command} ${args.join(' ')} (exit ${code ?? 'null'})`))
    })
  })
}

async function canConnect(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port })

    const cleanup = () => {
      socket.removeAllListeners()
      socket.destroy()
    }

    socket.setTimeout(1000)
    socket.once('connect', () => {
      cleanup()
      resolve(true)
    })
    socket.once('error', () => {
      cleanup()
      resolve(false)
    })
    socket.once('timeout', () => {
      cleanup()
      resolve(false)
    })
  })
}

async function waitForServer(host, port, timeoutMs) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await canConnect(host, port)) {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 350))
  }

  throw new Error(`vite dev server not ready: ${host}:${port}`)
}

const projectRoot = process.cwd()
const npmCommand = resolveNpmCommand()
const electronBinary = resolveElectronBinary(projectRoot)
const useShell = process.platform === 'win32'
const devPort = Number(process.env.MEDIA_PLAYERX_DEV_PORT ?? 5173)
const devServerUrl = process.env.VITE_DEV_SERVER_URL ?? `http://127.0.0.1:${devPort}`
const parsedDevServerUrl = new URL(devServerUrl)
const devServerHost = parsedDevServerUrl.hostname
const devServerPort = Number(parsedDevServerUrl.port || (parsedDevServerUrl.protocol === 'https:' ? 443 : 80))
const libraryRoot = path.resolve(process.env.MEDIA_PLAYERX_LIBRARY_ROOT ?? path.join(projectRoot, 'library'))
const baseEnv = withProxyEnv(process.env)

await mkdir(libraryRoot, { recursive: true })

await runCommand(projectRoot, process.execPath, ['scripts/build-electron.mjs'], baseEnv)

const viteProcess = spawn(npmCommand, ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(devPort), '--strictPort'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: useShell,
  env: {
    ...baseEnv,
    VITE_MEDIA_REPOSITORY_MODE: 'real',
  },
})

let electronProcess = null
let shuttingDown = false

const shutdown = (exitCode) => {
  if (shuttingDown) {
    return
  }
  shuttingDown = true
  terminateChild(electronProcess)
  terminateChild(viteProcess)
  process.exit(exitCode)
}

process.once('SIGINT', () => shutdown(130))
process.once('SIGTERM', () => shutdown(143))

viteProcess.once('exit', (code) => {
  if (!shuttingDown && !electronProcess) {
    shutdown(code ?? 1)
  }
})

try {
  await waitForServer(devServerHost, devServerPort, 90_000)
} catch (error) {
  console.error(error)
  shutdown(1)
}

electronProcess = spawn(electronBinary, ['dist-electron/main.cjs'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: useShell,
  env: {
    ...baseEnv,
    VITE_DEV_SERVER_URL: devServerUrl,
    VITE_MEDIA_REPOSITORY_MODE: 'real',
    MEDIA_PLAYERX_LIBRARY_ROOT: libraryRoot,
  },
})

electronProcess.once('error', (error) => {
  console.error(error)
  shutdown(1)
})

electronProcess.once('exit', (code) => {
  shutdown(code ?? 0)
})
