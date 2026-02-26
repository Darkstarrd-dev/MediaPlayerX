import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Writable } from 'node:stream'

import axios, { type AxiosRequestConfig } from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { SocksProxyAgent } from 'socks-proxy-agent'

import {
  clearSubtitleLocalModelResponseSchema,
  cancelSubtitleModelDownloadResponseSchema,
  listSubtitleLocalModelsResponseSchema,
  listSubtitleRemoteModelsResponseSchema,
  readSubtitleModelDownloadsResponseSchema,
  startSubtitleModelDownloadResponseSchema,
  type CancelSubtitleModelDownloadResponseDto,
  type ClearSubtitleLocalModelResponseDto,
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

function hasSenseVoiceModelFiles(
  entries: Array<Awaited<ReturnType<typeof fs.readdir>>[number]>,
): boolean {
  const hasTokens = entries.some(
    (item) => item.isFile() && item.name.toLowerCase() === 'tokens.txt',
  )
  const hasOnnx = entries.some(
    (item) => item.isFile() && item.name.toLowerCase().endsWith('.onnx'),
  )
  return hasTokens && hasOnnx
}

async function hasFunasrNanoModelFiles(localModelDir: string): Promise<boolean> {
  let entries: Array<Awaited<ReturnType<typeof fs.readdir>>[number]> = []
  try {
    entries = await fs.readdir(localModelDir, { withFileTypes: true })
  } catch {
    return false
  }

  const hasEncoderAdaptor = entries.some(
    (item) =>
      item.isFile()
      && item.name.toLowerCase().startsWith('encoder_adaptor')
      && item.name.toLowerCase().endsWith('.onnx'),
  )
  const hasLlm = entries.some(
    (item) =>
      item.isFile()
      && item.name.toLowerCase().startsWith('llm')
      && item.name.toLowerCase().endsWith('.onnx'),
  )
  const hasEmbedding = entries.some(
    (item) =>
      item.isFile()
      && item.name.toLowerCase().startsWith('embedding')
      && item.name.toLowerCase().endsWith('.onnx'),
  )

  if (!hasEncoderAdaptor || !hasLlm || !hasEmbedding) {
    return false
  }

  const tokenizerCandidates = entries
    .filter((item) => item.isDirectory())
    .map((item) => path.join(localModelDir, item.name))
  for (const tokenizerDir of tokenizerCandidates) {
    try {
      const tokenizerStat = await fs.stat(path.join(tokenizerDir, 'tokenizer.json'))
      if (tokenizerStat.isFile()) {
        return true
      }
    } catch {
      continue
    }
  }

  return false
}

interface ProxyRequestConfig {
  useProxy: boolean
  proxyUrl: string | null
}

async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true })
}

async function removeDirectoryIfExists(dirPath: string): Promise<void> {
  await fs.rm(dirPath, { recursive: true, force: true })
}

function buildAxiosDownloadConfig(config: ProxyRequestConfig, signal: AbortSignal): AxiosRequestConfig {
  const requestConfig: AxiosRequestConfig = {
    responseType: 'stream',
    signal,
    timeout: 120_000,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    validateStatus: (status) => status >= 200 && status < 300,
  }

  if (!config.useProxy || !config.proxyUrl) {
    return requestConfig
  }

  const normalizedProxy = config.proxyUrl.trim()
  if (!normalizedProxy) {
    return requestConfig
  }

  let proxyUrl: URL
  try {
    proxyUrl = new URL(normalizedProxy)
  } catch {
    throw new Error(`proxy_url_invalid:${normalizedProxy}`)
  }

  const protocol = proxyUrl.protocol.toLowerCase()
  if (protocol === 'socks:' || protocol === 'socks4:' || protocol === 'socks5:' || protocol === 'socks5h:') {
    const agent = new SocksProxyAgent(proxyUrl.toString())
    requestConfig.proxy = false
    requestConfig.httpAgent = agent
    requestConfig.httpsAgent = agent
    return requestConfig
  }

  if (protocol === 'http:' || protocol === 'https:') {
    const agent = new HttpsProxyAgent(proxyUrl.toString())
    requestConfig.proxy = false
    requestConfig.httpAgent = agent
    requestConfig.httpsAgent = agent
    return requestConfig
  }

  throw new Error(`proxy_protocol_unsupported:${protocol}`)
}

async function writeChunk(writer: Writable, chunk: Buffer): Promise<void> {
  if (writer.write(chunk)) {
    return
  }
  await new Promise<void>((resolve, reject) => {
    writer.once('drain', () => resolve())
    writer.once('error', (error) => reject(error))
  })
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

    const models: Array<ListSubtitleLocalModelsResponseDto['models'][number]> = []

    const candidateDirs: string[] = [normalizedModelDir]
    let entries: Array<Awaited<ReturnType<typeof fs.readdir>>[number]> = []
    try {
      entries = await fs.readdir(normalizedModelDir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue
        }
        if (entry.name.startsWith('.mpx-subtitle-staging-')) {
          continue
        }
        candidateDirs.push(path.join(normalizedModelDir, entry.name))
      }
    } catch {
      return listSubtitleLocalModelsResponseSchema.parse({
        model_dir: normalizedModelDir,
        models: [],
      })
    }

    for (const localModelDir of candidateDirs) {
      let modelFiles: Array<Awaited<ReturnType<typeof fs.readdir>>[number]> = []
      try {
        modelFiles = await fs.readdir(localModelDir, { withFileTypes: true })
      } catch {
        continue
      }

      const hasSenseVoice = hasSenseVoiceModelFiles(modelFiles)
      const hasFunasrNano = await hasFunasrNanoModelFiles(localModelDir)
      if (!hasSenseVoice && !hasFunasrNano) {
        continue
      }

      const manifestPath = path.join(localModelDir, LOCAL_MANIFEST_FILE)
      const manifest = await readJsonFile<{
        id?: string
        label?: string
        installed_at_ms?: number
      }>(manifestPath)
      const defaultId = path.basename(localModelDir)

      models.push({
        id: manifest?.id?.trim() || defaultId,
        label: manifest?.label?.trim() || defaultId,
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

  async clearLocalModel(modelDir: string, modelId: string): Promise<ClearSubtitleLocalModelResponseDto> {
    const normalizedModelDir = modelDir.trim()
    const normalizedModelId = modelId.trim()
    if (!normalizedModelDir || !normalizedModelId) {
      return clearSubtitleLocalModelResponseSchema.parse({
        ok: false,
        removed_path: null,
        message: 'subtitle_model_clear_invalid_input',
      })
    }

    const baseDir = path.resolve(normalizedModelDir)
    const targetDir = path.resolve(path.join(baseDir, normalizedModelId))
    const relative = path.relative(baseDir, targetDir)
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
      return clearSubtitleLocalModelResponseSchema.parse({
        ok: false,
        removed_path: null,
        message: 'subtitle_model_clear_path_outside_model_dir',
      })
    }

    try {
      const stat = await fs.stat(targetDir)
      if (!stat.isDirectory()) {
        return clearSubtitleLocalModelResponseSchema.parse({
          ok: false,
          removed_path: null,
          message: 'subtitle_model_clear_target_not_directory',
        })
      }
    } catch {
      return clearSubtitleLocalModelResponseSchema.parse({
        ok: false,
        removed_path: null,
        message: 'subtitle_model_clear_not_found',
      })
    }

    await removeDirectoryIfExists(targetDir)
    return clearSubtitleLocalModelResponseSchema.parse({
      ok: true,
      removed_path: targetDir,
      message: null,
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

    const tempFiles: string[] = []
    try {
      await ensureDirectory(task.modelDir)

      let doneBytes = 0
      const totalBytes = Math.max(task.model.size_bytes, 1)
      this.updateProgress(task, doneBytes, totalBytes)

      for (const artifact of task.model.artifacts) {
        if (task.abortController.signal.aborted) {
          throw new Error('download_cancelled')
        }

        const targetPath = path.join(task.modelDir, artifact.relative_path)
        await ensureDirectory(path.dirname(targetPath))
        const tempPath = `${targetPath}.partial`
        tempFiles.push(tempPath)
        const requestConfig = buildAxiosDownloadConfig(
          {
            useProxy: task.dto.use_proxy,
            proxyUrl: task.dto.proxy_url,
          },
          task.abortController.signal,
        )
        const response = await axios.get<NodeJS.ReadableStream>(artifact.url, requestConfig)
        const contentLengthRaw = response.headers['content-length']
        const contentLength = Number(Array.isArray(contentLengthRaw) ? contentLengthRaw[0] : contentLengthRaw ?? 0)
        const artifactSize = artifact.size_bytes ?? (Number.isFinite(contentLength) ? Math.max(0, contentLength) : 0)

        const writer = createWriteStream(tempPath)
        const stream = response.data
        let artifactDone = 0

        for await (const chunk of stream) {
          if (task.abortController.signal.aborted) {
            throw new Error('download_cancelled')
          }

          const chunkBuffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
          await writeChunk(writer, chunkBuffer)
          artifactDone += chunkBuffer.byteLength
          doneBytes += chunkBuffer.byteLength

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

        await fs.rm(targetPath, { force: true }).catch(() => undefined)
        await fs.rename(tempPath, targetPath)
      }

      const installedAtMs = nowMs()
      await fs.writeFile(
        path.join(task.modelDir, LOCAL_MANIFEST_FILE),
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
        task.dto.message = task.dto.message ?? '用户取消下载'
      } else {
        task.dto.status = 'failed'
        task.dto.speed_bps = 0
        task.dto.eta_sec = null
        task.dto.completed_at_ms = nowMs()
        task.dto.updated_at_ms = nowMs()
        task.dto.message = error instanceof Error ? error.message : String(error)
      }
    } finally {
      for (const tempPath of tempFiles) {
        await fs.rm(tempPath, { force: true }).catch(() => undefined)
      }
    }
  }
}
