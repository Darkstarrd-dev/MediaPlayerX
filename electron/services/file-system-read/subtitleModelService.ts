import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import {
  cancelSubtitleModelDownloadResponseSchema,
  listSubtitleLocalModelsResponseSchema,
  listSubtitleRemoteModelsResponseSchema,
  readSubtitleModelDownloadsResponseSchema,
  startSubtitleModelDownloadResponseSchema,
  type CancelSubtitleModelDownloadResponseDto,
  type ListSubtitleLocalModelsResponseDto,
  type ListSubtitleRemoteModelsResponseDto,
  type ReadSubtitleModelDownloadsResponseDto,
  type StartSubtitleModelDownloadRequestDto,
  type StartSubtitleModelDownloadResponseDto,
  type SubtitleModelDownloadTaskDto,
  type SubtitleRemoteModelDto,
} from '../../../src/contracts/backend'
import { SUBTITLE_REMOTE_MODEL_CATALOG } from '../../subtitles/subtitleModelCatalog'

interface SubtitleDownloadHistoryPoint {
  tsMs: number
  doneBytes: number
}

interface SubtitleDownloadTaskInternal {
  dto: SubtitleModelDownloadTaskDto
  model: SubtitleRemoteModelDto
  modelDir: string
  samples: SubtitleDownloadHistoryPoint[]
  abortController: AbortController
}

const LOCAL_MANIFEST_FILE = 'model-manifest.json'
const SAMPLE_WINDOW_MS = 3_000

async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true })
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

async function readFileSha256(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  const stream = (await import('node:fs')).createReadStream(filePath)
  for await (const chunk of stream) {
    hash.update(chunk)
  }
  return hash.digest('hex')
}

async function calculateDirectorySizeBytes(targetDir: string): Promise<number> {
  let total = 0

  const walk = async (dirPath: string): Promise<void> => {
    let entries: Array<Awaited<ReturnType<typeof fs.readdir>>[number]>
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const absolutePath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        await walk(absolutePath)
        continue
      }

      if (!entry.isFile()) {
        continue
      }

      try {
        const stat = await fs.stat(absolutePath)
        total += stat.size
      } catch {
        continue
      }
    }
  }

  await walk(targetDir)
  return total
}

function toPercent(doneBytes: number, totalBytes: number): number {
  if (totalBytes <= 0) {
    return 0
  }
  return Math.max(0, Math.min(100, (doneBytes / totalBytes) * 100))
}

function nowMs(): number {
  return Date.now()
}

export class SubtitleModelService {
  private readonly tasks = new Map<string, SubtitleDownloadTaskInternal>()

  async listRemoteModels(): Promise<ListSubtitleRemoteModelsResponseDto> {
    return listSubtitleRemoteModelsResponseSchema.parse({
      models: SUBTITLE_REMOTE_MODEL_CATALOG,
      generated_at_ms: nowMs(),
    })
  }

  async listLocalModels(modelDir: string): Promise<ListSubtitleLocalModelsResponseDto> {
    const normalizedModelDir = modelDir.trim()
    if (!normalizedModelDir) {
      return listSubtitleLocalModelsResponseSchema.parse({
        model_dir: modelDir,
        models: [],
      })
    }

    let entries: Array<Awaited<ReturnType<typeof fs.readdir>>[number]> = []
    try {
      entries = await fs.readdir(normalizedModelDir, { withFileTypes: true })
    } catch {
      return listSubtitleLocalModelsResponseSchema.parse({
        model_dir: normalizedModelDir,
        models: [],
      })
    }

    const models: Array<ListSubtitleLocalModelsResponseDto['models'][number]> = []

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue
      }

      const localModelDir = path.join(normalizedModelDir, entry.name)
      const manifestPath = path.join(localModelDir, LOCAL_MANIFEST_FILE)
      const manifest = await readJsonFile<{
        id?: string
        label?: string
        installed_at_ms?: number
      }>(manifestPath)

      models.push({
        id: manifest?.id?.trim() || entry.name,
        label: manifest?.label?.trim() || entry.name,
        model_dir: localModelDir,
        installed_at_ms:
          typeof manifest?.installed_at_ms === 'number' && Number.isFinite(manifest.installed_at_ms)
            ? Math.max(1, Math.round(manifest.installed_at_ms))
            : null,
        size_bytes: await calculateDirectorySizeBytes(localModelDir),
        source: manifest ? 'downloaded' : 'manual',
      })
    }

    models.sort((left, right) => left.id.localeCompare(right.id))

    return listSubtitleLocalModelsResponseSchema.parse({
      model_dir: normalizedModelDir,
      models,
    })
  }

  async startDownload(
    request: StartSubtitleModelDownloadRequestDto,
  ): Promise<StartSubtitleModelDownloadResponseDto> {
    const model = SUBTITLE_REMOTE_MODEL_CATALOG.find((item) => item.id === request.model_id)
    if (!model) {
      throw new Error(`subtitle_model_not_found: ${request.model_id}`)
    }

    const modelDir = request.model_dir.trim()
    if (!modelDir) {
      throw new Error('subtitle_model_dir_required')
    }

    const downloadId = `subtitle-download-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
    const taskDto: SubtitleModelDownloadTaskDto = {
      download_id: downloadId,
      model_id: model.id,
      status: 'queued',
      done_bytes: 0,
      total_bytes: Math.max(0, model.size_bytes),
      percent: 0,
      speed_bps: 0,
      eta_sec: null,
      use_proxy: request.use_proxy,
      proxy_url: request.proxy_url,
      message: null,
      started_at_ms: nowMs(),
      updated_at_ms: nowMs(),
      completed_at_ms: null,
    }

    const task: SubtitleDownloadTaskInternal = {
      dto: taskDto,
      model,
      modelDir,
      samples: [{ tsMs: nowMs(), doneBytes: 0 }],
      abortController: new AbortController(),
    }
    this.tasks.set(downloadId, task)

    void this.runDownloadTask(task)

    return startSubtitleModelDownloadResponseSchema.parse({
      task: task.dto,
    })
  }

  async cancelDownload(downloadId: string): Promise<CancelSubtitleModelDownloadResponseDto> {
    const task = this.tasks.get(downloadId)
    if (!task) {
      return cancelSubtitleModelDownloadResponseSchema.parse({ ok: false })
    }

    task.abortController.abort()
    task.dto.status = 'cancelled'
    task.dto.speed_bps = 0
    task.dto.eta_sec = null
    task.dto.completed_at_ms = nowMs()
    task.dto.updated_at_ms = nowMs()
    task.dto.message = '用户取消下载'

    return cancelSubtitleModelDownloadResponseSchema.parse({ ok: true })
  }

  async readDownloadTasks(): Promise<ReadSubtitleModelDownloadsResponseDto> {
    const tasks = Array.from(this.tasks.values())
      .map((item) => item.dto)
      .sort((left, right) => right.started_at_ms - left.started_at_ms)

    return readSubtitleModelDownloadsResponseSchema.parse({
      tasks,
    })
  }

  private updateProgress(task: SubtitleDownloadTaskInternal, doneBytes: number, totalBytes: number): void {
    const now = nowMs()
    task.dto.done_bytes = Math.max(0, Math.round(doneBytes))
    task.dto.total_bytes = Math.max(0, Math.round(totalBytes))
    task.dto.percent = toPercent(task.dto.done_bytes, task.dto.total_bytes)
    task.dto.updated_at_ms = now

    task.samples.push({
      tsMs: now,
      doneBytes: task.dto.done_bytes,
    })

    while (task.samples.length > 2 && now - task.samples[0].tsMs > SAMPLE_WINDOW_MS) {
      task.samples.shift()
    }

    const first = task.samples[0]
    const last = task.samples[task.samples.length - 1]
    const elapsedSec = Math.max(0.001, (last.tsMs - first.tsMs) / 1000)
    const speed = Math.max(0, (last.doneBytes - first.doneBytes) / elapsedSec)

    task.dto.speed_bps = speed
    const remainingBytes = Math.max(0, task.dto.total_bytes - task.dto.done_bytes)
    task.dto.eta_sec = speed > 0 ? Math.round(remainingBytes / speed) : null
  }

  private async runDownloadTask(task: SubtitleDownloadTaskInternal): Promise<void> {
    task.dto.status = 'downloading'
    task.dto.message = null
    task.dto.updated_at_ms = nowMs()

    try {
      await ensureDirectory(task.modelDir)
      const targetRoot = path.join(task.modelDir, task.model.id)
      await ensureDirectory(targetRoot)

      let doneBytes = 0
      const totalBytes = Math.max(task.model.size_bytes, 1)
      this.updateProgress(task, doneBytes, totalBytes)

      for (const artifact of task.model.artifacts) {
        if (task.abortController.signal.aborted) {
          throw new Error('download_cancelled')
        }

        const targetPath = path.join(targetRoot, artifact.relative_path)
        await ensureDirectory(path.dirname(targetPath))
        const tempPath = `${targetPath}.partial`
        const artifactSize = artifact.size_bytes ?? 0

        const response = await fetch(artifact.url, {
          signal: task.abortController.signal,
        })

        if (!response.ok || !response.body) {
          throw new Error(`download_http_failed: ${response.status} ${response.statusText}`)
        }

        const writer = createWriteStream(tempPath)
        const reader = response.body.getReader()
        let artifactDone = 0

        while (true) {
          const result = await reader.read()
          if (result.done) {
            break
          }

          if (task.abortController.signal.aborted) {
            throw new Error('download_cancelled')
          }

          writer.write(result.value)
          artifactDone += result.value.byteLength
          doneBytes += result.value.byteLength

          const nextTotal = Math.max(totalBytes, doneBytes + Math.max(0, artifactSize - artifactDone))
          this.updateProgress(task, doneBytes, nextTotal)
        }

        writer.end()
        await new Promise<void>((resolve, reject) => {
          writer.on('finish', () => resolve())
          writer.on('error', (error) => reject(error))
        })

        if (artifact.sha256) {
          task.dto.status = 'verifying'
          task.dto.message = `校验 ${artifact.relative_path}`
          task.dto.updated_at_ms = nowMs()
          const hash = await readFileSha256(tempPath)
          if (hash.toLowerCase() !== artifact.sha256.toLowerCase()) {
            throw new Error(`sha256_mismatch: ${artifact.relative_path}`)
          }
        }

        await fs.rename(tempPath, targetPath)
      }

      const installedAtMs = nowMs()
      await fs.writeFile(
        path.join(targetRoot, LOCAL_MANIFEST_FILE),
        `${JSON.stringify(
          {
            id: task.model.id,
            label: task.model.label,
            version: task.model.version,
            language_codes: task.model.language_codes,
            installed_at_ms: installedAtMs,
          },
          null,
          2,
        )}\n`,
        'utf8',
      )

      task.dto.status = 'completed'
      task.dto.done_bytes = Math.max(task.dto.total_bytes, task.dto.done_bytes)
      task.dto.percent = 100
      task.dto.speed_bps = 0
      task.dto.eta_sec = 0
      task.dto.completed_at_ms = installedAtMs
      task.dto.updated_at_ms = installedAtMs
      task.dto.message = '下载完成'
    } catch (error) {
      if (task.dto.status === 'cancelled') {
        task.dto.updated_at_ms = nowMs()
        task.dto.completed_at_ms = task.dto.completed_at_ms ?? nowMs()
        task.dto.speed_bps = 0
        task.dto.eta_sec = null
        return
      }

      task.dto.status = 'failed'
      task.dto.speed_bps = 0
      task.dto.eta_sec = null
      task.dto.completed_at_ms = nowMs()
      task.dto.updated_at_ms = nowMs()
      task.dto.message = error instanceof Error ? error.message : String(error)
    }
  }
}
