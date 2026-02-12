import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import axios from 'axios'

import {
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
  type ReadAppStateRequestDto,
  type ReadAppStateResponseDto,
  type ReadImageMetadataRequestDto,
  type ReadImageMetadataResponseDto,
  type ReadImagePageRequestDto,
  type ReadImagePageResponseDto,
  type ReadImageSidebarTreeRequestDto,
  type ReadImageSidebarTreeResponseDto,
  type ReadPlaylistResponseDto,
  type SaveVideoCoverRequestDto,
  type SaveVideoCoverResponseDto,
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
} from '../../../src/contracts/backend'
import {
  applyPackageMetadataWrite,
  applyVideoMetadataWrite,
  type PersistedVideoMetadataRecord,
} from '../../fileSystemMetadataWriters'
import { filterSources as filterLibrarySources } from '../../fileSystemSourceFilter'
import { probeImageDimensionsFromFile } from '../../fileSystemRuntimeHelpers'
import { buildImageSidebarTree } from '../../fileSystemSidebarTree'
import { captureVideoCoverImage } from '../../fileSystemVideoCoverCapture'
import { toDeterministicCoverColor, toSafeSizeKb } from '../../fileSystemServiceHelpers'
import { MediaLibraryDatabase } from '../../mediaLibraryDatabase'
import type { PersistedVideoCoverRecord } from './librarySnapshotService'
import type { RuntimeDependencySnapshot } from './runtimeDependencyService'

const SOURCE_COVER_EXT_ALLOWLIST = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'])

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
  constructor(private readonly options: LibraryReadWriteServiceOptions) {}

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
