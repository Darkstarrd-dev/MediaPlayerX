import { spawn } from 'node:child_process'
import { verifySigningEnvironment } from './verify-signing-env.mjs'

const signed = process.argv.includes('--signed')

if (signed) {
  verifySigningEnvironment()
}

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const args = ['electron-builder', '--config', 'electron-builder.config.cjs', '--win', 'nsis', '--x64']
const env = {
  ...process.env,
}

if (signed) {
  env.MPX_WINDOWS_SIGN = '1'
}

const child = spawn(command, args, {
  stdio: 'inherit',
  shell: false,
  env,
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})
