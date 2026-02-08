import { spawn } from 'node:child_process'

export interface ServiceShellResult {
  code: number
  stdout: string
  stderr: string
}

export interface VideoProbeResult {
  durationSec: number
  width: number
  height: number
}

type SharpModule = typeof import('sharp')
let sharpModulePromise: Promise<SharpModule | null> | null = null

export async function runProcess(command: string, args: string[], timeoutMs = 120_000): Promise<ServiceShellResult> {
  return new Promise<ServiceShellResult>((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let finished = false

    const cleanup = () => {
      if (finished) {
        return
      }
      finished = true
      clearTimeout(timeoutId)
    }

    const timeoutId = setTimeout(() => {
      if (!finished) {
        child.kill('SIGKILL')
        cleanup()
        reject(new Error(`命令执行超时: ${command}`))
      }
    }, timeoutMs)

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })

    child.on('error', (error) => {
      cleanup()
      reject(error)
    })

    child.on('close', (code) => {
      cleanup()
      resolve({
        code: code ?? -1,
        stdout,
        stderr,
      })
    })
  })
}

export async function checkCommandAvailability(command: string, args: string[]): Promise<boolean> {
  const result = await runProcess(command, args, 8_000).catch(() => null)
  return Boolean(result && result.code === 0)
}

export async function getSharpModule(): Promise<SharpModule | null> {
  if (!sharpModulePromise) {
    sharpModulePromise = import('sharp').catch(() => null)
  }
  return sharpModulePromise
}

export async function probeImageDimensionsFromFile(absolutePath: string): Promise<{ width: number; height: number }> {
  const sharpModule = await getSharpModule()
  if (!sharpModule?.default) {
    return { width: 0, height: 0 }
  }

  const metadata = await sharpModule.default(absolutePath, { failOn: 'none' }).metadata().catch(() => null)
  const width = Number(metadata?.width)
  const height = Number(metadata?.height)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: 0, height: 0 }
  }

  return {
    width: Math.max(0, Math.round(width)),
    height: Math.max(0, Math.round(height)),
  }
}

function parseFfprobeJson(raw: string): VideoProbeResult | null {
  try {
    const parsed = JSON.parse(raw) as {
      streams?: Array<{ width?: number; height?: number; duration?: string }>
      format?: { duration?: string }
    }
    const stream = parsed.streams?.find((item) => Number.isFinite(item.width) && Number.isFinite(item.height))
    const width = stream?.width && stream.width > 0 ? Math.round(stream.width) : null
    const height = stream?.height && stream.height > 0 ? Math.round(stream.height) : null

    const durationRaw = parsed.format?.duration ?? stream?.duration
    const durationValue = durationRaw ? Number(durationRaw) : 0
    const durationSec = Number.isFinite(durationValue) && durationValue > 0 ? durationValue : 0

    if (!width || !height) {
      return null
    }

    return {
      durationSec,
      width,
      height,
    }
  } catch {
    return null
  }
}

export async function probeVideoMetadata(videoPath: string, ffprobeBin: string): Promise<VideoProbeResult | null> {
  const result = await runProcess(
    ffprobeBin,
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height,duration',
      '-show_entries',
      'format=duration',
      '-of',
      'json',
      videoPath,
    ],
    2_000,
  ).catch(() => null)

  if (!result || result.code !== 0) {
    return null
  }

  return parseFfprobeJson(result.stdout)
}
