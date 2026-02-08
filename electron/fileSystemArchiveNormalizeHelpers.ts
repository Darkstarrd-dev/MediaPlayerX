import { promises as fs } from 'node:fs'
import path from 'node:path'

import { collectFilesRecursive } from './fileSystemZipStoreWriter'
import { runProcess } from './fileSystemRuntimeHelpers'

export async function extractZipWithPowerShell(sourceArchivePath: string, outputDir: string): Promise<void> {
  const escapedSource = sourceArchivePath.replace(/'/g, "''")
  const escapedOutput = outputDir.replace(/'/g, "''")
  const script = `Expand-Archive -Path '${escapedSource}' -DestinationPath '${escapedOutput}' -Force`
  const result = await runProcess('powershell.exe', ['-NoProfile', '-Command', script], 180_000)
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || `Expand-Archive 失败: ${sourceArchivePath}`)
  }
}

export async function convertDirectoryImagesToWebp90(
  rootDir: string,
  ffmpegBin: string,
  imageExtensionsForConvert: ReadonlySet<string>,
): Promise<void> {
  const files = await collectFilesRecursive(rootDir)
  for (const file of files) {
    const extension = path.extname(file.absolutePath).toLowerCase()
    if (!imageExtensionsForConvert.has(extension)) {
      continue
    }

    const outputPath = file.absolutePath.slice(0, file.absolutePath.length - extension.length) + '.webp'
    const result = await runProcess(
      ffmpegBin,
      ['-y', '-v', 'error', '-i', file.absolutePath, '-q:v', '90', outputPath],
      120_000,
    )
    if (result.code !== 0) {
      throw new Error(result.stderr.trim() || `ffmpeg 转 webp 失败: ${file.absolutePath}`)
    }

    if (outputPath !== file.absolutePath) {
      await fs.rm(file.absolutePath, { force: true })
    }
  }
}
