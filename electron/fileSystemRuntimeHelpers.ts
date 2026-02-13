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

export interface AudioProbeResult {
  durationSec: number
  album: string
  author: string
  trackTitle: string
  seriesId: string
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

function parseAudioFfprobeJson(raw: string): AudioProbeResult | null {
  try {
    const parsed = JSON.parse(raw) as {
      format?: {
        duration?: string
        tags?: Record<string, string | undefined>
      }
    }

    const durationValue = Number(parsed.format?.duration ?? 0)
    const durationSec = Number.isFinite(durationValue) && durationValue > 0 ? durationValue : 0
    const rawTags = parsed.format?.tags ?? {}
    const tags = new Map<string, string>()
    for (const [key, value] of Object.entries(rawTags)) {
      if (typeof value !== 'string') {
        continue
      }
      const normalizedValue = value.trim()
      if (normalizedValue.length <= 0) {
        continue
      }
      tags.set(key.trim().toLowerCase(), normalizedValue)
    }

    const album = tags.get('album') ?? ''
    const author = tags.get('artist') ?? tags.get('author') ?? ''
    const trackTitle = tags.get('title') ?? ''
    const explicitSeriesId = tags.get('series_id') ?? tags.get('seriesid') ?? tags.get('series') ?? ''
    const commentSeriesId = tags.get('comment') ?? tags.get('description') ?? ''
    const seriesId = explicitSeriesId || commentSeriesId

    if (durationSec <= 0 && album.length === 0 && author.length === 0 && trackTitle.length === 0 && seriesId.length === 0) {
      return null
    }

    return {
      durationSec,
      album,
      author,
      trackTitle,
      seriesId,
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

export async function probeAudioMetadata(audioPath: string, ffprobeBin: string): Promise<AudioProbeResult | null> {
  const result = await runProcess(
    ffprobeBin,
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration:format_tags',
      '-of',
      'json',
      audioPath,
    ],
    2_000,
  ).catch(() => null)

  if (!result || result.code !== 0) {
    return null
  }

  return parseAudioFfprobeJson(result.stdout)
}
