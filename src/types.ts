export const MEDIA_TYPES = ['image', 'video'] as const

export type BrowserMode = (typeof MEDIA_TYPES)[number]

export type MediaType = BrowserMode

export type SearchField = 'all' | 'name' | 'workTitle' | 'circle' | 'author' | 'tags'

export interface FileSystemMediaLocator {
  kind: 'filesystem'
  absolutePath: string
  extension: string
  mediaType: MediaType
  mimeType: string
}

export interface ArchiveEntryMediaLocator {
  kind: 'archive-entry'
  archivePath: string
  archiveFormat: 'zip' | 'rar' | '7z'
  entryName: string
  extension: string
  mediaType: MediaType
  mimeType: string
}

export type MediaLocator = FileSystemMediaLocator | ArchiveEntryMediaLocator

export interface ImageItem {
  id: string
  ordinal: number
  width: number
  height: number
  sizeKb: number
  cluster: number
  color: string
  featureVector: number[]
  mediaLocator: MediaLocator
  hidden?: boolean
}

export interface ImagePackage {
  id: string
  packageName: string
  displayName: string
  absolutePath: string
  treePath: string[]
  workTitle: string
  circle: string
  author: string
  tags: string[]
  mockGrade?: number
  images: ImageItem[]
}

export interface VideoItem {
  id: string
  fileName: string
  absolutePath: string
  treePath: string[]
  durationSec: number
  width: number
  height: number
  sizeMb: number
  coverColor: string
  coverImagePath?: string | null
  workTitle: string
  circle: string
  author: string
  tags: string[]
  grade: number | null
  mediaLocator: MediaLocator
}

export type SidebarNodeKind = 'folder' | 'package' | 'video'

export interface SidebarNode {
  id: string
  label: string
  kind: SidebarNodeKind
  children: SidebarNode[]
  packageId?: string
  videoId?: string
  imageSourceId?: string
  directImageCount?: number
  pathKey: string
}

export interface FocusedImageRef {
  packageId: string
  imageIndex: number
}

export interface VectorCandidate {
  score: number
  packageId: string
  imageIndex: number
}
