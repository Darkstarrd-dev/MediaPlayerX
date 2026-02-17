import { createHash } from 'node:crypto'
import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'
import { Worker } from 'node:worker_threads'
import axios from 'axios'

import {
  listVideoSubtitlesResponseSchema,
  manageSubtitleCleanupTaskSchema,
  prepareSubtitleTrackResponseSchema,
  readAppStateResponseSchema,
  readImageMetadataResponseSchema,
  readImagePageResponseSchema,
  readImageSidebarTreeResponseSchema,
  readPlaylistResponseSchema,
  saveVideoCoverResponseSchema,
  writeAppStateResponseSchema,
  writePackageExternalMetadataResponseSchema,
  writePackageGradeResponseSchema,
  writePlaylistResponseSchema,
  type ImagePackageDto,
  type LibrarySnapshotDto,
  type ListVideoSubtitlesRequestDto,
  type ListVideoSubtitlesResponseDto,
  type ManageSubtitleCleanupTaskDto,
  type MediaLocatorDto,
  type PrepareSubtitleTrackRequestDto,
  type PrepareSubtitleTrackResponseDto,
  type ReadAppStateRequestDto,
  type ReadAppStateResponseDto,
  type ReadImageMetadataRequestDto,
  type ReadImageMetadataResponseDto,
  type ReadImagePageRequestDto,
  type ReadImagePageResponseDto,
  type ReadImageSidebarTreeRequestDto,
  type ReadImageSidebarTreeResponseDto,
  type ReadManageSubtitleCleanupTaskRequestDto,
  type ReadManageSubtitleCleanupTaskResponseDto,
  type RunManageSubtitleCleanupRequestDto,
  type RunManageSubtitleCleanupResponseDto,
  type ReadPlaylistResponseDto,
  type SaveManageSubtitleCleanupRequestDto,
  type SaveManageSubtitleCleanupResponseDto,
  type SaveVideoCoverRequestDto,
  type SaveVideoCoverResponseDto,
  type StartManageSubtitleCleanupRequestDto,
  type StartManageSubtitleCleanupResponseDto,
  type WriteAppStateRequestDto,
  type WriteAppStateResponseDto,
  type WritePackageGradeRequestDto,
  type WritePackageGradeResponseDto,
  type WritePackageMetadataRequestDto,
  type WritePackageMetadataResponseDto,
  type WritePackageExternalMetadataRequestDto,
  type WritePackageExternalMetadataResponseDto,
  type WritePlaylistRequestDto,
  type WritePlaylistResponseDto,
  type WriteVideoMetadataRequestDto,
  type WriteVideoMetadataResponseDto,
  type WriteAudioMetadataRequestDto,
  type WriteAudioMetadataResponseDto,
} from '../../../src/contracts/backend'
import { normalizeChatCompletionsUrl } from '../../manageAdReview/openAiVisionClient'
import {
  applyPackageMetadataWrite,
  applyVideoMetadataWrite,
  type PersistedVideoMetadataRecord,
} from '../../fileSystemMetadataWriters'
import { filterSources as filterLibrarySources } from '../../fileSystemSourceFilter'
import { probeImageDimensionsFromFile, runProcess } from '../../fileSystemRuntimeHelpers'
import { buildImageSidebarTree } from '../../fileSystemSidebarTree'
import { captureVideoCoverImage } from '../../fileSystemVideoCoverCapture'
import { detectMimeTypeByExtension, makeStableId, toDeterministicCoverColor, toSafeSizeKb } from '../../fileSystemServiceHelpers'
import { MediaLibraryDatabase } from '../../mediaLibraryDatabase'
import { probeSubtitleEngineStatus } from '../../subtitles/subtitleEngineProbe'
import type { PersistedVideoCoverRecord } from './librarySnapshotService'
import type { RuntimeDependencySnapshot } from './runtimeDependencyService'

const SOURCE_COVER_EXT_ALLOWLIST = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'])
const SUBTITLE_EXTENSIONS = new Set(['.vtt', '.srt', '.ass', '.ssa'])
const SETTINGS_STATE_KEY = 'ui_settings_v1'
const SUBTITLE_ASR_INIT_TIMEOUT_MS = 90_000
const SUBTITLE_ASR_TRANSCRIBE_TIMEOUT_BASE_MS = 60_000
const SUBTITLE_ASR_TRANSCRIBE_TIMEOUT_PER_SEC_MS = 6_000
const SUBTITLE_ASR_TRANSCRIBE_TIMEOUT_MIN_MS = 180_000
const SUBTITLE_ASR_TRANSCRIBE_TIMEOUT_CAP_MS = 30 * 60_000
const SUBTITLE_CLEANUP_LLM_TIMEOUT_MS = 3 * 60_000
const DEFAULT_SUBTITLE_CLEANUP_PROMPT =
  'You are a subtitle cleanup assistant. Keep timing lines and numbering valid SRT format. Only return cleaned full SRT content. Remove obvious ASR mistakes, fix punctuation and segmentation, do not invent content.'
const LANGUAGE_TAG_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]{2,8}){0,2}$/i

type SubtitleWorkerCommand = 'init' | 'stop' | 'reset' | 'flush' | 'push-audio' | 'transcribe-all'

interface SubtitleWorkerRequest {
  kind: 'request'
  request_id: string
  command: SubtitleWorkerCommand
  payload: unknown
}

interface SubtitleWorkerResponse {
  kind: 'response'
  request_id: string
  ok: boolean
  payload?: unknown
  error?: string
}

interface SubtitleWorkerCue {
  start_sec: number
  end_sec: number
  text: string
}

interface PersistedUiSettingsLike {
  subtitleModelDir?: unknown
  subtitleSelectedModelId?: unknown
  subtitleLanguage?: unknown
}

function formatSrtTime(seconds: number): string {
  const clamped = Math.max(0, Number.isFinite(seconds) ? seconds : 0)
  const wholeMs = Math.floor(clamped * 1000)
  const ms = wholeMs % 1000
  const wholeSec = Math.floor(wholeMs / 1000)
  const sec = wholeSec % 60
  const wholeMin = Math.floor(wholeSec / 60)
  const min = wholeMin % 60
  const hour = Math.floor(wholeMin / 60)
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

function cuesToSrt(cues: SubtitleWorkerCue[]): string {
  const lines: string[] = []
  let cueIndex = 1
  for (let index = 0; index < cues.length; index += 1) {
    const cue = cues[index]
    const cueText = cue.text.trim()
    if (!cueText) {
      continue
    }
    lines.push(String(cueIndex))
    lines.push(`${formatSrtTime(cue.start_sec)} --> ${formatSrtTime(Math.max(cue.start_sec + 0.2, cue.end_sec))}`)
    lines.push(cueText)
    lines.push('')
    cueIndex += 1
  }
  return lines.join('\n').trim()
}

function normalizeLanguageTag(tag: string): string {
  const parts = tag
    .trim()
    .split('-')
    .filter(Boolean)
  if (parts.length === 0) {
    return ''
  }
  return parts
    .map((part, index) => {
      if (index === 0) {
        return part.toLowerCase()
      }
      if (part.length <= 3 && /^[a-z]+$/i.test(part)) {
        return part.toUpperCase()
      }
      return part.toLowerCase()
    })
    .join('-')
}

function detectSubtitleLanguageLabel(fileName: string, videoStem: string): string | null {
  const ext = path.extname(fileName)
  const fileStem = path.basename(fileName, ext)
  const normalizedVideoStem = videoStem.trim().toLowerCase()
  const normalizedFileStem = fileStem.trim().toLowerCase()
  let candidate = ''

  if (normalizedFileStem.startsWith(`${normalizedVideoStem}.`)) {
    candidate = fileStem.slice(videoStem.length + 1)
  } else {
    const segments = fileStem.split('.')
    if (segments.length >= 2) {
      candidate = segments[segments.length - 1] ?? ''
    }
  }

  const trimmed = candidate.trim()
  if (!trimmed || !LANGUAGE_TAG_PATTERN.test(trimmed)) {
    return null
  }

  const normalized = normalizeLanguageTag(trimmed)
  return normalized || null
}

function tryParseSseDataLine(line: string): string | null {
  const raw = line.trim()
  if (!raw.startsWith('data:')) {
    return null
  }
  const payload = raw.slice(5).trim()
  return payload || null
}

function extractStreamDeltaText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return ''
  }
  const choices = (payload as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) {
    return ''
  }
  const first = choices[0]
  if (!first || typeof first !== 'object') {
    return ''
  }
  const delta = (first as { delta?: unknown }).delta
  if (!delta || typeof delta !== 'object') {
    return ''
  }
  const content = (delta as { content?: unknown }).content
  if (typeof content === 'string') {
    return content
  }
  if (!Array.isArray(content)) {
    return ''
  }
  return content
    .map((item) => (item && typeof item === 'object' && typeof (item as { text?: unknown }).text === 'string'
      ? ((item as { text: string }).text)
      : ''))
    .join('')
}

function extractChatMessageText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return ''
  }
  const choices = (payload as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) {
    return ''
  }
  const first = choices[0]
  if (!first || typeof first !== 'object') {
    return ''
  }
  const message = (first as { message?: unknown }).message
  if (!message || typeof message !== 'object') {
    return ''
  }
  const content = (message as { content?: unknown }).content
  if (typeof content === 'string') {
    return content
  }
  if (!Array.isArray(content)) {
    return ''
  }
  return content
    .map((item) => (item && typeof item === 'object' && typeof (item as { text?: unknown }).text === 'string'
      ? ((item as { text: string }).text)
      : ''))
    .join('')
}

class SubtitleWorkerClient {
  private requestSeed = 0
  private readonly pending = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void; timeout: ReturnType<typeof setTimeout> }>()

  constructor(private readonly worker: Worker) {
    this.worker.on('message', (raw: unknown) => {
      const message = raw as Partial<SubtitleWorkerResponse>
      if (message.kind !== 'response' || typeof message.request_id !== 'string') {
        return
      }
      const pending = this.pending.get(message.request_id)
      if (!pending) {
        return
      }
      clearTimeout(pending.timeout)
      this.pending.delete(message.request_id)
      if (!message.ok) {
        pending.reject(new Error(message.error ?? 'subtitle_worker_failed'))
        return
      }
      pending.resolve(message.payload)
    })

    this.worker.on('error', (error) => {
      this.failAll(error)
    })
    this.worker.on('exit', (code) => {
      if (code !== 0) {
        this.failAll(new Error(`subtitle_worker_exit_${code}`))
      }
    })
  }

  async request(command: SubtitleWorkerCommand, payload: unknown, timeoutMs = 20_000): Promise<unknown> {
    const requestId = `subtitle-worker-${Date.now()}-${this.requestSeed++}`
    const requestPayload: SubtitleWorkerRequest = {
      kind: 'request',
      request_id: requestId,
      command,
      payload,
    }

    return await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId)
        reject(new Error(`subtitle_worker_timeout:${command}`))
      }, timeoutMs)

      this.pending.set(requestId, { resolve, reject, timeout })
      try {
        this.worker.postMessage(requestPayload)
      } catch (error) {
        clearTimeout(timeout)
        this.pending.delete(requestId)
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }

  async terminate(): Promise<void> {
    this.failAll(new Error('subtitle_worker_terminated'))
    await this.worker.terminate()
  }

  private failAll(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout)
      pending.reject(error)
    }
    this.pending.clear()
  }
}

function normalizeExternalMetadataText(value: string | undefined): string {
  return value?.trim() ?? ''
}

function resolveCoverFileExtension(coverUrl: string): string {
  try {
    const parsed = new URL(coverUrl)
    const ext = path.extname(parsed.pathname).toLowerCase()
    if (SOURCE_COVER_EXT_ALLOWLIST.has(ext)) {
      return ext
    }
  } catch {
    // ignore invalid url
  }
  return '.jpg'
}

function resolveFallbackCoverColor(sourceId: string): string {
  const hash = createHash('sha1').update(sourceId).digest('hex')
  const hue = Number.parseInt(hash.slice(0, 2), 16) % 360
  return `hsl(${hue} 36% 42%)`
}

function filterHiddenImagesFromSource(source: ImagePackageDto, includeHidden: boolean): ImagePackageDto {
  if (includeHidden) {
    return source
  }

  const visibleImages = source.images.filter((image) => !(image.hidden ?? false))
  if (visibleImages.length === source.images.length) {
    return source
  }

  return {
    ...source,
    images: visibleImages,
  }
}

function filterHiddenImagesFromSources(sources: ImagePackageDto[], includeHidden: boolean): ImagePackageDto[] {
  if (includeHidden) {
    return sources
  }
  return sources.map((source) => filterHiddenImagesFromSource(source, includeHidden))
}

interface LibraryReadWriteServiceOptions {
  database: MediaLibraryDatabase
  ffmpegBin: string
  coverOutputRootDir: string
  rootDir: string
  packageGradeOverridesBySourceId: Map<string, number | null>
  videoCoverOverridesByVideoId: Map<string, PersistedVideoCoverRecord>
  videoMetadataOverridesByVideoId: Map<string, PersistedVideoMetadataRecord>
  ensureSnapshotLoaded: () => Promise<LibrarySnapshotDto>
  ensureRuntimeDependencies: () => Promise<RuntimeDependencySnapshot>
  markInteractiveRead: () => void
  isRar7zPath: (filePath: string) => boolean
  queueRar7zNormalization: (sourceArchivePath: string, priority?: 'low' | 'high') => void
  emitLibraryChanged: (payload: { reason: string; updated_at_ms: number }) => void
}

export class LibraryReadWriteService {
  private readonly subtitleCleanupTaskById = new Map<string, ManageSubtitleCleanupTaskDto>()

  constructor(private readonly options: LibraryReadWriteServiceOptions) {}

  private async convertSubtitleToVtt(sourcePath: string, subtitleId: string): Promise<string> {
    const outputDir = path.join(this.options.rootDir, '.mediaplayerx', 'subtitle-cache')
    const outputPath = path.join(outputDir, `${makeStableId('subtitle', subtitleId)}.vtt`)
    await fs.mkdir(outputDir, { recursive: true })
    const result = await runProcess(this.options.ffmpegBin, ['-y', '-i', sourcePath, outputPath], 20_000)
    if (result.code !== 0) {
      throw new Error(result.stderr.trim() || `字幕转换失败: ${sourcePath}`)
    }
    return outputPath
  }

  async readImageSidebarTree(
    request: ReadImageSidebarTreeRequestDto,
  ): Promise<ReadImageSidebarTreeResponseDto> {
    this.options.markInteractiveRead()
    const snapshot = await this.options.ensureSnapshotLoaded()
    const includeHidden = request.include_hidden ?? false
    const filtered = filterLibrarySources(snapshot, request)
    const filteredPackages = filterHiddenImagesFromSources(filtered.imagePackages, includeHidden)
    const filteredDirectories = filterHiddenImagesFromSources(filtered.imageDirectories, includeHidden)

    return readImageSidebarTreeResponseSchema.parse({
      image_packages: filteredPackages,
      image_directories: filteredDirectories,
      tree: buildImageSidebarTree(filteredPackages, filteredDirectories),
    })
  }

  async readImagePage(request: ReadImagePageRequestDto): Promise<ReadImagePageResponseDto> {
    this.options.markInteractiveRead()
    const snapshot = await this.options.ensureSnapshotLoaded()
    const includeHidden = request.include_hidden ?? false
    const filtered = filterLibrarySources(snapshot, {
      feature_filter: request.feature_filter,
      grade_overrides: request.grade_overrides,
    })

    const allSources = [...filtered.imagePackages, ...filtered.imageDirectories]
    const selectedById = request.source_id ? allSources.find((source) => source.id === request.source_id) : null
    const selectedSource =
      selectedById ?? allSources.find((source) => source.images.length > 0) ?? allSources[0] ?? null

    if (
      request.source_id &&
      selectedSource &&
      selectedSource.images.length === 0 &&
      this.options.isRar7zPath(selectedSource.absolute_path)
    ) {
      this.options.queueRar7zNormalization(selectedSource.absolute_path, 'high')
    }

    if (!selectedSource) {
      return readImagePageResponseSchema.parse({
        source_id: null,
        total_items: 0,
        page_index: 0,
        page_size: request.page_size,
        refs: [],
      })
    }

    const selectedSourceVisible = filterHiddenImagesFromSource(selectedSource, includeHidden)
    const totalItems = selectedSourceVisible.images.length
    const pageSize = request.show_names_only ? Math.max(1, totalItems) : request.page_size
    const maxPageIndex = Math.max(0, Math.ceil(totalItems / pageSize) - 1)
    const pageIndex = request.show_names_only ? 0 : Math.min(request.page_index, maxPageIndex)
    const pageStart = pageIndex * pageSize
    const pageEnd = pageStart + pageSize

    const refs = selectedSourceVisible.images.slice(pageStart, pageEnd).map((_, index) => ({
      package_id: selectedSource.id,
      image_index: pageStart + index,
    }))

    return readImagePageResponseSchema.parse({
      source_id: selectedSource.id,
      total_items: totalItems,
      page_index: pageIndex,
      page_size: request.page_size,
      refs,
    })
  }

  async readImageMetadata(
    request: ReadImageMetadataRequestDto,
  ): Promise<ReadImageMetadataResponseDto> {
    this.options.markInteractiveRead()
    const includeHidden = request.include_hidden ?? false
    const snapshot = await this.options.ensureSnapshotLoaded()
    const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
    const source = allSources.find((item) => item.id === request.package_id)
    const visibleSource = source ? filterHiddenImagesFromSource(source, includeHidden) : null
    const image = visibleSource?.images[request.image_index]

    if (
      visibleSource &&
      image &&
      image.media_locator.kind === 'filesystem' &&
      image.media_locator.media_type === 'image'
    ) {
      if (image.size_kb <= 0) {
        const stat = await fs.stat(image.media_locator.absolute_path).catch(() => null)
        if (stat?.isFile()) {
          image.size_kb = toSafeSizeKb(stat.size)
        }
      }

      if (image.width <= 0 || image.height <= 0) {
        const dimensions = await probeImageDimensionsFromFile(image.media_locator.absolute_path)
        if (dimensions.width > 0 && dimensions.height > 0) {
          image.width = dimensions.width
          image.height = dimensions.height
        }
      }
    }

    return readImageMetadataResponseSchema.parse(
      visibleSource && image
        ? {
            package: visibleSource,
            image,
            grade: visibleSource.mock_grade,
          }
        : null,
    )
  }

  async writePackageGrade(
    request: WritePackageGradeRequestDto,
  ): Promise<WritePackageGradeResponseDto> {
    const snapshot = await this.options.ensureSnapshotLoaded()
    const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
    const source = allSources.find((item) => item.id === request.package_id)
    if (!source) {
      throw new Error(`写入评分失败：source 不存在 ${request.package_id}`)
    }

    source.mock_grade = request.grade
    this.options.packageGradeOverridesBySourceId.set(request.package_id, request.grade)
    this.options.database.writePackageGrade(request.package_id, request.grade)

    this.options.emitLibraryChanged({
      reason: 'write-package-grade',
      updated_at_ms: Date.now(),
    })

    return writePackageGradeResponseSchema.parse({
      package_id: request.package_id,
      grade: request.grade,
      updated_at_ms: Date.now(),
    })
  }

  async writePackageMetadata(
    request: WritePackageMetadataRequestDto,
  ): Promise<WritePackageMetadataResponseDto> {
    const snapshot = await this.options.ensureSnapshotLoaded()
    const response = applyPackageMetadataWrite({
      snapshot,
      database: this.options.database,
      request,
    })

    this.options.emitLibraryChanged({
      reason: 'write-package-metadata',
      updated_at_ms: response.updated_at_ms,
    })

    return response
  }

  async writePackageExternalMetadata(
    request: WritePackageExternalMetadataRequestDto,
  ): Promise<WritePackageExternalMetadataResponseDto> {
    const snapshot = await this.options.ensureSnapshotLoaded()
    const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
    const source = allSources.find((item) => item.id === request.package_id)
    if (!source) {
      throw new Error(`写入外部元数据失败：source 不存在 ${request.package_id}`)
    }

    const updatedAtMs = Date.now()
    const externalMetadata = {
      source_site: request.source_site,
      source_url: request.source_url,
      source_remote_id: request.source_remote_id,
      source_token: normalizeExternalMetadataText(request.source_token),
      title: normalizeExternalMetadataText(request.title),
      title_jpn: normalizeExternalMetadataText(request.title_jpn),
      group_name: normalizeExternalMetadataText(request.group_name),
      group_name_jpn: normalizeExternalMetadataText(request.group_name_jpn),
      artist: normalizeExternalMetadataText(request.artist),
      artist_jpn: normalizeExternalMetadataText(request.artist_jpn),
      posted: normalizeExternalMetadataText(request.posted),
      rating: request.rating ?? null,
      favorited: request.favorited ?? null,
      tags: request.tags,
      raw_json: request.raw_json,
    }

    this.options.database.writeSourceExternalMetadata(source.id, {
      sourceSite: externalMetadata.source_site,
      sourceUrl: externalMetadata.source_url,
      sourceRemoteId: externalMetadata.source_remote_id,
      sourceToken: externalMetadata.source_token,
      title: externalMetadata.title,
      titleJpn: externalMetadata.title_jpn,
      groupName: externalMetadata.group_name,
      groupNameJpn: externalMetadata.group_name_jpn,
      artist: externalMetadata.artist,
      artistJpn: externalMetadata.artist_jpn,
      posted: externalMetadata.posted,
      rating: externalMetadata.rating,
      favorited: externalMetadata.favorited,
      tags: externalMetadata.tags,
      rawJson: externalMetadata.raw_json,
    })

    let sourceCover = source.source_cover ?? null
    const thumbUrl = request.thumb_url?.trim() ?? ''
    if (thumbUrl.length > 0) {
      const extension = resolveCoverFileExtension(thumbUrl)
      const fileHash = createHash('sha1').update(thumbUrl).digest('hex')
      const targetDir = path.join(this.options.coverOutputRootDir, 'source')
      const outputPath = path.join(targetDir, `${source.id}-${fileHash}${extension}`)
      await fs.mkdir(targetDir, { recursive: true })
      const response = await axios.get<ArrayBuffer>(thumbUrl, {
        responseType: 'arraybuffer',
        timeout: 12_000,
      })
      await fs.writeFile(outputPath, Buffer.from(response.data))

      const coverColor = sourceCover?.cover_color ?? resolveFallbackCoverColor(source.id)
      sourceCover = {
        cover_color: coverColor,
        cover_image_path: outputPath,
        updated_at_ms: updatedAtMs,
      }
      this.options.database.writeSourceCover(source.id, coverColor, outputPath)
    }

    source.external_metadata = externalMetadata
    source.source_cover = sourceCover

    this.options.emitLibraryChanged({
      reason: 'write-package-external-metadata',
      updated_at_ms: updatedAtMs,
    })

    return writePackageExternalMetadataResponseSchema.parse({
      package: source,
      updated_at_ms: updatedAtMs,
    })
  }

  async writeVideoMetadata(
    request: WriteVideoMetadataRequestDto,
  ): Promise<WriteVideoMetadataResponseDto> {
    const snapshot = await this.options.ensureSnapshotLoaded()
    const { response, persistedRecord } = applyVideoMetadataWrite({
      snapshot,
      database: this.options.database,
      request,
    })

    this.options.videoMetadataOverridesByVideoId.set(response.video.id, persistedRecord)

    this.options.emitLibraryChanged({
      reason: 'write-video-metadata',
      updated_at_ms: response.updated_at_ms,
    })

    return response
  }

  async writeAudioMetadata(
    request: WriteAudioMetadataRequestDto,
  ): Promise<WriteAudioMetadataResponseDto> {
    const snapshot = await this.options.ensureSnapshotLoaded()
    const audio = snapshot.audios?.find((item) => item.id === request.audio_id)
    if (!audio) {
      throw new Error(`写入音频元数据失败：audio 不存在 ${request.audio_id}`)
    }

    if (typeof request.album !== 'undefined') {
      audio.album = request.album.trim()
    }
    if (typeof request.author !== 'undefined') {
      audio.author = request.author.trim()
    }
    if (typeof request.track_title !== 'undefined') {
      audio.track_title = request.track_title.trim()
    }
    if (typeof request.series_id !== 'undefined') {
      audio.series_id = request.series_id.trim()
    }

    const updatedAtMs = Date.now()
    this.options.database.writeAudioMetadata(audio.id, {
      album: audio.album,
      author: audio.author,
      trackTitle: audio.track_title,
      seriesId: audio.series_id,
    })

    this.options.emitLibraryChanged({
      reason: 'write-audio-metadata',
      updated_at_ms: updatedAtMs,
    })

    return {
      audio,
      updated_at_ms: updatedAtMs,
    }
  }

  async saveVideoCover(
    request: SaveVideoCoverRequestDto,
  ): Promise<SaveVideoCoverResponseDto> {
    const snapshot = await this.options.ensureSnapshotLoaded()
    const runtimeDependencies = await this.options.ensureRuntimeDependencies()
    const video = snapshot.videos.find((item) => item.id === request.video_id)
    if (!video) {
      throw new Error(`保存封面失败：video 不存在 ${request.video_id}`)
    }

    const coverImagePath = await captureVideoCoverImage({
      videoPath: video.absolute_path,
      videoId: video.id,
      timeSec: request.time_sec,
      ffmpegBin: this.options.ffmpegBin,
      coverOutputRootDir: this.options.coverOutputRootDir,
      ffmpegAvailable: runtimeDependencies.ffmpeg,
    })
    const coverColor = request.fallback_color ?? video.cover_color ?? toDeterministicCoverColor(video.id)
    const updatedAtMs = Date.now()

    video.cover_color = coverColor
    video.cover_image_path = coverImagePath
    this.options.videoCoverOverridesByVideoId.set(video.id, {
      coverColor,
      coverImagePath,
      updatedAtMs,
    })
    this.options.database.writeVideoCover(video.id, coverColor, coverImagePath)

    this.options.emitLibraryChanged({
      reason: 'write-video-cover',
      updated_at_ms: Date.now(),
    })

    return saveVideoCoverResponseSchema.parse({
      video_id: video.id,
      cover_color: coverColor,
      cover_image_path: coverImagePath,
      updated_at_ms: updatedAtMs,
    })
  }

  async readPlaylist(): Promise<ReadPlaylistResponseDto> {
    await this.options.ensureSnapshotLoaded()
    const videoIds = this.options.database.readPlaylist()
    return readPlaylistResponseSchema.parse({
      video_ids: videoIds,
    })
  }

  async writePlaylist(request: WritePlaylistRequestDto): Promise<WritePlaylistResponseDto> {
    await this.options.ensureSnapshotLoaded()
    const nextVideoIds = this.options.database.writePlaylist(request.video_ids)

    this.options.emitLibraryChanged({
      reason: 'write-playlist',
      updated_at_ms: Date.now(),
    })

    return writePlaylistResponseSchema.parse({
      video_ids: nextVideoIds,
      updated_at_ms: Date.now(),
    })
  }

  async listVideoSubtitles(request: ListVideoSubtitlesRequestDto): Promise<ListVideoSubtitlesResponseDto> {
    this.options.markInteractiveRead()
    const [snapshot, runtimeDependencies] = await Promise.all([
      this.options.ensureSnapshotLoaded(),
      this.options.ensureRuntimeDependencies(),
    ])
    const video = snapshot.videos.find((item) => item.id === request.video_id)
    if (!video) {
      throw new Error(`读取字幕失败：video 不存在 ${request.video_id}`)
    }

    const videoDir = path.dirname(video.absolute_path)
    const videoStem = path.basename(video.absolute_path, path.extname(video.absolute_path)).toLowerCase()
    const entries = await fs.readdir(videoDir, { withFileTypes: true }).catch(() => [])

    const subtitles = entries
      .filter((entry) => entry.isFile())
      .map((entry) => {
        const ext = path.extname(entry.name).toLowerCase()
        if (!SUBTITLE_EXTENSIONS.has(ext)) {
          return null
        }
        const absolutePath = path.join(videoDir, entry.name)
        const subtitleStem = path.basename(entry.name, ext)
        const languageLabel = detectSubtitleLanguageLabel(entry.name, videoStem)
        const format = ext.slice(1) as 'vtt' | 'srt' | 'ass' | 'ssa'
        const locator: MediaLocatorDto = {
          kind: 'filesystem',
          absolute_path: absolutePath,
          extension: ext,
          media_type: 'subtitle',
          mime_type: detectMimeTypeByExtension(ext, 'subtitle'),
        }

        return {
          id: makeStableId('subtitle', absolutePath),
          label: languageLabel ?? entry.name,
          source: 'external' as const,
          format,
          locator,
          score: subtitleStem.toLowerCase() === videoStem || subtitleStem.toLowerCase().startsWith(`${videoStem}.`) ? 0 : 1,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((left, right) => (left.score - right.score) || left.label.localeCompare(right.label, 'zh-CN'))
      .map((item) => ({
        id: item.id,
        label: item.label,
        source: item.source,
        format: item.format,
        locator: item.locator,
      }))

    return listVideoSubtitlesResponseSchema.parse({
      subtitles,
      ffmpeg_available: runtimeDependencies.ffmpeg,
    })
  }

  async prepareSubtitleTrack(request: PrepareSubtitleTrackRequestDto): Promise<PrepareSubtitleTrackResponseDto> {
    this.options.markInteractiveRead()
    if (request.locator.kind !== 'filesystem' || request.locator.media_type !== 'subtitle') {
      throw new Error('字幕准备失败：仅支持文件系统字幕')
    }

    if (request.format === 'vtt') {
      return prepareSubtitleTrackResponseSchema.parse({
        locator: request.locator,
        converted: false,
      })
    }

    const runtimeDependencies = await this.options.ensureRuntimeDependencies()
    if (!runtimeDependencies.ffmpeg) {
      throw new Error('字幕准备失败：ffmpeg 不可用，无法转换为 vtt')
    }

    const outputPath = await this.convertSubtitleToVtt(request.locator.absolute_path, request.subtitle_id)
    return prepareSubtitleTrackResponseSchema.parse({
      locator: {
        kind: 'filesystem',
        absolute_path: outputPath,
        extension: '.vtt',
        media_type: 'subtitle',
        mime_type: 'text/vtt',
      },
      converted: true,
    })
  }

  async startManageSubtitleCleanup(
    request: StartManageSubtitleCleanupRequestDto,
  ): Promise<StartManageSubtitleCleanupResponseDto> {
    this.options.markInteractiveRead()
    const snapshot = await this.options.ensureSnapshotLoaded()
    const video = snapshot.videos.find((item) => item.id === request.video_id)
    if (!video) {
      throw new Error(`字幕清洗失败：video 不存在 ${request.video_id}`)
    }

    const now = Date.now()
    const taskId = `manage-subtitle-cleanup-${now}-${Math.round(Math.random() * 1_000_000)}`
    const subtitlePath = path.join(path.dirname(video.absolute_path), `${path.basename(video.absolute_path, path.extname(video.absolute_path))}.srt`)
    const task: ManageSubtitleCleanupTaskDto = {
      task_id: taskId,
      video_id: video.id,
      subtitle_path: subtitlePath,
      status: 'running',
      raw_stage: 'pending',
      cleanup_stage: 'pending',
      raw_subtitle_text: '',
      cleaned_subtitle_text: '',
      message: '字幕清洗任务进行中',
      error_detail: null,
      created_at_ms: now,
      updated_at_ms: now,
    }

    this.subtitleCleanupTaskById.set(taskId, task)
    void this.executeSubtitleRawTask(taskId, video.absolute_path)

    return {
      task,
    }
  }

  async readManageSubtitleCleanupTask(
    request: ReadManageSubtitleCleanupTaskRequestDto,
  ): Promise<ReadManageSubtitleCleanupTaskResponseDto> {
    const task = this.subtitleCleanupTaskById.get(request.task_id) ?? null
    return {
      task,
    }
  }

  async runManageSubtitleCleanup(
    request: RunManageSubtitleCleanupRequestDto,
  ): Promise<RunManageSubtitleCleanupResponseDto> {
    const task = this.subtitleCleanupTaskById.get(request.task_id)
    if (!task) {
      throw new Error(`字幕清洗失败：任务不存在 ${request.task_id}`)
    }
    if (task.raw_stage !== 'ready' || !task.raw_subtitle_text.trim()) {
      throw new Error('字幕清洗失败：请先获取原始字幕')
    }
    if (task.cleanup_stage === 'running') {
      return { task }
    }

    const nextTask = this.updateSubtitleCleanupTask(task.task_id, (previous) => ({
      ...previous,
      status: 'running',
      cleanup_stage: 'running',
      error_detail: null,
      message: '正在进行字幕清洗',
      updated_at_ms: Date.now(),
    }))

    void this.executeSubtitleCleanupStage(task.task_id, request.llm_endpoint, request.llm_model, request.llm_prompt)
    return { task: nextTask }
  }

  async saveManageSubtitleCleanup(
    request: SaveManageSubtitleCleanupRequestDto,
  ): Promise<SaveManageSubtitleCleanupResponseDto> {
    const task = this.subtitleCleanupTaskById.get(request.task_id)
    if (!task) {
      throw new Error(`字幕清洗保存失败：任务不存在 ${request.task_id}`)
    }
    const nextText = request.cleaned_subtitle_text
    await fs.writeFile(task.subtitle_path, nextText, 'utf8')

    const nextTask = this.updateSubtitleCleanupTask(task.task_id, (previous) => ({
      ...previous,
      cleaned_subtitle_text: nextText,
      status: previous.status === 'failed' ? 'failed' : 'review',
      message: '字幕清洗结果已保存',
      updated_at_ms: Date.now(),
    }))

    return {
      task: nextTask,
      saved_path: task.subtitle_path,
      updated_at_ms: Date.now(),
    }
  }

  private updateSubtitleCleanupTask(
    taskId: string,
    updater: (task: ManageSubtitleCleanupTaskDto) => ManageSubtitleCleanupTaskDto,
  ): ManageSubtitleCleanupTaskDto {
    const current = this.subtitleCleanupTaskById.get(taskId)
    if (!current) {
      throw new Error(`字幕清洗任务不存在 ${taskId}`)
    }
    const next = manageSubtitleCleanupTaskSchema.parse(updater(current))
    this.subtitleCleanupTaskById.set(taskId, next)
    return next
  }

  private async executeSubtitleRawTask(
    taskId: string,
    videoPath: string,
  ): Promise<void> {
    try {
      await this.resolveOrGenerateRawSubtitle(taskId, videoPath)

      this.updateSubtitleCleanupTask(taskId, (task) => ({
        ...task,
        status: 'review',
        cleanup_stage: task.cleanup_stage === 'ready' ? 'ready' : 'pending',
        message: '原始字幕已就绪，可开始清洗',
        updated_at_ms: Date.now(),
      }))
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      this.updateSubtitleCleanupTask(taskId, (task) => ({
        ...task,
        status: 'failed',
        raw_stage: task.raw_stage === 'ready' ? 'ready' : 'failed',
        message: '原始字幕获取失败',
        error_detail: reason,
        updated_at_ms: Date.now(),
      }))
    }
  }

  private async executeSubtitleCleanupStage(
    taskId: string,
    llmEndpoint: string,
    llmModel: string,
    llmPrompt?: string,
  ): Promise<void> {
    try {
      const task = this.subtitleCleanupTaskById.get(taskId)
      if (!task || task.raw_stage !== 'ready' || !task.raw_subtitle_text.trim()) {
        throw new Error('字幕清洗失败：原始字幕不可用')
      }

      await this.runCleanupLlmStreaming(taskId, llmEndpoint, llmModel, task.raw_subtitle_text, llmPrompt)

      this.updateSubtitleCleanupTask(taskId, (current) => ({
        ...current,
        status: 'review',
        cleanup_stage: 'ready',
        message: '字幕清洗完成，可编辑后保存',
        updated_at_ms: Date.now(),
      }))
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      this.updateSubtitleCleanupTask(taskId, (task) => ({
        ...task,
        status: 'failed',
        cleanup_stage: task.cleanup_stage === 'ready' ? 'ready' : 'failed',
        message: '字幕清洗失败',
        error_detail: reason,
        updated_at_ms: Date.now(),
      }))
    }
  }

  private async resolveOrGenerateRawSubtitle(taskId: string, videoPath: string): Promise<string> {
    const subtitlePath = path.join(path.dirname(videoPath), `${path.basename(videoPath, path.extname(videoPath))}.srt`)
    const existing = await fs.readFile(subtitlePath, 'utf8').catch(() => null)
    if (existing && existing.trim()) {
      this.updateSubtitleCleanupTask(taskId, (task) => ({
        ...task,
        subtitle_path: subtitlePath,
        raw_stage: 'ready',
        raw_subtitle_text: existing,
        message: '检测到现有字幕，已载入原稿',
        updated_at_ms: Date.now(),
      }))
      return existing
    }

    this.updateSubtitleCleanupTask(taskId, (task) => ({
      ...task,
      subtitle_path: subtitlePath,
      raw_stage: 'running',
      message: '正在进行字幕识别',
      updated_at_ms: Date.now(),
    }))

    const rawSrtText = await this.transcribeVideoToSrt(videoPath)
    await fs.writeFile(subtitlePath, rawSrtText, 'utf8')

    this.updateSubtitleCleanupTask(taskId, (task) => ({
      ...task,
      raw_stage: 'ready',
      raw_subtitle_text: rawSrtText,
      message: '原始字幕已生成并写入同名 .srt',
      updated_at_ms: Date.now(),
    }))

    return rawSrtText
  }

  private readSubtitleAsrSettings(): { modelDir: string; modelId: string; language: string } {
    const rawState = this.options.database.readAppState<unknown>(SETTINGS_STATE_KEY, null)
    const settings = (rawState && typeof rawState === 'object' ? rawState : null) as PersistedUiSettingsLike | null
    const modelDir = typeof settings?.subtitleModelDir === 'string' ? settings.subtitleModelDir.trim() : ''
    const modelId = typeof settings?.subtitleSelectedModelId === 'string' ? settings.subtitleSelectedModelId.trim() : ''
    const language = typeof settings?.subtitleLanguage === 'string' ? settings.subtitleLanguage.trim() : 'auto'
    if (!modelDir || !modelId) {
      throw new Error('字幕识别失败：请先在设置中配置离线字幕模型目录和模型ID')
    }
    return { modelDir, modelId, language: language || 'auto' }
  }

  private resolveAsrWorkerPath(): string {
    const mainEntry = process.argv[1] ? path.resolve(process.argv[1]) : ''
    const candidates: string[] = []
    if (mainEntry) {
      candidates.push(path.join(path.dirname(mainEntry), 'asrWorker.cjs'))
    }
    candidates.push(path.join(process.cwd(), 'dist-electron', 'asrWorker.cjs'))
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate
      }
    }
    throw new Error('subtitle_asr_worker_not_found')
  }

  private async transcribeVideoToSrt(videoPath: string): Promise<string> {
    const runtimeDependencies = await this.options.ensureRuntimeDependencies()
    if (!runtimeDependencies.ffmpeg) {
      throw new Error('字幕识别失败：ffmpeg 不可用')
    }

    const engineStatus = probeSubtitleEngineStatus()
    if (!engineStatus.installed || !engineStatus.loadable || !engineStatus.moduleRoot) {
      throw new Error(`字幕识别失败：引擎不可用 (${engineStatus.message ?? 'unknown'})`)
    }

    const { modelDir, modelId, language } = this.readSubtitleAsrSettings()
    const cacheDir = path.join(this.options.rootDir, '.mediaplayerx', 'subtitle-cleanup-cache')
    await fs.mkdir(cacheDir, { recursive: true })
    const cacheAudioPath = path.join(cacheDir, `${makeStableId('subtitle-cleanup-audio', videoPath)}.f32le`)

    const ffmpegResult = await runProcess(
      this.options.ffmpegBin,
      ['-y', '-i', videoPath, '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', cacheAudioPath],
      10 * 60_000,
    )
    if (ffmpegResult.code !== 0) {
      throw new Error(ffmpegResult.stderr.trim() || '字幕识别失败：提取音频失败')
    }

    const audioBuffer = await fs.readFile(cacheAudioPath)
    const workerClient = new SubtitleWorkerClient(new Worker(this.resolveAsrWorkerPath()))
    const cues: SubtitleWorkerCue[] = []

    try {
      await workerClient.request('init', {
        model_dir: modelDir,
        model_id: modelId,
        provider_preference: 'auto',
        language,
        fallback_to_cpu: true,
        engine_module_root: engineStatus.moduleRoot,
        available_providers: engineStatus.availableProviders,
      }, SUBTITLE_ASR_INIT_TIMEOUT_MS)

      const bytesPerSample = 4
      const sampleRate = 16_000
      const audioDurationSec = audioBuffer.byteLength / bytesPerSample / sampleRate
      const transcribeTimeoutMs = Math.max(
        SUBTITLE_ASR_TRANSCRIBE_TIMEOUT_MIN_MS,
        Math.min(
          SUBTITLE_ASR_TRANSCRIBE_TIMEOUT_CAP_MS,
          Math.ceil(audioDurationSec * SUBTITLE_ASR_TRANSCRIBE_TIMEOUT_PER_SEC_MS) +
            SUBTITLE_ASR_TRANSCRIBE_TIMEOUT_BASE_MS,
        ),
      )

      const transcribePayload = await workerClient.request(
        'transcribe-all',
        {
          chunk_base64: audioBuffer.toString('base64'),
          sample_rate_hz: sampleRate,
          channel_count: 1,
          duration_sec: audioDurationSec,
        },
        transcribeTimeoutMs,
      )

      const cueItems = ((transcribePayload as { cues?: unknown }).cues ?? []) as SubtitleWorkerCue[]
      for (const cue of cueItems) {
        if (cue && typeof cue.text === 'string') {
          cues.push(cue)
        }
      }

      if (cues.length === 0) {
        const fallbackText = typeof (transcribePayload as { text?: unknown }).text === 'string'
          ? (transcribePayload as { text: string }).text.trim()
          : ''
        if (fallbackText) {
          cues.push({
            start_sec: 0,
            end_sec: Math.max(0.8, audioDurationSec),
            text: fallbackText,
          })
        }
      }
    } finally {
      await workerClient.request('stop', { reason: 'subtitle-cleanup-finished' }).catch(() => undefined)
      await workerClient.terminate().catch(() => undefined)
      void fs.rm(cacheAudioPath, { force: true }).catch(() => undefined)
    }

    const mergedCues = cues.filter((cue) => cue.text.trim().length > 0)
    const srtText = cuesToSrt(mergedCues)
    if (!srtText.trim()) {
      throw new Error('字幕识别失败：未生成可用字幕内容')
    }
    return srtText
  }

  private async runCleanupLlmStreaming(
    taskId: string,
    llmEndpoint: string,
    llmModel: string,
    rawSubtitleText: string,
    llmPrompt?: string,
  ): Promise<void> {
    const endpoint = normalizeChatCompletionsUrl(llmEndpoint)
    const model = llmModel.trim()
    if (!model) {
      throw new Error('字幕清洗失败：LLM 模型不能为空')
    }
    const systemPrompt = llmPrompt?.trim() || DEFAULT_SUBTITLE_CLEANUP_PROMPT

    const abortController = new AbortController()
    const timeout = setTimeout(() => {
      abortController.abort()
    }, SUBTITLE_CLEANUP_LLM_TIMEOUT_MS)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.MEDIA_PLAYERX_LLM_API_KEY?.trim() || 'lm-studio'}`,
          'Content-Type': 'application/json',
        },
        signal: abortController.signal,
        body: JSON.stringify({
          model,
          stream: true,
          temperature: 0,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: rawSubtitleText,
            },
          ],
        }),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`字幕清洗失败：HTTP ${response.status} ${response.statusText} - ${errorText.slice(0, 300)}`)
      }

      const body = response.body
      if (!body) {
        const payload = await response.json().catch(() => null)
        const oneShotText = extractChatMessageText(payload)
        this.updateSubtitleCleanupTask(taskId, (task) => ({
          ...task,
          cleaned_subtitle_text: oneShotText.trim(),
          cleanup_stage: 'ready',
          updated_at_ms: Date.now(),
        }))
        return
      }

      const reader = body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffered = ''
      let streamedText = ''
      let streamTouched = false
      let receivedDone = false

      while (!receivedDone) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        buffered += decoder.decode(value, { stream: true })
        const lines = buffered.split(/\r?\n/)
        buffered = lines.pop() ?? ''

        for (const line of lines) {
          const payloadText = tryParseSseDataLine(line)
          if (!payloadText) {
            continue
          }
          if (payloadText === '[DONE]') {
            receivedDone = true
            break
          }
          let payload: unknown = null
          try {
            payload = JSON.parse(payloadText)
          } catch {
            continue
          }
          const delta = extractStreamDeltaText(payload)
          if (!delta) {
            continue
          }
          streamTouched = true
          streamedText += delta
          this.updateSubtitleCleanupTask(taskId, (task) => ({
            ...task,
            cleanup_stage: 'running',
            cleaned_subtitle_text: streamedText,
            updated_at_ms: Date.now(),
          }))
        }
      }

      if (receivedDone) {
        await reader.cancel().catch(() => undefined)
      }

      if (!streamTouched && buffered.trim()) {
        let payload: unknown = null
        try {
          payload = JSON.parse(buffered)
        } catch {
          payload = null
        }
        streamedText = extractChatMessageText(payload)
      }

      this.updateSubtitleCleanupTask(taskId, (task) => ({
        ...task,
        cleaned_subtitle_text: streamedText.trim(),
        cleanup_stage: 'ready',
        updated_at_ms: Date.now(),
      }))
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('字幕清洗失败：LLM 请求超时')
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }

  async readAppState(request: ReadAppStateRequestDto): Promise<ReadAppStateResponseDto> {
    this.options.markInteractiveRead()
    const state = this.options.database.readAppState<unknown>(request.state_key, null)
    return readAppStateResponseSchema.parse({
      state_json: state !== null ? JSON.stringify(state) : (request.fallback_json ?? 'null'),
    })
  }

  async writeAppState(request: WriteAppStateRequestDto): Promise<WriteAppStateResponseDto> {
    this.options.markInteractiveRead()
    this.options.database.writeAppState(request.state_key, JSON.parse(request.state_json))
    return writeAppStateResponseSchema.parse({
      updated_at_ms: Date.now(),
    })
  }
}
