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
  workTitleJpn: string
  seriesId: string
  circle: string
  circleJpn: string
  author: string
  authorJpn: string
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
  const seriesId = (request.series_id ?? source.series_id ?? '').trim()
  const circle = normalizeMetadataText(request.circle, source.circle)
  const author = normalizeMetadataText(request.author, source.author)
  const tags = normalizeMetadataTags(request.tags)

  source.work_title = workTitle
  source.series_id = seriesId
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
    seriesId: source.series_id,
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
  const workTitleJpn = (request.work_title_jpn ?? video.work_title_jpn ?? '').trim()
  const seriesId = (request.series_id ?? video.series_id ?? '').trim()
  const circle = normalizeMetadataText(request.circle, video.circle)
  const circleJpn = (request.circle_jpn ?? video.circle_jpn ?? '').trim()
  const author = normalizeMetadataText(request.author, video.author)
  const authorJpn = (request.author_jpn ?? video.author_jpn ?? '').trim()
  const tags = normalizeMetadataTags(request.tags)
  const grade = typeof request.grade === 'undefined' ? video.grade ?? null : request.grade

  video.work_title = workTitle
  video.work_title_jpn = workTitleJpn
  video.series_id = seriesId
  video.circle = circle
  video.circle_jpn = circleJpn
  video.author = author
  video.author_jpn = authorJpn
  video.tags = tags
  video.grade = grade

  const updatedAtMs = Date.now()
  const persistedRecord: PersistedVideoMetadataRecord = {
    workTitle,
    workTitleJpn,
    seriesId,
    circle,
    circleJpn,
    author,
    authorJpn,
    tags,
    grade,
    updatedAtMs,
  }

  database.writeVideoMetadata(video.id, {
    workTitle,
    workTitleJpn,
    seriesId,
    circle,
    circleJpn,
    author,
    authorJpn,
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
