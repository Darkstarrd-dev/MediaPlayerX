import {
  clearDatabaseResponseSchema,
  deleteImageItemsResponseSchema,
  deleteSidebarNodesResponseSchema,
  enqueueImportTaskResponseSchema,
  retryImportTaskResponseSchema,
  saveVideoCoverResponseSchema,
  setImageHiddenResponseSchema,
  writePackageExternalMetadataResponseSchema,
  writePackageGradeResponseSchema,
  writePackageMetadataResponseSchema,
  writePlaylistResponseSchema,
  writeVideoMetadataResponseSchema,
  type ClearDatabaseResponseDto,
  type DeleteImageItemsRequestDto,
  type DeleteImageItemsResponseDto,
  type DeleteSidebarNodesRequestDto,
  type DeleteSidebarNodesResponseDto,
  type EnqueueImportTaskRequestDto,
  type EnqueueImportTaskResponseDto,
  type ImportTaskDto,
  type RetryImportTaskRequestDto,
  type RetryImportTaskResponseDto,
  type SaveVideoCoverRequestDto,
  type SaveVideoCoverResponseDto,
  type SetImageHiddenRequestDto,
  type SetImageHiddenResponseDto,
  type WritePackageExternalMetadataRequestDto,
  type WritePackageExternalMetadataResponseDto,
  type WritePackageGradeRequestDto,
  type WritePackageGradeResponseDto,
  type WritePackageMetadataRequestDto,
  type WritePackageMetadataResponseDto,
  type WritePlaylistRequestDto,
  type WritePlaylistResponseDto,
  type WriteVideoMetadataRequestDto,
  type WriteVideoMetadataResponseDto,
} from '../../../../contracts/backend'
import {
  deriveWorkTitleFromFileName,
  normalizePathKeyForMatch,
  normalizeTags,
  normalizeTextValue,
  parseSidebarNodePath,
  pathHasPrefix,
  renumberSourceImages,
  syncPackageNameFromWorkTitle,
  toDeterministicCoverColor,
} from './utils'
import { MOCK_LIBRARY_SNAPSHOT_REF, type MockRepositoryState } from './types'

export class MockMediaWriteHandlers {
  private readonly state: MockRepositoryState

  constructor(state: MockRepositoryState) {
    this.state = state
  }

  writePackageGradeSync(
    request: WritePackageGradeRequestDto,
  ): WritePackageGradeResponseDto {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) throw new Error('Mock snapshot not initialized')

    const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
    const source = allSources.find((item) => item.id === request.package_id)
    if (!source) {
      throw new Error(`mock 仓库写入评分失败：source 不存在 ${request.package_id}`)
    }

    source.mock_grade = request.grade
    return writePackageGradeResponseSchema.parse({
      package_id: request.package_id,
      grade: request.grade,
      updated_at_ms: Date.now(),
    })
  }

  setImageHiddenSync(
    request: SetImageHiddenRequestDto,
  ): SetImageHiddenResponseDto {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) throw new Error('Mock snapshot not initialized')

    const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
    const targetImageIds = new Set(request.image_ids)
    const touchedImageIds = new Set<string>()

    for (const source of allSources) {
      for (const image of source.images) {
        if (!targetImageIds.has(image.id)) {
          continue
        }
        image.hidden = request.hidden
        touchedImageIds.add(image.id)
      }
    }

    return setImageHiddenResponseSchema.parse({
      updated_count: touchedImageIds.size,
      updated_at_ms: Date.now(),
    })
  }

  deleteImageItemsSync(
    request: DeleteImageItemsRequestDto,
  ): DeleteImageItemsResponseDto {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) throw new Error('Mock snapshot not initialized')

    const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
    const targetImageIds = new Set(request.image_ids)
    const deletedImageIds = new Set<string>()

    for (const source of allSources) {
      const nextImages = source.images.filter((image) => {
        if (!targetImageIds.has(image.id)) {
          return true
        }
        deletedImageIds.add(image.id)
        return false
      })

      if (nextImages.length !== source.images.length) {
        source.images = nextImages
        renumberSourceImages(source)
      }
    }

    const failed = request.image_ids
      .filter((imageId) => !deletedImageIds.has(imageId))
      .map((imageId) => ({
        image_id: imageId,
        reason: 'image not found',
      }))

    return deleteImageItemsResponseSchema.parse({
      deleted_count: deletedImageIds.size,
      failed,
      updated_at_ms: Date.now(),
    })
  }

  deleteSidebarNodesSync(
    request: DeleteSidebarNodesRequestDto,
  ): DeleteSidebarNodesResponseDto {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) throw new Error('Mock snapshot not initialized')

    const parsedTargets = request.node_ids.map((nodeId) => {
      const parsed = parseSidebarNodePath(nodeId)
      return {
        nodeId,
        parsed,
        matched: false,
      }
    })

    const failed: Array<{ node_id: string; reason: string }> = []
    const validTargets = parsedTargets.filter((target) => {
      if (target.parsed) {
        return true
      }
      failed.push({
        node_id: target.nodeId,
        reason: 'invalid node id',
      })
      return false
    })

    const matchesTarget = (pathKey: string, kind: 'package' | 'directory' | 'video') => {
      for (const target of validTargets) {
        const parsed = target.parsed
        if (!parsed) {
          continue
        }

        if (parsed.kind === 'folder') {
          if (pathHasPrefix(pathKey, parsed.pathKey)) {
            target.matched = true
            return true
          }
          continue
        }

        if (parsed.kind === 'package' && kind === 'package' && pathKey === parsed.pathKey) {
          target.matched = true
          return true
        }

        if (parsed.kind === 'video' && kind === 'video' && pathKey === parsed.pathKey) {
          target.matched = true
          return true
        }
      }

      return false
    }

    const prevPackageCount = snapshot.image_packages.length
    const prevDirectoryCount = snapshot.image_directories.length
    const prevVideoCount = snapshot.videos.length

    snapshot.image_packages = snapshot.image_packages.filter((source) => {
      const pathKey = normalizePathKeyForMatch(source.tree_path)
      return !matchesTarget(pathKey, 'package')
    })

    snapshot.image_directories = snapshot.image_directories.filter((source) => {
      const pathKey = normalizePathKeyForMatch(source.tree_path)
      return !matchesTarget(pathKey, 'directory')
    })

    snapshot.videos = snapshot.videos.filter((video) => {
      const pathKey = normalizePathKeyForMatch(video.tree_path)
      return !matchesTarget(pathKey, 'video')
    })

    const remainingVideoIds = new Set(snapshot.videos.map((video) => video.id))
    this.state.playlistIds = this.state.playlistIds.filter((videoId) => remainingVideoIds.has(videoId))

    for (const target of validTargets) {
      if (target.matched) {
        continue
      }
      failed.push({
        node_id: target.nodeId,
        reason: 'node not found',
      })
    }

    const deletedCount =
      (prevPackageCount - snapshot.image_packages.length) +
      (prevDirectoryCount - snapshot.image_directories.length) +
      (prevVideoCount - snapshot.videos.length)

    return deleteSidebarNodesResponseSchema.parse({
      deleted_count: Math.max(0, deletedCount),
      failed,
      updated_at_ms: Date.now(),
    })
  }

  writePackageMetadataSync(
    request: WritePackageMetadataRequestDto,
  ): WritePackageMetadataResponseDto {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) throw new Error('Mock snapshot not initialized')

    const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
    const source = allSources.find((item) => item.id === request.package_id)
    if (!source) {
      throw new Error(`mock 仓库写入元数据失败：source 不存在 ${request.package_id}`)
    }

    const workTitle = normalizeTextValue(request.work_title, source.work_title)
    source.work_title = workTitle
    source.series_id = (request.series_id ?? source.series_id ?? '').trim()
    source.circle = normalizeTextValue(request.circle, source.circle)
    source.author = normalizeTextValue(request.author, source.author)
    source.tags = normalizeTags(request.tags)

    if (request.sync_work_title_to_package_name) {
      const synced = syncPackageNameFromWorkTitle(source, workTitle)
      source.package_name = synced.packageName
      source.display_name = synced.displayName
    }

    return writePackageMetadataResponseSchema.parse({
      package: source,
      updated_at_ms: Date.now(),
    })
  }

  writePackageExternalMetadataSync(
    request: WritePackageExternalMetadataRequestDto,
  ): WritePackageExternalMetadataResponseDto {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) throw new Error('Mock snapshot not initialized')

    const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
    const source = allSources.find((item) => item.id === request.package_id)
    if (!source) {
      throw new Error(`mock 仓库写入外部元数据失败：source 不存在 ${request.package_id}`)
    }

    source.external_metadata = {
      source_site: request.source_site,
      source_url: request.source_url,
      source_remote_id: request.source_remote_id,
      source_token: request.source_token?.trim() ?? '',
      title: request.title?.trim() ?? '',
      title_jpn: request.title_jpn?.trim() ?? '',
      group_name: request.group_name?.trim() ?? '',
      group_name_jpn: request.group_name_jpn?.trim() ?? '',
      artist: request.artist?.trim() ?? '',
      artist_jpn: request.artist_jpn?.trim() ?? '',
      posted: request.posted?.trim() ?? '',
      rating: request.rating ?? null,
      favorited: request.favorited ?? null,
      tags: request.tags,
      raw_json: request.raw_json,
    }

    return writePackageExternalMetadataResponseSchema.parse({
      package: source,
      updated_at_ms: Date.now(),
    })
  }

  writeVideoMetadataSync(
    request: WriteVideoMetadataRequestDto,
  ): WriteVideoMetadataResponseDto {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) throw new Error('Mock snapshot not initialized')

    const video = snapshot.videos.find((item) => item.id === request.video_id)
    if (!video) {
      throw new Error(`mock 仓库写入视频元数据失败：video 不存在 ${request.video_id}`)
    }

    const nextWorkTitle = request.sync_file_name_to_work_title
      ? deriveWorkTitleFromFileName(video.file_name)
      : normalizeTextValue(request.work_title, video.work_title)

    video.work_title = nextWorkTitle
    video.series_id = (request.series_id ?? video.series_id ?? '').trim()
    video.circle = normalizeTextValue(request.circle, video.circle)
    video.author = normalizeTextValue(request.author, video.author)
    video.tags = normalizeTags(request.tags)
    if (typeof request.grade !== 'undefined') {
      video.grade = request.grade
    }

    return writeVideoMetadataResponseSchema.parse({
      video,
      updated_at_ms: Date.now(),
    })
  }

  saveVideoCoverSync(
    request: SaveVideoCoverRequestDto,
  ): SaveVideoCoverResponseDto {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) throw new Error('Mock snapshot not initialized')

    const video = snapshot.videos.find((item) => item.id === request.video_id)
    if (!video) {
      throw new Error(`mock 仓库保存封面失败：video 不存在 ${request.video_id}`)
    }

    const coverColor = request.fallback_color ?? video.cover_color ?? toDeterministicCoverColor(request.video_id)
    video.cover_color = coverColor

    return saveVideoCoverResponseSchema.parse({
      video_id: request.video_id,
      cover_color: coverColor,
      cover_image_path: null,
      updated_at_ms: Date.now(),
    })
  }

  writePlaylistSync(request: WritePlaylistRequestDto): WritePlaylistResponseDto {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) throw new Error('Mock snapshot not initialized')

    const validVideoIds = new Set(snapshot.videos.map((video) => video.id))
    this.state.playlistIds = Array.from(new Set(request.video_ids)).filter((id) => validVideoIds.has(id))
    return writePlaylistResponseSchema.parse({
      video_ids: this.state.playlistIds,
      updated_at_ms: Date.now(),
    })
  }

  enqueueImportTaskSync(request: EnqueueImportTaskRequestDto): EnqueueImportTaskResponseDto {
    const now = Date.now()
    const task: ImportTaskDto = {
      task_id: `mock-import-${now}-${Math.round(Math.random() * 10_000)}`,
      task_type: 'import',
      source: request.source,
      paths: request.paths,
      status: 'completed',
      progress: 1,
      processed_count: request.paths.length,
      total_count: request.paths.length,
      message: 'mock import completed',
      error_detail: null,
      created_at_ms: now,
      updated_at_ms: now,
    }

    this.state.importTasks = [task, ...this.state.importTasks]
    return enqueueImportTaskResponseSchema.parse({ task })
  }

  retryImportTaskSync(request: RetryImportTaskRequestDto): RetryImportTaskResponseDto {
    const found = this.state.importTasks.find((task) => task.task_id === request.task_id)
    if (!found) {
      throw new Error(`mock 导入重试失败：task 不存在 ${request.task_id}`)
    }

    const updated: ImportTaskDto = {
      ...found,
      status: 'completed',
      progress: 1,
      processed_count: Math.max(found.processed_count, found.total_count),
      message: 'mock import retried',
      error_detail: null,
      updated_at_ms: Date.now(),
    }

    this.state.importTasks = this.state.importTasks.map((task) => (task.task_id === request.task_id ? updated : task))
    return retryImportTaskResponseSchema.parse({ task: updated })
  }

  clearDatabaseSync(): ClearDatabaseResponseDto {
    this.state.playlistIds = []
    this.state.importTasks = []
    this.state.manageAdReviewTasks.clear()

    return clearDatabaseResponseSchema.parse({
      cleared: true,
      cleared_at_ms: Date.now(),
    })
  }
}
