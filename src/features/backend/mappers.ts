import type {
  FocusedImageRefDto,
  ImageItemDto,
  ImagePackageDto,
  LibrarySnapshotDto,
  MediaLocatorDto,
  ReadImageMetadataResponseDto,
  ReadImagePageResponseDto,
  ReadImageSidebarTreeResponseDto,
  SidebarNodeDto,
  VideoItemDto,
} from '../../contracts/backend'
import type {
  FocusedImageRef,
  ImageItem,
  ImagePackage,
  MediaLocator,
  SidebarNode,
  VideoItem,
} from '../../types'

export interface LibrarySnapshotViewModel {
  imagePackages: ImagePackage[]
  imageDirectories: ImagePackage[]
  videos: VideoItem[]
}

export interface ImageSidebarTreeViewModel {
  imagePackages: ImagePackage[]
  imageDirectories: ImagePackage[]
  tree: SidebarNode[]
}

export interface ImagePageViewModel {
  sourceId: string | null
  totalItems: number
  pageIndex: number
  pageSize: number
  refs: FocusedImageRef[]
}

export interface ImageMetadataViewModel {
  package: ImagePackage
  image: ImageItem
  grade: number | null
}

export function mapMediaLocatorDto(locator: MediaLocatorDto): MediaLocator {
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

export function mapImageItemDto(item: ImageItemDto): ImageItem {
  return {
    id: item.id,
    ordinal: item.ordinal,
    width: item.width,
    height: item.height,
    sizeKb: item.size_kb,
    cluster: item.cluster,
    color: item.color,
    mediaLocator: mapMediaLocatorDto(item.media_locator),
    hidden: item.hidden ?? false,
  }
}

export function mapImagePackageDto(source: ImagePackageDto): ImagePackage {
  return {
    id: source.id,
    packageName: source.package_name,
    displayName: source.display_name,
    absolutePath: source.absolute_path,
    treePath: [...source.tree_path],
    workTitle: source.work_title,
    circle: source.circle,
    author: source.author,
    tags: [...source.tags],
    mockGrade: source.mock_grade ?? undefined,
    externalMetadata: source.external_metadata
      ? {
          sourceSite: source.external_metadata.source_site,
          sourceUrl: source.external_metadata.source_url,
          sourceRemoteId: source.external_metadata.source_remote_id,
          sourceToken: source.external_metadata.source_token,
          title: source.external_metadata.title,
          titleJpn: source.external_metadata.title_jpn,
          groupName: source.external_metadata.group_name,
          groupNameJpn: source.external_metadata.group_name_jpn,
          artist: source.external_metadata.artist,
          artistJpn: source.external_metadata.artist_jpn,
          posted: source.external_metadata.posted,
          rating: source.external_metadata.rating ?? null,
          favorited: source.external_metadata.favorited ?? null,
          tags: { ...source.external_metadata.tags },
          rawJson: source.external_metadata.raw_json,
        }
      : null,
    sourceCover: source.source_cover
      ? {
          coverColor: source.source_cover.cover_color,
          coverImagePath: source.source_cover.cover_image_path ?? null,
          updatedAtMs: source.source_cover.updated_at_ms,
        }
      : null,
    images: source.images.map(mapImageItemDto),
  }
}

export function mapVideoItemDto(video: VideoItemDto): VideoItem {
  const fallbackWorkTitle = video.file_name.replace(/\.[^./\\]+$/, '')
  return {
    id: video.id,
    fileName: video.file_name,
    absolutePath: video.absolute_path,
    treePath: [...video.tree_path],
    durationSec: video.duration_sec,
    width: video.width,
    height: video.height,
    sizeMb: video.size_mb,
    coverColor: video.cover_color,
    coverImagePath: video.cover_image_path ?? null,
    workTitle: video.work_title?.trim().length ? video.work_title : fallbackWorkTitle,
    circle: video.circle?.trim().length ? video.circle : '未知',
    author: video.author?.trim().length ? video.author : '未知',
    tags: [...(video.tags ?? [])],
    grade: video.grade ?? null,
    mediaLocator: mapMediaLocatorDto(video.media_locator),
  }
}

export function mapSidebarNodeDto(node: SidebarNodeDto): SidebarNode {
  return {
    id: node.id,
    label: node.label,
    kind: node.kind,
    children: (node.children as SidebarNodeDto[]).map(mapSidebarNodeDto),
    packageId: node.package_id,
    videoId: node.video_id,
    imageSourceId: node.image_source_id,
    imageNodeType: node.image_node_type,
    directImageCount: node.direct_image_count,
    descendantPackageCount: node.descendant_package_count,
    descendantImageCount: node.descendant_image_count,
    descendantNodeCount: node.descendant_node_count,
    pathKey: node.path_key,
  }
}

function resolvePreferredSidebarTitle(source: ImagePackage): string | null {
  const jpnTitle = source.externalMetadata?.titleJpn?.trim() ?? ''
  if (jpnTitle.length > 0) {
    return jpnTitle
  }

  const enTitle = source.externalMetadata?.title?.trim() ?? ''
  if (enTitle.length > 0) {
    return enTitle
  }

  return null
}

function mapSidebarNodeDtoWithSourceLabel(node: SidebarNodeDto, sourceById: Map<string, ImagePackage>): SidebarNode {
  const mappedChildren = (node.children as SidebarNodeDto[]).map((child) => mapSidebarNodeDtoWithSourceLabel(child, sourceById))
  let label = node.label

  const sourceId = node.package_id ?? node.image_source_id
  if (sourceId) {
    const source = sourceById.get(sourceId)
    if (source) {
      const preferredTitle = resolvePreferredSidebarTitle(source)
      if (preferredTitle) {
        label = preferredTitle
      }
    }
  }

  return {
    id: node.id,
    label,
    kind: node.kind,
    children: mappedChildren,
    packageId: node.package_id,
    videoId: node.video_id,
    imageSourceId: node.image_source_id,
    imageNodeType: node.image_node_type,
    directImageCount: node.direct_image_count,
    descendantPackageCount: node.descendant_package_count,
    descendantImageCount: node.descendant_image_count,
    descendantNodeCount: node.descendant_node_count,
    pathKey: node.path_key,
  }
}

export function mapFocusedImageRefDto(ref: FocusedImageRefDto): FocusedImageRef {
  return {
    packageId: ref.package_id,
    imageIndex: ref.image_index,
  }
}

export function mapLibrarySnapshotDto(snapshot: LibrarySnapshotDto): LibrarySnapshotViewModel {
  return {
    imagePackages: snapshot.image_packages.map(mapImagePackageDto),
    imageDirectories: snapshot.image_directories.map(mapImagePackageDto),
    videos: snapshot.videos.map(mapVideoItemDto),
  }
}

export function mapImageSidebarTreeDto(response: ReadImageSidebarTreeResponseDto): ImageSidebarTreeViewModel {
  const imagePackages = response.image_packages.map(mapImagePackageDto)
  const imageDirectories = response.image_directories.map(mapImagePackageDto)
  const sourceById = new Map<string, ImagePackage>([
    ...imagePackages.map((source) => [source.id, source] as const),
    ...imageDirectories.map((source) => [source.id, source] as const),
  ])

  return {
    imagePackages,
    imageDirectories,
    tree: response.tree.map((node) => mapSidebarNodeDtoWithSourceLabel(node, sourceById)),
  }
}

export function mapImagePageDto(response: ReadImagePageResponseDto): ImagePageViewModel {
  return {
    sourceId: response.source_id,
    totalItems: response.total_items,
    pageIndex: response.page_index,
    pageSize: response.page_size,
    refs: response.refs.map(mapFocusedImageRefDto),
  }
}

export function mapImageMetadataDto(response: ReadImageMetadataResponseDto): ImageMetadataViewModel | null {
  if (!response) {
    return null
  }

  return {
    package: mapImagePackageDto(response.package),
    image: mapImageItemDto(response.image),
    grade: response.grade,
  }
}
