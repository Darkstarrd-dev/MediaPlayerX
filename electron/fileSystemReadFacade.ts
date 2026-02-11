import { promises as fs } from 'node:fs'
import path from 'node:path'

import {
  clearDatabaseResponseSchema,
  clearVectorDataResponseSchema,
  generatePackageAutoTagsResponseSchema,
  generatePackageAutoTagsVisionResponseSchema,
  generatePackageEmbeddingsResponseSchema,
  testEmbeddingModelResponseSchema,
  type EnqueueImportTaskRequestDto,
  type EnqueueImportTaskResponseDto,
  type ClearDatabaseResponseDto,
  type ClearVectorDataResponseDto,
  type GeneratePackageAutoTagsRequestDto,
  type GeneratePackageAutoTagsResponseDto,
  type GeneratePackageAutoTagsVisionRequestDto,
  type GeneratePackageAutoTagsVisionResponseDto,
  type GeneratePackageEmbeddingsRequestDto,
  type GeneratePackageEmbeddingsResponseDto,
  type ImportTaskDto,
  type LibrarySnapshotDto,
  type MediaAccessAuditResponseDto,
  type ReadVectorDataStatusResponseDto,
  type MediaLocatorDto,
  type ReadPlaylistResponseDto,
  type ReadAppStateRequestDto,
  type ReadAppStateResponseDto,
  type ReadImageMetadataRequestDto,
  type ReadImageMetadataResponseDto,
  type ReadRuntimeCapabilitiesResponseDto,
  type ReadArchiveLoadStatusResponseDto,
  type ReadImagePageRequestDto,
  type ReadImagePageResponseDto,
  type ReadImageSidebarTreeRequestDto,
  type ReadImageSidebarTreeResponseDto,
  type ResolveMediaResourceRequestDto,
  type ResolveMediaResourceResponseDto,
  type RetryImportTaskRequestDto,
  type RetryImportTaskResponseDto,
  type SaveVideoCoverRequestDto,
  type SaveVideoCoverResponseDto,
  type SetImageHiddenRequestDto,
  type SetImageHiddenResponseDto,
  type DeleteImageItemsRequestDto,
  type DeleteImageItemsResponseDto,
  type DeleteSidebarNodesRequestDto,
  type DeleteSidebarNodesResponseDto,
  type StartManageAdReviewRequestDto,
  type StartManageAdReviewResponseDto,
  type ReadManageAdReviewTaskRequestDto,
  type ReadManageAdReviewTaskResponseDto,
  type PauseManageAdReviewTaskRequestDto,
  type PauseManageAdReviewTaskResponseDto,
  type TestAdReviewVisionModelRequestDto,
  type TestAdReviewVisionModelResponseDto,
  type TestWdSwinTaggerModelRequestDto,
  type TestWdSwinTaggerModelResponseDto,
  type TestEmbeddingModelRequestDto,
  type TestEmbeddingModelResponseDto,
  type ConfirmManageAdReviewDeleteRequestDto,
  type ConfirmManageAdReviewDeleteResponseDto,
  type WritePlaylistRequestDto,
  type WritePlaylistResponseDto,
  type WritePackageMetadataRequestDto,
  type WritePackageMetadataResponseDto,
  type WriteVideoMetadataRequestDto,
  type WriteVideoMetadataResponseDto,
  type WritePackageGradeRequestDto,
  type WritePackageGradeResponseDto,
  type WriteAppStateRequestDto,
  type WriteAppStateResponseDto,
} from '../src/contracts/backend'
import { MEDIA_PROTOCOL_SCHEME } from './channels'
import {
  isPathAllowlisted,
  type MediaAccessGuardContext,
} from './fileSystemMediaAccessGuard'
import {
  type MediaProtocolResponsePayload,
  type MediaProtocolStreamResponsePayload,
} from './fileSystemMediaReaders'
import { MediaLibraryDatabase } from './mediaLibraryDatabase'
import {
  applyPackageMetadataWrite,
  type PersistedVideoMetadataRecord,
} from './fileSystemMetadataWriters'
import { OpenAiVisionClient, normalizeChatCompletionsUrl } from './manageAdReview'
import { MediaTokenService } from './services/file-system-read/mediaTokenService'
import { ImportPathRegistry } from './services/file-system-read/importPathRegistry'
import {
  ARCHIVE_EXTENSIONS,
  ARCHIVE_NORMALIZE_DIR_NAME,
  ARCHIVE_NORMALIZE_IDLE_MS,
  ARCHIVE_NORMALIZE_RECHECK_MS,
  ARCHIVE_SCAN_CONCURRENCY,
  COLOR_PALETTE,
  DIRECTORY_SCAN_CONCURRENCY,
  FFMPEG_BIN,
  FFPROBE_BIN,
  IMAGE_EXTENSIONS,
  IMAGE_EXTENSIONS_FOR_WEBP_CONVERT,
  LEGACY_IMPORTS_DIR_NAME,
  MEDIA_TOKEN_TTL_MS,
  THUMBNAIL_CACHE_DIR_NAME,
  VIDEO_EXTENSIONS,
  ZIP_COMPRESSION_DEFLATE,
  ZIP_COMPRESSION_STORE,
  ZIP_GENERAL_PURPOSE_FLAG_ENCRYPTED,
} from './services/file-system-read/fileSystemReadFacadeConfig'
import { ArchiveNormalizationService } from './services/file-system-read/archiveNormalizationService'
import {
  type ArchiveLoadStatusListener,
  type FileSystemReadServiceEvents,
  type LibraryChangedEventPayload,
  type LibraryChangedListener,
} from './services/file-system-read/fileSystemReadFacadeEvents'
import { ImportTaskService } from './services/file-system-read/importTaskService'
import {
  LibrarySnapshotService,
  type PersistedVideoCoverRecord,
} from './services/file-system-read/librarySnapshotService'
import { ManagementMutationService } from './services/file-system-read/managementMutationService'
import { ManageAdReviewService } from './services/file-system-read/manageAdReviewService'
import { MediaResourceService } from './services/file-system-read/mediaResourceService'
import { LibraryReadWriteService } from './services/file-system-read/libraryReadWriteService'
import {
  RuntimeDependencyService,
  type RuntimeDependencySnapshot,
} from './services/file-system-read/runtimeDependencyService'
import { ServiceEventBus } from './services/file-system-read/serviceEventBus'
import { WdSwinV2TaggerService } from './services/file-system-read/wdSwinV2TaggerService'

const DEFAULT_VISION_AUTO_TAG_TIMEOUT_MS = 45_000
const VISION_AUTO_TAG_SYSTEM_PROMPT =
  'You are an image tagging model. Return JSON only in this exact format: {"is_ad": false, "reason": "tag_1,tag_2"}. The reason field must be a comma-separated tag list. Do not include explanations.'
const VISION_AUTO_TAG_USER_PROMPT =
  'Describe this image with concise danbooru-style tags. Return JSON only with is_ad and reason. Put tags in reason separated by commas.'
const VISION_TAG_HEADER_KEYS = new Set([
  'tag',
  'tags',
  'name',
  'tagname',
  'label',
  'labels',
  'biaoqian',
  'biaoqianming',
])

function normalizeVisionTagValue(value: string): string {
  return value
    .trim()
    .replace(/^['"`]+|['"`]+$/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_')
}

function normalizeVisionHeaderKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      const next = line[index + 1]
      if (inQuotes && next === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }

    current += char
  }

  cells.push(current)
  return cells
}

async function loadAllowedVisionTags(csvPathInput: string): Promise<Set<string>> {
  const normalizedPath = path.resolve(csvPathInput)
  const raw = await fs.readFile(normalizedPath, 'utf8')
  const rows = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => parseCsvLine(line))
    .filter((cells) => cells.length > 0)

  if (rows.length === 0) {
    throw new Error('视觉自动标签失败：CSV 内容为空')
  }

  const header = rows[0] ?? []
  const matchedHeaderIndex = header.findIndex((cell) => VISION_TAG_HEADER_KEYS.has(normalizeVisionHeaderKey(cell)))
  const tagColumnIndex = matchedHeaderIndex >= 0 ? matchedHeaderIndex : 0
  const dataStartIndex = matchedHeaderIndex >= 0 ? 1 : 0

  const allowedTags = new Set<string>()
  for (let rowIndex = dataStartIndex; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]
    if (!row) {
      continue
    }
    const rawValue = row[tagColumnIndex] ?? row[0] ?? ''
    const normalized = normalizeVisionTagValue(rawValue)
    if (normalized) {
      allowedTags.add(normalized)
    }
  }

  if (allowedTags.size === 0) {
    throw new Error('视觉自动标签失败：CSV 未解析到可用标签')
  }

  return allowedTags
}

function parseVisionTagsFromReason(reason: string): string[] {
  const parts = reason
    .split(/[\n,，;；|]+/)
    .map((part) => normalizeVisionTagValue(part))
    .filter(Boolean)
  return Array.from(new Set(parts))
}

type ImageItemForVisionTag = LibrarySnapshotDto['image_packages'][number]['images'][number]
type ImageSourceForEmbedding = LibrarySnapshotDto['image_packages'][number]
type ImageItemForEmbedding = ImageSourceForEmbedding['images'][number]

function pickSampleImages(images: ImageItemForVisionTag[], sampleCount: number): ImageItemForVisionTag[] {
  const safeCount = Math.max(1, Math.floor(sampleCount))
  if (images.length <= safeCount) {
    return images
  }

  if (safeCount === 1) {
    return [images[0]!]
  }

  const pickedIndexes = new Set<number>()
  const maxIndex = images.length - 1
  for (let offset = 0; offset < safeCount; offset += 1) {
    const ratio = offset / (safeCount - 1)
    pickedIndexes.add(Math.round(maxIndex * ratio))
  }

  const sortedIndexes = Array.from(pickedIndexes).sort((a, b) => a - b)
  return sortedIndexes.slice(0, safeCount).map((index) => images[index]!).filter(Boolean)
}

const DEFAULT_PACKAGE_EMBEDDING_TIMEOUT_MS = 45_000
const DEFAULT_PACKAGE_EMBEDDING_MAX_CONCURRENCY = 4
const DEFAULT_PACKAGE_EMBEDDING_MAX_RETRIES = 1

function normalizeEmbeddingsUrl(endpoint: string): string {
  const trimmed = endpoint.trim()
  if (!trimmed) {
    throw new Error('Embedding endpoint 不能为空')
  }

  const rewritePath = (pathnameInput: string): string => {
    const pathname = pathnameInput.replace(/\/+$/, '')
    if (pathname.endsWith('/embeddings')) {
      return pathname
    }
    if (pathname.endsWith('/chat/completions')) {
      return pathname.replace(/\/chat\/completions$/, '/embeddings')
    }
    if (pathname.endsWith('/v1')) {
      return `${pathname}/embeddings`
    }
    return `${pathname}/embeddings`
  }

  try {
    const parsed = new URL(trimmed)
    parsed.pathname = rewritePath(parsed.pathname)
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return rewritePath(trimmed)
  }
}

function normalizeModelsUrl(endpoint: string): string {
  const trimmed = endpoint.trim()
  if (!trimmed) {
    throw new Error('模型列表 endpoint 不能为空')
  }

  const rewritePath = (pathnameInput: string): string => {
    const pathname = pathnameInput.replace(/\/+$/, '')
    if (pathname.endsWith('/models')) {
      return pathname
    }
    if (pathname.endsWith('/embeddings')) {
      return pathname.replace(/\/embeddings$/, '/models')
    }
    if (pathname.endsWith('/chat/completions')) {
      return pathname.replace(/\/chat\/completions$/, '/models')
    }
    if (pathname.endsWith('/v1')) {
      return `${pathname}/models`
    }
    return `${pathname}/models`
  }

  try {
    const parsed = new URL(trimmed)
    parsed.pathname = rewritePath(parsed.pathname)
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return rewritePath(trimmed)
  }
}

interface OpenAiModelCatalogItem {
  id: string
  payload: Record<string, unknown>
}

type EmbeddingCapability = 'embedding' | 'non-embedding' | 'unknown'

function extractModelCatalogFromResponseBody(responseBody: unknown): OpenAiModelCatalogItem[] {
  if (!responseBody || typeof responseBody !== 'object') {
    throw new Error('模型列表响应格式错误：缺少 JSON 对象')
  }

  const data = (responseBody as { data?: unknown }).data
  if (!Array.isArray(data)) {
    throw new Error('模型列表响应格式错误：缺少 data 数组')
  }

  const items = data
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }
      const payload = item as Record<string, unknown>
      const id = typeof payload.id === 'string' ? payload.id.trim() : ''
      if (!id) {
        return null
      }
      return {
        id,
        payload,
      }
    })
    .filter((item): item is OpenAiModelCatalogItem => Boolean(item))

  if (items.length === 0) {
    throw new Error('模型列表响应格式错误：data 中无有效模型')
  }

  return items
}

function resolveEmbeddingCapability(payload: Record<string, unknown>): EmbeddingCapability {
  const booleanKeys = [
    'embedding',
    'embeddings',
    'is_embedding',
    'is_embedding_model',
    'supports_embedding',
    'supports_embeddings',
  ]

  for (const key of booleanKeys) {
    const value = payload[key]
    if (typeof value === 'boolean') {
      return value ? 'embedding' : 'non-embedding'
    }
  }

  const extractStrings = (value: unknown): string[] => {
    if (typeof value === 'string') {
      return [value]
    }
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string')
    }
    if (value && typeof value === 'object') {
      return Object.values(value)
        .filter((item): item is string => typeof item === 'string')
    }
    return []
  }

  const capabilityTexts: string[] = []
  for (const key of ['capability', 'capabilities', 'task', 'tasks', 'modality', 'modalities', 'type', 'model_type']) {
    capabilityTexts.push(...extractStrings(payload[key]))
  }
  if (payload.architecture && typeof payload.architecture === 'object') {
    capabilityTexts.push(...extractStrings((payload.architecture as Record<string, unknown>).type))
  }

  const normalized = capabilityTexts.map((value) => value.toLowerCase())
  if (normalized.some((value) => value.includes('embedding'))) {
    return 'embedding'
  }
  if (normalized.some((value) => value.includes('chat') || value.includes('completion') || value.includes('generate'))) {
    return 'non-embedding'
  }
  return 'unknown'
}

async function requestModelCatalog(params: {
  endpoint: string
  timeoutMs: number
  apiKey: string
}): Promise<OpenAiModelCatalogItem[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, params.timeoutMs)

  let response: Response
  try {
    response = await fetch(params.endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
      },
      signal: controller.signal,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`模型列表请求超时: ${params.timeoutMs}ms`)
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`模型列表请求失败: ${message}`)
  } finally {
    clearTimeout(timeoutId)
  }

  const bodyText = await response.text()
  if (!response.ok) {
    throw new Error(`模型列表请求失败: HTTP ${response.status} ${response.statusText} - ${bodyText.slice(0, 300)}`)
  }

  let responseBody: unknown
  try {
    responseBody = JSON.parse(bodyText)
  } catch {
    throw new Error(`模型列表响应不是合法 JSON: ${bodyText.slice(0, 300)}`)
  }

  return extractModelCatalogFromResponseBody(responseBody)
}

function toFiniteNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return []
  }

  const normalized: number[] = []
  for (const item of value) {
    const numeric = typeof item === 'number' ? item : Number(item)
    if (Number.isFinite(numeric)) {
      normalized.push(numeric)
    }
  }
  return normalized
}

function extractEmbeddingVectorsFromResponseBody(responseBody: unknown): number[][] {
  if (!responseBody || typeof responseBody !== 'object') {
    throw new Error('Embedding 响应格式错误：缺少 JSON 对象')
  }

  const data = (responseBody as { data?: unknown }).data
  if (Array.isArray(data) && data.length > 0) {
    const vectorsWithIndex: Array<{ index: number; vector: number[] }> = []

    for (let dataIndex = 0; dataIndex < data.length; dataIndex += 1) {
      const item = data[dataIndex]
      if (!item || typeof item !== 'object') {
        throw new Error('Embedding 响应格式错误：data 项不是对象')
      }

      const vector = toFiniteNumberArray((item as { embedding?: unknown }).embedding)
      if (vector.length === 0) {
        throw new Error('Embedding 响应格式错误：embedding 向量为空')
      }

      const rawIndex = (item as { index?: unknown }).index
      const normalizedIndex = Number.isFinite(rawIndex)
        ? Math.max(0, Math.floor(Number(rawIndex)))
        : dataIndex
      vectorsWithIndex.push({
        index: normalizedIndex,
        vector,
      })
    }

    vectorsWithIndex.sort((left, right) => left.index - right.index)
    return vectorsWithIndex.map((item) => item.vector)
  }

  const directVector = toFiniteNumberArray((responseBody as { embedding?: unknown }).embedding)
  if (directVector.length > 0) {
    return [directVector]
  }

  throw new Error('Embedding 响应格式错误：未找到 embedding 向量')
}

function buildImageEmbeddingInput(source: ImageSourceForEmbedding, image: ImageItemForEmbedding): string {
  const locatorLabel =
    image.media_locator.kind === 'filesystem'
      ? path.basename(image.media_locator.absolute_path)
      : image.media_locator.entry_name
  const tags = source.tags.join(', ')

  return [
    `package=${source.display_name}`,
    `work=${source.work_title}`,
    `circle=${source.circle}`,
    `author=${source.author}`,
    `tags=${tags}`,
    `image=${locatorLabel}`,
    `ordinal=${image.ordinal}`,
    `resolution=${image.width}x${image.height}`,
  ].join('\n')
}

async function requestImageEmbeddingVectors(params: {
  endpoint: string
  model: string
  input: string | string[]
  timeoutMs: number
  apiKey: string
}): Promise<number[][]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, params.timeoutMs)

  let response: Response
  try {
    response = await fetch(params.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: params.model,
        input: params.input,
      }),
      signal: controller.signal,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Embedding 请求超时: ${params.timeoutMs}ms`)
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Embedding 请求失败: ${message}`)
  } finally {
    clearTimeout(timeoutId)
  }

  const bodyText = await response.text()
  if (!response.ok) {
    throw new Error(`Embedding 请求失败: HTTP ${response.status} ${response.statusText} - ${bodyText.slice(0, 300)}`)
  }

  let responseBody: unknown
  try {
    responseBody = JSON.parse(bodyText)
  } catch {
    throw new Error(`Embedding 响应不是合法 JSON: ${bodyText.slice(0, 300)}`)
  }

  return extractEmbeddingVectorsFromResponseBody(responseBody)
}

async function runWithConcurrency<T>(
  items: T[],
  maxConcurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  if (items.length === 0) {
    return
  }

  const safeConcurrency = Math.max(1, Math.floor(maxConcurrency))
  let index = 0

  const runners = Array.from({ length: Math.min(safeConcurrency, items.length) }, async () => {
    while (true) {
      const currentIndex = index
      index += 1
      if (currentIndex >= items.length) {
        return
      }
      await worker(items[currentIndex]!, currentIndex)
    }
  })

  await Promise.all(runners)
}

export class FileSystemMediaReadService {
  private readonly rootDir: string

  private readonly normalizedArchiveRootDir: string

  private readonly thumbnailCacheRootDir: string

  private readonly coverOutputRootDir: string

  private readonly database: MediaLibraryDatabase

  private stateHydrated = false

  private readonly mediaTokenService = new MediaTokenService(MEDIA_TOKEN_TTL_MS)

  private packageGradeOverridesBySourceId = new Map<string, number | null>()

  private videoCoverOverridesByVideoId = new Map<string, PersistedVideoCoverRecord>()

  private videoMetadataOverridesByVideoId = new Map<string, PersistedVideoMetadataRecord>()

  private readonly importPathRegistry = new ImportPathRegistry()

  private readonly runtimeDependencyService = new RuntimeDependencyService(FFMPEG_BIN, FFPROBE_BIN)

  private readonly eventBus = new ServiceEventBus<FileSystemReadServiceEvents>()

  private readonly archiveNormalizationService: ArchiveNormalizationService

  private readonly librarySnapshotService: LibrarySnapshotService

  private readonly importTaskService: ImportTaskService

  private readonly libraryReadWriteService: LibraryReadWriteService

  private readonly managementMutationService: ManagementMutationService

  private readonly manageAdReviewService: ManageAdReviewService

  private readonly wdSwinV2TaggerService: WdSwinV2TaggerService

  private readonly mediaResourceService: MediaResourceService

  constructor(rootDir: string) {
    this.rootDir = path.resolve(rootDir)
    this.normalizedArchiveRootDir = path.join(this.rootDir, ARCHIVE_NORMALIZE_DIR_NAME)
    this.thumbnailCacheRootDir = path.join(this.rootDir, THUMBNAIL_CACHE_DIR_NAME)
    this.coverOutputRootDir = path.join(this.rootDir, '.mediaplayerx', 'covers')
    this.database = new MediaLibraryDatabase(this.rootDir)

    this.archiveNormalizationService = new ArchiveNormalizationService({
      idleMs: ARCHIVE_NORMALIZE_IDLE_MS,
      recheckMs: ARCHIVE_NORMALIZE_RECHECK_MS,
      isTargetEligible: (sourceArchivePath) => this.isArchiveNormalizationTargetEligible(sourceArchivePath),
      hasRunningImportTasks: () => this.importTaskService.hasRunningImportTasks(),
      isSnapshotLoading: () => this.librarySnapshotService.isSnapshotLoading(),
      onArchiveNormalized: async (sourceArchivePath, outputZipPath) => {
        await this.replaceImportedFileSourcePath(sourceArchivePath, outputZipPath)
        this.invalidateCache()
      },
      emitLibraryChanged: (payload) => this.emitLibraryChanged(payload),
      emitArchiveLoadStatusChanged: (payload) => this.emitArchiveLoadStatusChanged(payload),
    })

    this.librarySnapshotService = new LibrarySnapshotService({
      rootDir: this.rootDir,
      normalizedArchiveRootDir: this.normalizedArchiveRootDir,
      legacyImportsDirName: LEGACY_IMPORTS_DIR_NAME,
      database: this.database,
      importPathRegistry: this.importPathRegistry,
      imageExtensions: IMAGE_EXTENSIONS,
      videoExtensions: VIDEO_EXTENSIONS,
      archiveExtensions: ARCHIVE_EXTENSIONS,
      colorPalette: COLOR_PALETTE,
      imageExtensionsForWebpConvert: IMAGE_EXTENSIONS_FOR_WEBP_CONVERT,
      directoryScanConcurrency: DIRECTORY_SCAN_CONCURRENCY,
      archiveScanConcurrency: ARCHIVE_SCAN_CONCURRENCY,
      ffmpegBin: FFMPEG_BIN,
      ffprobeBin: FFPROBE_BIN,
      zipGeneralPurposeFlagEncrypted: ZIP_GENERAL_PURPOSE_FLAG_ENCRYPTED,
      zipCompressionStore: ZIP_COMPRESSION_STORE,
      zipCompressionDeflate: ZIP_COMPRESSION_DEFLATE,
      ensureRuntimeDependencies: () => this.ensureRuntimeDependencies(),
      queueRar7zNormalization: (sourceArchivePath, priority) =>
        this.archiveNormalizationService.queueRar7zNormalization(sourceArchivePath, priority),
      getPackageGradeOverridesBySourceId: () => this.packageGradeOverridesBySourceId,
      getVideoCoverOverridesByVideoId: () => this.videoCoverOverridesByVideoId,
      getVideoMetadataOverridesByVideoId: () => this.videoMetadataOverridesByVideoId,
    })

    this.importTaskService = new ImportTaskService({
      rootDir: this.rootDir,
      legacyImportsDirName: LEGACY_IMPORTS_DIR_NAME,
      imageExtensions: IMAGE_EXTENSIONS,
      videoExtensions: VIDEO_EXTENSIONS,
      archiveExtensions: ARCHIVE_EXTENSIONS,
      database: this.database,
      invalidateCache: () => this.invalidateCache(),
      ensureSnapshotLoaded: () => this.ensureSnapshotLoaded(),
      emitLibraryChanged: (payload) => this.emitLibraryChanged(payload),
    })

    this.libraryReadWriteService = new LibraryReadWriteService({
      database: this.database,
      ffmpegBin: FFMPEG_BIN,
      coverOutputRootDir: this.coverOutputRootDir,
      packageGradeOverridesBySourceId: this.packageGradeOverridesBySourceId,
      videoCoverOverridesByVideoId: this.videoCoverOverridesByVideoId,
      videoMetadataOverridesByVideoId: this.videoMetadataOverridesByVideoId,
      ensureSnapshotLoaded: () => this.ensureSnapshotLoaded(),
      ensureRuntimeDependencies: () => this.ensureRuntimeDependencies(),
      markInteractiveRead: () => this.markInteractiveRead(),
      isRar7zPath: (filePath) => this.isRar7zPath(filePath),
      queueRar7zNormalization: (sourceArchivePath, priority) => this.queueRar7zNormalization(sourceArchivePath, priority),
      emitLibraryChanged: (payload) => this.emitLibraryChanged(payload as LibraryChangedEventPayload),
    })

    this.managementMutationService = new ManagementMutationService({
      rootDir: this.rootDir,
      thumbnailCacheRootDir: this.thumbnailCacheRootDir,
      database: this.database,
      importPathRegistry: this.importPathRegistry,
      ensureStateLoaded: () => this.ensureStateLoaded(),
      ensureSnapshotLoaded: () => this.ensureSnapshotLoaded(),
      syncSnapshotFromDatabase: () => this.syncSnapshotFromDatabase(),
      refreshArchiveIndexesForPaths: (archivePaths) => this.refreshArchiveIndexesForPaths(archivePaths),
      pruneArchiveIndexesByDeletedRoots: (deletedPaths) => this.pruneArchiveIndexesByDeletedRoots(deletedPaths),
      removeImportSourcePaths: (pathsToRemove) => this.removeImportSourcePaths(pathsToRemove),
      buildMediaAccessContext: () => this.buildMediaAccessContext(),
      emitLibraryChanged: (payload) => this.emitLibraryChanged(payload as LibraryChangedEventPayload),
    })

    this.manageAdReviewService = new ManageAdReviewService({
      database: this.database,
      ensureSnapshotLoaded: () => this.ensureSnapshotLoaded(),
      buildMediaAccessContext: () => this.buildMediaAccessContext(),
      getZipEntryIndexByPath: () => this.librarySnapshotService.getZipEntryIndexByPath(),
      deleteImageItems: (request) => this.managementMutationService.deleteImageItems(request),
    })

    this.wdSwinV2TaggerService = new WdSwinV2TaggerService()

    this.mediaResourceService = new MediaResourceService({
      mediaProtocolScheme: MEDIA_PROTOCOL_SCHEME,
      thumbnailCacheRootDir: this.thumbnailCacheRootDir,
      archiveNormalizeRecheckMs: ARCHIVE_NORMALIZE_RECHECK_MS,
      mediaTokenService: this.mediaTokenService,
      ensureSnapshotLoaded: () => this.ensureSnapshotLoaded(),
      markInteractiveRead: () => this.markInteractiveRead(),
      buildMediaAccessContext: () => this.buildMediaAccessContext(),
      ensureRuntimeDependencies: () => this.ensureRuntimeDependencies(),
      readImageBufferForThumbnail: (locator) => this.readImageBufferForThumbnail(locator),
      onThumbnailRenderingStart: () => this.archiveNormalizationService.onThumbnailRenderingStart(),
      onThumbnailRenderingEnd: () => this.archiveNormalizationService.onThumbnailRenderingEnd(),
      hasPendingArchiveNormalization: () => this.archiveNormalizationService.hasPending(),
      scheduleArchiveNormalizationDrain: (delayMs) => this.scheduleArchiveNormalizationDrain(delayMs),
      getZipEntryIndexByPath: () => this.librarySnapshotService.getZipEntryIndexByPath(),
    })

    this.importTaskService.recoverInterruptedImportTasks()
  }

  onLibraryChanged(listener: LibraryChangedListener): () => void {
    return this.eventBus.on('libraryChanged', listener)
  }

  onArchiveLoadStatusChanged(listener: ArchiveLoadStatusListener): () => void {
    return this.eventBus.on('archiveLoadStatus', listener)
  }

  private emitLibraryChanged(payload: LibraryChangedEventPayload): void {
    this.eventBus.emit('libraryChanged', payload)
  }

  private emitArchiveLoadStatusChanged(payload: ReadArchiveLoadStatusResponseDto): void {
    this.eventBus.emit('archiveLoadStatus', payload)
  }

  private markInteractiveRead(): void {
    this.archiveNormalizationService.onInteractiveRead()
  }

  private isRar7zPath(filePath: string): boolean {
    const extension = path.extname(filePath).toLowerCase()
    return extension === '.rar' || extension === '.7z'
  }

  private buildMediaAccessContext(): MediaAccessGuardContext {
    return {
      rootDir: this.rootDir,
      importDirectoryRoots: this.importPathRegistry.getImportDirectoryRoots(),
      importFileAllowlistKeys: this.importPathRegistry.getImportFileAllowlistKeys(),
      archiveEntryIndexByPath: this.librarySnapshotService.getArchiveEntryIndexByPath(),
      imageExtensions: IMAGE_EXTENSIONS,
      videoExtensions: VIDEO_EXTENSIONS,
    }
  }

  private isArchiveNormalizationTargetEligible(sourceArchivePath: string): boolean {
    if (!this.isRar7zPath(sourceArchivePath)) {
      return false
    }
    return isPathAllowlisted(sourceArchivePath, this.buildMediaAccessContext())
  }

  private scheduleArchiveNormalizationDrain(delayMs = 0): void {
    this.archiveNormalizationService.scheduleDrain(delayMs)
  }

  private queueRar7zNormalization(sourceArchivePath: string, priority: 'low' | 'high' = 'low'): void {
    this.archiveNormalizationService.queueRar7zNormalization(sourceArchivePath, priority)
  }

  invalidateCache(): void {
    this.librarySnapshotService.invalidateCache()
    this.stateHydrated = false
    // Keep archive allowlists until next snapshot is ready.
    // This avoids transient "entry not allowlisted" errors while a rescan is in progress.
    // Keep active media tokens until TTL expiry to avoid transient 404
    // during background refreshes or libraryChanged fan-out.
    this.cleanupExpiredTokens()
  }

  dispose(): void {
    this.archiveNormalizationService.dispose()
    this.eventBus.clear()
    this.database.dispose()
  }

  private cleanupExpiredTokens(): void {
    this.mediaTokenService.cleanupExpiredTokens()
  }

  private async ensureStateLoaded(): Promise<void> {
    if (this.stateHydrated) {
      return
    }

    this.packageGradeOverridesBySourceId = this.database.readPackageGrades()
    this.videoCoverOverridesByVideoId = this.database.readVideoCovers()
    this.videoMetadataOverridesByVideoId = this.database.readVideoMetadata()

    const rawImportSources = this.database.readImportSources()
    this.importPathRegistry.hydrate(rawImportSources)
    this.stateHydrated = true
  }

  private async replaceImportedFileSourcePath(sourceArchivePath: string, outputZipPath: string): Promise<void> {
    await this.ensureStateLoaded()

    const didReplace = this.importPathRegistry.replaceImportedFileSourcePath(sourceArchivePath, outputZipPath)
    if (!didReplace) {
      return
    }

    const nextSources = this.importPathRegistry.getImportSources()
    this.database.writeImportSources({
      directories: nextSources.directories,
      files: nextSources.files,
    })
  }

  private async removeImportSourcePaths(pathsToRemove: string[]): Promise<void> {
    await this.ensureStateLoaded()
    const didRemove = this.importPathRegistry.removeImportSourcePaths(pathsToRemove)
    if (!didRemove) {
      return
    }

    const nextSources = this.importPathRegistry.getImportSources()
    this.database.writeImportSources({
      directories: nextSources.directories,
      files: nextSources.files,
    })
  }

  private syncSnapshotFromDatabase(): LibrarySnapshotDto {
    return this.librarySnapshotService.syncSnapshotFromDatabase()
  }

  private async refreshArchiveIndexesForPaths(archivePaths: Iterable<string>): Promise<void> {
    await this.librarySnapshotService.refreshArchiveIndexesForPaths(archivePaths)
  }

  private pruneArchiveIndexesByDeletedRoots(deletedPaths: Iterable<string>): void {
    this.librarySnapshotService.pruneArchiveIndexesByDeletedRoots(deletedPaths, (archivePath) =>
      this.archiveNormalizationService.deleteStateByPath(archivePath),
    )
  }

  private async ensureRuntimeDependencies(): Promise<RuntimeDependencySnapshot> {
    return this.runtimeDependencyService.ensureRuntimeDependencies()
  }

  async readRuntimeCapabilities(): Promise<ReadRuntimeCapabilitiesResponseDto> {
    return this.runtimeDependencyService.readRuntimeCapabilities()
  }

  async readArchiveLoadStatus(): Promise<ReadArchiveLoadStatusResponseDto> {
    await this.ensureStateLoaded()
    return this.archiveNormalizationService.readArchiveLoadStatus()
  }

  async clearDatabase(): Promise<ClearDatabaseResponseDto> {
    this.database.clearDatabase()

    // Clear runtime artifacts and caches so "清除数据库" can reset visible imported content.
    // Keep runtime workspace directories themselves; only wipe their contents.
    await Promise.all([
      // Legacy copy-mode artifacts.
      fs.rm(path.join(this.rootDir, LEGACY_IMPORTS_DIR_NAME), { recursive: true, force: true }),
      fs.rm(this.coverOutputRootDir, { recursive: true, force: true }),
      fs.rm(this.thumbnailCacheRootDir, { recursive: true, force: true }),
      fs.rm(this.normalizedArchiveRootDir, { recursive: true, force: true }),
    ])

    this.packageGradeOverridesBySourceId = new Map()
    this.videoCoverOverridesByVideoId = new Map()
    this.videoMetadataOverridesByVideoId = new Map()
    this.importPathRegistry.clear()
    this.archiveNormalizationService.clear()
    this.mediaTokenService.clearActiveTokens()
    this.importTaskService.clearRuntimeState()
    this.librarySnapshotService.clearRuntimeState()
    this.invalidateCache()

    this.emitLibraryChanged({
      reason: 'clear-database',
      updated_at_ms: Date.now(),
    })

    return clearDatabaseResponseSchema.parse({
      cleared: true,
      cleared_at_ms: Date.now(),
    })
  }

  async readVectorDataStatus(): Promise<ReadVectorDataStatusResponseDto> {
    return this.database.readVectorDataStatus()
  }

  async clearVectorData(): Promise<ClearVectorDataResponseDto> {
    const clearedImages = this.database.clearImageFeatureVectors()
    const updatedAtMs = Date.now()

    if (clearedImages > 0) {
      this.emitLibraryChanged({
        reason: 'clear-vector-data',
        updated_at_ms: updatedAtMs,
      })
    }

    return clearVectorDataResponseSchema.parse({
      cleared_images: clearedImages,
      updated_at_ms: updatedAtMs,
    })
  }

  async readMediaAccessAudit(): Promise<MediaAccessAuditResponseDto> {
    return this.mediaResourceService.readMediaAccessAudit()
  }

  private async ensureSnapshotLoaded(): Promise<LibrarySnapshotDto> {
    return this.librarySnapshotService.ensureSnapshotLoaded(() => this.ensureStateLoaded())
  }

  private async readImageBufferForThumbnail(locator: MediaLocatorDto): Promise<Buffer> {
    return this.librarySnapshotService.readImageBufferForThumbnail(locator)
  }

  async readLibrarySnapshot(): Promise<LibrarySnapshotDto> {
    this.markInteractiveRead()
    return this.ensureSnapshotLoaded()
  }

  async readImageSidebarTree(
    request: ReadImageSidebarTreeRequestDto,
  ): Promise<ReadImageSidebarTreeResponseDto> {
    return this.libraryReadWriteService.readImageSidebarTree(request)
  }

  async readImagePage(request: ReadImagePageRequestDto): Promise<ReadImagePageResponseDto> {
    return this.libraryReadWriteService.readImagePage(request)
  }

  async readImageMetadata(
    request: ReadImageMetadataRequestDto,
  ): Promise<ReadImageMetadataResponseDto> {
    return this.libraryReadWriteService.readImageMetadata(request)
  }

  async writePackageGrade(
    request: WritePackageGradeRequestDto,
  ): Promise<WritePackageGradeResponseDto> {
    return this.libraryReadWriteService.writePackageGrade(request)
  }

  async setImageHidden(
    request: SetImageHiddenRequestDto,
  ): Promise<SetImageHiddenResponseDto> {
    return this.managementMutationService.setImageHidden(request)
  }

  async deleteImageItems(
    request: DeleteImageItemsRequestDto,
  ): Promise<DeleteImageItemsResponseDto> {
    return this.managementMutationService.deleteImageItems(request)
  }

  async deleteSidebarNodes(
    request: DeleteSidebarNodesRequestDto,
  ): Promise<DeleteSidebarNodesResponseDto> {
    return this.managementMutationService.deleteSidebarNodes(request)
  }

  async startManageAdReview(
    request: StartManageAdReviewRequestDto,
  ): Promise<StartManageAdReviewResponseDto> {
    return this.manageAdReviewService.startManageAdReview(request)
  }

  async readManageAdReviewTask(
    request: ReadManageAdReviewTaskRequestDto,
  ): Promise<ReadManageAdReviewTaskResponseDto> {
    return this.manageAdReviewService.readManageAdReviewTask(request)
  }

  async pauseManageAdReviewTask(
    request: PauseManageAdReviewTaskRequestDto,
  ): Promise<PauseManageAdReviewTaskResponseDto> {
    return this.manageAdReviewService.pauseManageAdReviewTask(request)
  }

  async testAdReviewVisionModel(
    request: TestAdReviewVisionModelRequestDto,
  ): Promise<TestAdReviewVisionModelResponseDto> {
    return this.manageAdReviewService.testAdReviewVisionModel(request)
  }

  async testWdSwinTaggerModel(
    request: TestWdSwinTaggerModelRequestDto,
  ): Promise<TestWdSwinTaggerModelResponseDto> {
    return this.wdSwinV2TaggerService.testModel(request)
  }

  async testEmbeddingModel(
    request: TestEmbeddingModelRequestDto,
  ): Promise<TestEmbeddingModelResponseDto> {
    const normalizedModel = request.embedding_model.trim()
    if (!normalizedModel) {
      return testEmbeddingModelResponseSchema.parse({
        ok: false,
        message: '模型测试失败：模型ID不能为空',
      })
    }

    const timeoutMs = Number.isFinite(request.timeout_ms)
      ? Math.max(3_000, Math.min(60_000, Math.floor(request.timeout_ms as number)))
      : 12_000
    const apiKey = process.env.MEDIA_PLAYERX_LLM_API_KEY?.trim() || 'lm-studio'

    try {
      const normalizedModelsEndpoint = normalizeModelsUrl(request.embedding_endpoint)
      const catalog = await requestModelCatalog({
        endpoint: normalizedModelsEndpoint,
        timeoutMs,
        apiKey,
      })

      const exact = catalog.find((item) => item.id === normalizedModel)
      const fallback = catalog.find((item) => item.id.toLowerCase() === normalizedModel.toLowerCase())
      const matched = exact ?? fallback
      if (!matched) {
        const preview = catalog
          .slice(0, 6)
          .map((item) => item.id)
          .join(', ')
        return testEmbeddingModelResponseSchema.parse({
          ok: false,
          message: `模型测试失败：模型ID未出现在 /models 列表中（已发现：${preview || '空'}）`,
        })
      }

      const capability = resolveEmbeddingCapability(matched.payload)
      if (capability === 'non-embedding') {
        return testEmbeddingModelResponseSchema.parse({
          ok: false,
          message: '模型测试失败：模型在服务端元数据中被标注为非 embedding',
        })
      }

      const capabilityMessage =
        capability === 'embedding' ? '已确认 embedding 能力' : '未返回能力字段，按模型存在性通过'
      return testEmbeddingModelResponseSchema.parse({
        ok: true,
        message: `模型连接正常（仅校验 /models，不触发推理；${capabilityMessage}）`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return testEmbeddingModelResponseSchema.parse({
        ok: false,
        message: `模型测试失败：${message}`,
      })
    }
  }

  async confirmManageAdReviewDelete(
    request: ConfirmManageAdReviewDeleteRequestDto,
  ): Promise<ConfirmManageAdReviewDeleteResponseDto> {
    return this.manageAdReviewService.confirmManageAdReviewDelete(request)
  }

  async writePackageMetadata(
    request: WritePackageMetadataRequestDto,
  ): Promise<WritePackageMetadataResponseDto> {
    return this.libraryReadWriteService.writePackageMetadata(request)
  }

  async generatePackageAutoTags(
    request: GeneratePackageAutoTagsRequestDto,
  ): Promise<GeneratePackageAutoTagsResponseDto> {
    const snapshot = await this.ensureSnapshotLoaded()
    const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
    const source = allSources.find((item) => item.id === request.package_id)
    if (!source) {
      throw new Error(`自动标签失败：source 不存在 ${request.package_id}`)
    }

    const visibleLocators = source.images
      .filter((image) => !(image.hidden ?? false))
      .map((image) => image.media_locator)

    const generated = await this.wdSwinV2TaggerService.generateTagsForPackage({
      modelPath: request.model_path,
      occurrenceThreshold: request.occurrence_threshold,
      generalMinScore: request.general_min_score,
      characterMinScore: request.character_min_score,
      includeRating: request.include_rating,
      ratingMinScore: request.rating_min_score,
      imageLocators: visibleLocators,
      readImageBuffer: async (locator) => this.readImageBufferForThumbnail(locator),
    })

    const metadataWritten = applyPackageMetadataWrite({
      snapshot,
      database: this.database,
      request: {
        package_id: source.id,
        work_title: source.work_title,
        circle: source.circle,
        author: source.author,
        tags: generated.generatedTags,
      },
    })

    this.emitLibraryChanged({
      reason: 'generate-package-auto-tags',
      updated_at_ms: metadataWritten.updated_at_ms,
    })

    return generatePackageAutoTagsResponseSchema.parse({
      package: metadataWritten.package,
      generated_tags: generated.generatedTags,
      analyzed_images: generated.analyzedImages,
      updated_at_ms: metadataWritten.updated_at_ms,
    })
  }

  async generatePackageAutoTagsVision(
    request: GeneratePackageAutoTagsVisionRequestDto,
  ): Promise<GeneratePackageAutoTagsVisionResponseDto> {
    const snapshot = await this.ensureSnapshotLoaded()
    const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
    const source = allSources.find((item) => item.id === request.package_id)
    if (!source) {
      throw new Error(`视觉自动标签失败：source 不存在 ${request.package_id}`)
    }

    const allowedTags = await loadAllowedVisionTags(request.tags_csv_path)
    const normalizedEndpoint = normalizeChatCompletionsUrl(request.llm_endpoint)
    const normalizedModel = request.llm_model.trim()
    if (!normalizedModel) {
      throw new Error('视觉自动标签失败：模型ID不能为空')
    }

    const timeoutMs = Number.isFinite(request.timeout_ms)
      ? Math.max(3_000, Math.min(120_000, Math.floor(request.timeout_ms as number)))
      : DEFAULT_VISION_AUTO_TAG_TIMEOUT_MS
    const sampleImageCount = Math.max(1, Math.min(24, Math.floor(request.sample_image_count)))
    const occurrenceThreshold = Math.max(1, Math.min(24, Math.floor(request.occurrence_threshold)))
    const temperature = Math.max(0, Math.min(1, request.temperature))

    const visibleImages = source.images.filter((image) => !(image.hidden ?? false))
    const sampledImages = pickSampleImages(visibleImages, sampleImageCount)

    const client = new OpenAiVisionClient({
      endpoint: normalizedEndpoint,
      model: normalizedModel,
      apiKey: process.env.MEDIA_PLAYERX_LLM_API_KEY,
      timeoutMs,
      temperature,
      systemPrompt: VISION_AUTO_TAG_SYSTEM_PROMPT,
      userPrompt: VISION_AUTO_TAG_USER_PROMPT,
    })

    const tagCountByValue = new Map<string, number>()
    const droppedTags = new Set<string>()
    let invalidResponseImages = 0

    for (const image of sampledImages) {
      try {
        const imageBytes = await this.readImageBufferForThumbnail(image.media_locator)
        const detection = await client.detectAd({ imageBytes })
        const tags = parseVisionTagsFromReason(detection.reason)
        if (tags.length === 0) {
          invalidResponseImages += 1
          continue
        }

        for (const tag of tags) {
          if (allowedTags.has(tag)) {
            tagCountByValue.set(tag, (tagCountByValue.get(tag) ?? 0) + 1)
            continue
          }
          droppedTags.add(tag)
        }
      } catch {
        invalidResponseImages += 1
      }
    }

    const generatedTags = Array.from(tagCountByValue.entries())
      .filter(([, count]) => count >= occurrenceThreshold)
      .sort((left, right) => {
        if (left[1] !== right[1]) {
          return right[1] - left[1]
        }
        return left[0].localeCompare(right[0], 'zh-CN')
      })
      .map(([tag]) => tag)

    const metadataWritten = applyPackageMetadataWrite({
      snapshot,
      database: this.database,
      request: {
        package_id: source.id,
        work_title: source.work_title,
        circle: source.circle,
        author: source.author,
        tags: generatedTags,
      },
    })

    this.emitLibraryChanged({
      reason: 'generate-package-auto-tags-vision',
      updated_at_ms: metadataWritten.updated_at_ms,
    })

    return generatePackageAutoTagsVisionResponseSchema.parse({
      package: metadataWritten.package,
      generated_tags: generatedTags,
      analyzed_images: sampledImages.length,
      dropped_tags: Array.from(droppedTags).sort((left, right) => left.localeCompare(right, 'zh-CN')),
      invalid_response_images: invalidResponseImages,
      updated_at_ms: metadataWritten.updated_at_ms,
    })
  }

  async generatePackageEmbeddings(
    request: GeneratePackageEmbeddingsRequestDto,
  ): Promise<GeneratePackageEmbeddingsResponseDto> {
    const snapshot = await this.ensureSnapshotLoaded()
    const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
    const source = allSources.find((item) => item.id === request.package_id)
    if (!source) {
      throw new Error(`生成嵌入失败：source 不存在 ${request.package_id}`)
    }

    const normalizedEndpoint = normalizeEmbeddingsUrl(request.embedding_endpoint)
    const normalizedModel = request.embedding_model.trim()
    if (!normalizedModel) {
      throw new Error('生成嵌入失败：模型ID不能为空')
    }

    const timeoutMs = Number.isFinite(request.timeout_ms)
      ? Math.max(3_000, Math.min(120_000, Math.floor(request.timeout_ms as number)))
      : DEFAULT_PACKAGE_EMBEDDING_TIMEOUT_MS
    const maxConcurrency = Number.isFinite(request.max_concurrency)
      ? Math.max(1, Math.min(8, Math.floor(request.max_concurrency as number)))
      : DEFAULT_PACKAGE_EMBEDDING_MAX_CONCURRENCY
    const maxRetries = Number.isFinite(request.max_retries)
      ? Math.max(0, Math.min(4, Math.floor(request.max_retries as number)))
      : DEFAULT_PACKAGE_EMBEDDING_MAX_RETRIES

    const visibleImages = source.images.filter((image) => !(image.hidden ?? false))
    const embeddingTargets = visibleImages.map((image) => ({
      image,
      input: buildImageEmbeddingInput(source, image),
    }))
    const batchCount = Math.max(1, Math.min(maxConcurrency, embeddingTargets.length))
    const embeddingBatches: Array<Array<{ image: ImageItemForEmbedding; input: string }>> = Array.from(
      { length: batchCount },
      () => [],
    )
    for (let targetIndex = 0; targetIndex < embeddingTargets.length; targetIndex += 1) {
      const batchIndex = targetIndex % batchCount
      embeddingBatches[batchIndex]!.push(embeddingTargets[targetIndex]!)
    }

    const vectorByImageId = new Map<string, number[]>()
    const apiKey = process.env.MEDIA_PLAYERX_LLM_API_KEY?.trim() || 'lm-studio'
    let vectorDimension = 0

    await runWithConcurrency(embeddingBatches, batchCount, async (batch) => {
      if (batch.length === 0) {
        return
      }
      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        try {
          const vectors = await requestImageEmbeddingVectors({
            endpoint: normalizedEndpoint,
            model: normalizedModel,
            input: batch.map((item) => item.input),
            timeoutMs,
            apiKey,
          })
          if (vectors.length !== batch.length) {
            throw new Error(`embedding 数量不一致：期望 ${batch.length}，实际 ${vectors.length}`)
          }

          for (let vectorIndex = 0; vectorIndex < vectors.length; vectorIndex += 1) {
            const vector = vectors[vectorIndex]!
            if (vector.length === 0) {
              throw new Error('embedding 向量为空')
            }

            if (vectorDimension === 0) {
              vectorDimension = vector.length
            }
            if (vector.length !== vectorDimension) {
              throw new Error(`embedding 维度不一致：${vector.length}`)
            }

            const target = batch[vectorIndex]
            if (!target) {
              throw new Error('embedding 映射失败：batch 越界')
            }
            vectorByImageId.set(target.image.id, vector)
          }

          return
        } catch {
          if (attempt >= maxRetries) {
            return
          }
        }
      }
    })

    const embeddingWrites = source.images
      .map((image) => {
        const vector = vectorByImageId.get(image.id)
        if (!vector) {
          return null
        }
        image.feature_vector = vector
        return {
          imageId: image.id,
          featureVector: vector,
        }
      })
      .filter((item): item is { imageId: string; featureVector: number[] } => Boolean(item))

    const embeddedImages = this.database.writeImageFeatureVectors(embeddingWrites)
    const analyzedImages = visibleImages.length
    const failedImages = Math.max(0, analyzedImages - embeddedImages)
    const updatedAtMs = Date.now()

    if (embeddedImages > 0) {
      this.emitLibraryChanged({
        reason: 'generate-package-embeddings',
        updated_at_ms: updatedAtMs,
      })
    }

    return generatePackageEmbeddingsResponseSchema.parse({
      package: source,
      analyzed_images: analyzedImages,
      embedded_images: embeddedImages,
      failed_images: failedImages,
      vector_dimension: vectorDimension,
      updated_at_ms: updatedAtMs,
    })
  }

  async writeVideoMetadata(
    request: WriteVideoMetadataRequestDto,
  ): Promise<WriteVideoMetadataResponseDto> {
    return this.libraryReadWriteService.writeVideoMetadata(request)
  }

  async saveVideoCover(
    request: SaveVideoCoverRequestDto,
  ): Promise<SaveVideoCoverResponseDto> {
    return this.libraryReadWriteService.saveVideoCover(request)
  }

  async readPlaylist(): Promise<ReadPlaylistResponseDto> {
    return this.libraryReadWriteService.readPlaylist()
  }

  async writePlaylist(request: WritePlaylistRequestDto): Promise<WritePlaylistResponseDto> {
    return this.libraryReadWriteService.writePlaylist(request)
  }

  async enqueueImportTask(request: EnqueueImportTaskRequestDto): Promise<EnqueueImportTaskResponseDto> {
    return this.importTaskService.enqueueImportTask(request)
  }

  async readImportTasks(): Promise<{ tasks: ImportTaskDto[] }> {
    return this.importTaskService.readImportTasks()
  }

  async retryImportTask(request: RetryImportTaskRequestDto): Promise<RetryImportTaskResponseDto> {
    return this.importTaskService.retryImportTask(request)
  }

  async resolveMediaResource(
    request: ResolveMediaResourceRequestDto,
  ): Promise<ResolveMediaResourceResponseDto> {
    return this.mediaResourceService.resolveMediaResource(request)
  }

  async readMediaResourceByToken(
    token: string,
    rangeHeader: string | null,
  ): Promise<MediaProtocolResponsePayload> {
    return this.mediaResourceService.readMediaResourceByToken(token, rangeHeader)
  }

  async readMediaResourceByTokenStream(
    token: string,
    rangeHeader: string | null,
    signal?: AbortSignal | null,
  ): Promise<MediaProtocolStreamResponsePayload> {
    return this.mediaResourceService.readMediaResourceByTokenStream(token, rangeHeader, signal)
  }

  async readAppState(request: ReadAppStateRequestDto): Promise<ReadAppStateResponseDto> {
    return this.libraryReadWriteService.readAppState(request)
  }

  async writeAppState(request: WriteAppStateRequestDto): Promise<WriteAppStateResponseDto> {
    return this.libraryReadWriteService.writeAppState(request)
  }
}
