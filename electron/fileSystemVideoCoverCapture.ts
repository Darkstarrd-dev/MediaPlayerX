import { promises as fs } from 'node:fs'
import path from 'node:path'

import { toSafeFsName } from './fileSystemServiceHelpers'
import { runProcess } from './fileSystemRuntimeHelpers'

interface CaptureVideoCoverImageParams {
  videoPath: string
  videoId: string
  timeSec: number
  ffmpegBin: string
  coverOutputRootDir: string
  ffmpegAvailable: boolean
}

export async function captureVideoCoverImage({
  videoPath,
  videoId,
  timeSec,
  ffmpegBin,
  coverOutputRootDir,
  ffmpegAvailable,
}: CaptureVideoCoverImageParams): Promise<string | null> {
  if (!ffmpegAvailable) {
    return null
  }

  const safeTime = Number.isFinite(timeSec) ? Math.max(0, timeSec) : 0
  const baseName = `${toSafeFsName(videoId)}-${Date.now()}.jpg`
  const outputPath = path.join(coverOutputRootDir, baseName)
  await fs.mkdir(coverOutputRootDir, { recursive: true })

  const result = await runProcess(
    ffmpegBin,
    ['-y', '-v', 'error', '-ss', String(safeTime), '-i', videoPath, '-frames:v', '1', '-q:v', '2', outputPath],
    30_000,
  ).catch(() => null)

  if (!result || result.code !== 0) {
    return null
  }

  const stat = await fs.stat(outputPath).catch(() => null)
  if (!stat || !stat.isFile()) {
    return null
  }
  return outputPath
}
