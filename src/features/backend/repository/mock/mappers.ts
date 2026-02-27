import {
  type AudioItemDto,
  type ImageItemDto,
  type ImagePackageDto,
  type MediaLocatorDto,
  type SidebarNodeDto,
  type VideoItemDto,
} from '../../../../contracts/backend'
import { type AudioItem, type ImagePackage, type MediaLocator, type SidebarNode, type VideoItem } from '../../../../types'
import { deriveWorkTitleFromFileName } from './utils'

export function toMediaLocatorDto(locator: MediaLocator): MediaLocatorDto {
  if (locator.kind === 'filesystem') {
    return {
      kind: 'filesystem',
      absolute_path: locator.absolutePath,
      extension: locator.extension,
      media_type: locator.mediaType,
      mime_type: locator.mimeType,
    }
  }

  return {
    kind: 'archive-entry',
    archive_path: locator.archivePath,
    archive_format: locator.archiveFormat,
    entry_name: locator.entryName,
    extension: locator.extension,
    media_type: locator.mediaType,
    mime_type: locator.mimeType,
  }
}

export function toMediaLocatorViewModel(locator: MediaLocatorDto): MediaLocator {
  if (locator.kind === 'filesystem') {
    return {
      kind: 'filesystem',
      absolutePath: locator.absolute_path,
      extension: locator.extension,
      mediaType: locator.media_type,
      mimeType: locator.mime_type,
    }
  }

  return {
    kind: 'archive-entry',
    archivePath: locator.archive_path,
    archiveFormat: locator.archive_format,
    entryName: locator.entry_name,
    extension: locator.extension,
    mediaType: locator.media_type,
    mimeType: locator.mime_type,
  }
}

export function toImageItemDto(item: ImagePackage['images'][number]): ImageItemDto {
  return {
    id: item.id,
    ordinal: item.ordinal,
    width: item.width,
    height: item.height,
    size_kb: item.sizeKb,
    cluster: item.cluster,
    color: item.color,
    media_locator: toMediaLocatorDto(item.mediaLocator),
    hidden: item.hidden ?? false,
  }
}

export function toImagePackageDto(source: ImagePackage): ImagePackageDto {
  return {
    id: source.id,
    package_name: source.packageName,
    display_name: source.displayName,
    absolute_path: source.absolutePath,
    tree_path: [...source.treePath],
    work_title: source.workTitle,
    series_id: source.seriesId ?? '',
    circle: source.circle,
    author: source.author,
    tags: [...source.tags],
    mock_grade: source.mockGrade ?? null,
    images: source.images.map(toImageItemDto),
  }
}

export function toVideoItemDto(video: VideoItem): VideoItemDto {
  const fallbackWorkTitle = deriveWorkTitleFromFileName(video.fileName)
  return {
    id: video.id,
    file_name: video.fileName,
    absolute_path: video.absolutePath,
    tree_path: [...video.treePath],
    duration_sec: video.durationSec,
    width: video.width,
    height: video.height,
    size_mb: video.sizeMb,
    cover_color: video.coverColor,
    cover_image_path: video.coverImagePath ?? null,
    work_title: video.workTitle ?? fallbackWorkTitle,
    work_title_jpn: video.workTitleJpn ?? '',
    series_id: video.seriesId ?? '',
    circle: video.circle ?? '未知',
    circle_jpn: video.circleJpn ?? '',
    author: video.author ?? '未知',
    author_jpn: video.authorJpn ?? '',
    tags: [...(video.tags ?? [])],
    grade: video.grade ?? null,
    media_locator: toMediaLocatorDto(video.mediaLocator),
  }
}

export function toAudioItemDto(audio: AudioItem): AudioItemDto {
  const fallbackTrackTitle = deriveWorkTitleFromFileName(audio.fileName)
  return {
    id: audio.id,
    file_name: audio.fileName,
    absolute_path: audio.absolutePath,
    tree_path: [...audio.treePath],
    duration_sec: Math.max(0, Math.round(audio.durationSec)),
    size_mb: Math.max(0, Math.round(audio.sizeMb)),
    album: audio.album ?? '',
    author: audio.author ?? '',
    track_title: audio.trackTitle?.trim().length ? audio.trackTitle : fallbackTrackTitle,
    series_id: audio.seriesId ?? '',
    cue_source_path: audio.cueSourcePath,
    cue_track_no: audio.cueTrackNo,
    cue_start_sec: audio.cueStartSec,
    cue_end_sec: audio.cueEndSec,
    media_locator: toMediaLocatorDto(audio.mediaLocator),
  }
}

export function toSidebarNodeDto(node: SidebarNode): SidebarNodeDto {
  return {
    id: node.id,
    label: node.label,
    kind: node.kind,
    children: node.children.map(toSidebarNodeDto),
    package_id: node.packageId,
    video_id: node.videoId,
    audio_id: node.audioId,
    image_source_id: node.imageSourceId,
    image_node_type: node.imageNodeType,
    direct_image_count: node.directImageCount,
    descendant_package_count: node.descendantPackageCount,
    descendant_image_count: node.descendantImageCount,
    descendant_node_count: node.descendantNodeCount,
    path_key: node.pathKey,
  }
}

export function toImagePackageViewModel(dto: ImagePackageDto): ImagePackage {
  return {
    id: dto.id,
    packageName: dto.package_name,
    displayName: dto.display_name,
    absolutePath: dto.absolute_path,
    treePath: [...dto.tree_path],
    workTitle: dto.work_title,
    seriesId: dto.series_id ?? '',
    circle: dto.circle,
    author: dto.author,
    tags: [...dto.tags],
    mockGrade: dto.mock_grade ?? undefined,
    images: dto.images.map((item) => ({
      id: item.id,
      ordinal: item.ordinal,
      width: item.width,
      height: item.height,
      sizeKb: item.size_kb,
      cluster: item.cluster,
      color: item.color,
      mediaLocator: toMediaLocatorViewModel(item.media_locator),
      hidden: item.hidden ?? false,
    })),
  }
}

export function toAudioItemViewModel(dto: AudioItemDto): AudioItem {
  return {
    id: dto.id,
    fileName: dto.file_name,
    absolutePath: dto.absolute_path,
    treePath: [...dto.tree_path],
    durationSec: dto.duration_sec,
    sizeMb: dto.size_mb,
    album: dto.album ?? '',
    author: dto.author ?? '',
    trackTitle: dto.track_title ?? '',
    seriesId: dto.series_id ?? '',
    cueSourcePath: dto.cue_source_path,
    cueTrackNo: dto.cue_track_no,
    cueStartSec: dto.cue_start_sec,
    cueEndSec: dto.cue_end_sec,
    mediaLocator: toMediaLocatorViewModel(dto.media_locator),
  }
}
