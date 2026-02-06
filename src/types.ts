export type BrowserMode = 'image' | 'video'

export type SearchField = 'all' | 'name' | 'workTitle' | 'circle' | 'author' | 'tags'

export interface ImageItem {
  id: string
  ordinal: number
  width: number
  height: number
  sizeKb: number
  cluster: number
  color: string
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
