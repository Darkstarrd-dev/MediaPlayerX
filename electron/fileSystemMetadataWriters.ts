import {
  writePackageMetadataResponseSchema,
  writeVideoMetadataResponseSchema,
  type LibrarySnapshotDto,
  type WritePackageMetadataRequestDto,
  type WritePackageMetadataResponseDto,
  type WriteVideoMetadataRequestDto,
  type WriteVideoMetadataResponseDto,
} from '../src/contracts/backend'
import {
  deriveVideoWorkTitleFromFileName,
  normalizeMetadataTags,
  normalizeMetadataText,
  syncPackageNameFromWorkTitle,
} from './fileSystemServiceHelpers'
import type { MediaLibraryDatabase } from './mediaLibraryDatabase'

export interface PersistedVideoMetadataRecord {
  workTitle: string
  circle: string
  author: string
  tags: string[]
  grade: number | null
  updatedAtMs: number
}

interface WritePackageMetadataContext {
  snapshot: LibrarySnapshotDto
  database: MediaLibraryDatabase
  request: WritePackageMetadataRequestDto
}

interface WriteVideoMetadataContext {
  snapshot: LibrarySnapshotDto
  database: MediaLibraryDatabase
  request: WriteVideoMetadataRequestDto
}

export function applyPackageMetadataWrite({
  snapshot,
  database,
  request,
}: WritePackageMetadataContext): WritePackageMetadataResponseDto {
  const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
  const source = allSources.find((item) => item.id === request.package_id)
  if (!source) {
    throw new Error(`写入元数据失败：source 不存在 ${request.package_id}`)
  }

  const workTitle = normalizeMetadataText(request.work_title, source.work_title)
  const circle = normalizeMetadataText(request.circle, source.circle)
  const author = normalizeMetadataText(request.author, source.author)
  const tags = normalizeMetadataTags(request.tags)

  source.work_title = workTitle
  source.circle = circle
  source.author = author
  source.tags = tags

  if (request.sync_work_title_to_package_name) {
    const synced = syncPackageNameFromWorkTitle(source, workTitle)
    source.package_name = synced.packageName
    source.display_name = synced.displayName
  }

  database.writeSourceMetadata(source.id, {
    packageName: source.package_name,
    displayName: source.display_name,
    workTitle: source.work_title,
    circle: source.circle,
    author: source.author,
    tags: source.tags,
  })

  return writePackageMetadataResponseSchema.parse({
    package: source,
    updated_at_ms: Date.now(),
  })
}

export function applyVideoMetadataWrite({
  snapshot,
  database,
  request,
}: WriteVideoMetadataContext): { response: WriteVideoMetadataResponseDto; persistedRecord: PersistedVideoMetadataRecord } {
  const video = snapshot.videos.find((item) => item.id === request.video_id)
  if (!video) {
    throw new Error(`写入视频元数据失败：video 不存在 ${request.video_id}`)
  }

  const defaultWorkTitle = deriveVideoWorkTitleFromFileName(video.file_name)
  const workTitle = request.sync_file_name_to_work_title
    ? defaultWorkTitle
    : normalizeMetadataText(request.work_title, video.work_title)
  const circle = normalizeMetadataText(request.circle, video.circle)
  const author = normalizeMetadataText(request.author, video.author)
  const tags = normalizeMetadataTags(request.tags)
  const grade = typeof request.grade === 'undefined' ? video.grade ?? null : request.grade

  video.work_title = workTitle
  video.circle = circle
  video.author = author
  video.tags = tags
  video.grade = grade

  const updatedAtMs = Date.now()
  const persistedRecord: PersistedVideoMetadataRecord = {
    workTitle,
    circle,
    author,
    tags,
    grade,
    updatedAtMs,
  }

  database.writeVideoMetadata(video.id, {
    workTitle,
    circle,
    author,
    tags,
    grade,
  })

  const response = writeVideoMetadataResponseSchema.parse({
    video,
    updated_at_ms: updatedAtMs,
  })

  return {
    response,
    persistedRecord,
  }
}
