import {
  type ImageItemDto,
  type ImagePackageDto,
  type MediaLocatorDto,
  type SidebarNodeDto,
  type VideoItemDto,
} from '../../../../contracts/backend'
import { type ImagePackage, type MediaLocator, type SidebarNode } from '../../../../types'
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
    circle: source.circle,
    author: source.author,
    tags: [...source.tags],
    mock_grade: source.mockGrade ?? null,
    images: source.images.map(toImageItemDto),
  }
}

export function toVideoItemDto(video: any): VideoItemDto {
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
    circle: video.circle ?? '未知',
    author: video.author ?? '未知',
    tags: [...(video.tags ?? [])],
    grade: video.grade ?? null,
    media_locator: toMediaLocatorDto(video.mediaLocator),
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
