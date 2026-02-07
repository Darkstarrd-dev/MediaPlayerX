import type {
  FocusedImageRefDto,
  ImageItemDto,
  ImagePackageDto,
  LibrarySnapshotDto,
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

export function mapImageItemDto(item: ImageItemDto): ImageItem {
  return {
    id: item.id,
    ordinal: item.ordinal,
    width: item.width,
    height: item.height,
    sizeKb: item.size_kb,
    cluster: item.cluster,
    color: item.color,
    featureVector: [...item.feature_vector],
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
    images: source.images.map(mapImageItemDto),
  }
}

export function mapVideoItemDto(video: VideoItemDto): VideoItem {
  return {
    id: video.id,
    fileName: video.file_name,
    absolutePath: video.absolute_path,
    treePath: [...video.tree_path],
    durationSec: video.duration_sec,
    width: video.width,
    height: video.height,
    sizeMb: video.size_mb,
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
    directImageCount: node.direct_image_count,
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
  return {
    imagePackages: response.image_packages.map(mapImagePackageDto),
    imageDirectories: response.image_directories.map(mapImagePackageDto),
    tree: response.tree.map(mapSidebarNodeDto),
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
