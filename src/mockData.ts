import type {
  FocusedImageRef,
  ImageItem,
  ImagePackage,
  SidebarNode,
  SidebarNodeKind,
  VectorCandidate,
  VideoItem,
} from './types'

const COLORS = ['#dd6b66', '#d58b45', '#6da249', '#4aa6a1', '#4f86cf', '#8868d6']

function makeImages(packageId: string, count: number, clusterOffset: number): ImageItem[] {
  const items: ImageItem[] = []
  for (let i = 0; i < count; i += 1) {
    const ordinal = i + 1
    const width = 900 + ((i * 59) % 620)
    const height = 1100 + ((i * 41) % 550)
    items.push({
      id: `${packageId}-img-${ordinal}`,
      ordinal,
      width,
      height,
      sizeKb: 180 + ((i * 37) % 780),
      cluster: (clusterOffset + i) % COLORS.length,
      color: COLORS[(clusterOffset + i) % COLORS.length],
    })
  }
  return items
}

export const IMAGE_PACKAGES: ImagePackage[] = [
  {
    id: 'pack-001',
    packageName: 'archive_001.zip',
    displayName: '幻旅系列 001',
    absolutePath: 'X:/收藏/画廊A/archive_001.zip',
    treePath: ['X盘', '收藏', '画廊A', 'archive_001.zip'],
    workTitle: '幻旅系列',
    circle: 'OrbitWorks',
    author: 'Nori',
    tags: ['sci-fi', 'city', 'night'],
    images: makeImages('pack-001', 36, 0),
  },
  {
    id: 'pack-002',
    packageName: 'archive_002.zip',
    displayName: '幻旅系列 002',
    absolutePath: 'X:/收藏/画廊A/archive_002.zip',
    treePath: ['X盘', '收藏', '画廊A', 'archive_002.zip'],
    workTitle: '幻旅系列',
    circle: 'OrbitWorks',
    author: 'Nori',
    tags: ['sci-fi', 'fog', 'rail'],
    images: makeImages('pack-002', 28, 1),
  },
  {
    id: 'pack-003',
    packageName: 'forest_pack.zip',
    displayName: '林地记事',
    absolutePath: 'X:/精选/森林主题/forest_pack.zip',
    treePath: ['X盘', '精选', '森林主题', 'forest_pack.zip'],
    workTitle: '林地记事',
    circle: 'MossCore',
    author: 'Ayan',
    tags: ['forest', 'creature', 'green'],
    images: makeImages('pack-003', 44, 2),
  },
  {
    id: 'pack-004',
    packageName: 'retro_collection.zip',
    displayName: '复古像素拼贴',
    absolutePath: 'Z:/素材库/复古/retro_collection.zip',
    treePath: ['Z盘', '素材库', '复古', 'retro_collection.zip'],
    workTitle: '复古像素拼贴',
    circle: 'PixelRune',
    author: 'Ichi',
    tags: ['retro', 'pixel', 'street'],
    images: makeImages('pack-004', 30, 3),
  },
  {
    id: 'pack-005',
    packageName: 'portrait_set.zip',
    displayName: '肖像练习册',
    absolutePath: 'Z:/素材库/肖像/portrait_set.zip',
    treePath: ['Z盘', '素材库', '肖像', 'portrait_set.zip'],
    workTitle: '肖像练习册',
    circle: 'InkRoom',
    author: 'Mio',
    tags: ['portrait', 'studio', 'light'],
    images: makeImages('pack-005', 32, 4),
  },
]

export const VIDEO_ITEMS: VideoItem[] = [
  {
    id: 'video-001',
    fileName: 'teaser_city.mp4',
    absolutePath: 'X:/视频/项目A/teaser_city.mp4',
    treePath: ['X盘', '视频', '项目A', 'teaser_city.mp4'],
    durationSec: 162,
    width: 1920,
    height: 1080,
    sizeMb: 312,
  },
  {
    id: 'video-002',
    fileName: 'teaser_forest.mp4',
    absolutePath: 'X:/视频/项目A/teaser_forest.mp4',
    treePath: ['X盘', '视频', '项目A', 'teaser_forest.mp4'],
    durationSec: 201,
    width: 1920,
    height: 1080,
    sizeMb: 420,
  },
  {
    id: 'video-003',
    fileName: 'scene_motion.mp4',
    absolutePath: 'X:/视频/项目B/scene_motion.mp4',
    treePath: ['X盘', '视频', '项目B', 'scene_motion.mp4'],
    durationSec: 96,
    width: 1280,
    height: 720,
    sizeMb: 135,
  },
  {
    id: 'video-004',
    fileName: 'archive_cut_01.mp4',
    absolutePath: 'Z:/回放/2025/archive_cut_01.mp4',
    treePath: ['Z盘', '回放', '2025', 'archive_cut_01.mp4'],
    durationSec: 301,
    width: 3840,
    height: 2160,
    sizeMb: 1180,
  },
  {
    id: 'video-005',
    fileName: 'archive_cut_02.mp4',
    absolutePath: 'Z:/回放/2025/archive_cut_02.mp4',
    treePath: ['Z盘', '回放', '2025', 'archive_cut_02.mp4'],
    durationSec: 280,
    width: 3840,
    height: 2160,
    sizeMb: 1035,
  },
]

interface LeafInput {
  id: string
  treePath: string[]
}

export function buildSidebarTree(
  leaves: LeafInput[],
  leafKind: SidebarNodeKind,
): SidebarNode[] {
  const rootMap = new Map<string, SidebarNode>()

  for (const leaf of leaves) {
    const segments = leaf.treePath
    let currentMap = rootMap
    let currentParent: SidebarNode | null = null

    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i]
      const isLeaf = i === segments.length - 1
      const pathKey = segments.slice(0, i + 1).join('/')
      const nodeId = `${isLeaf ? leafKind : 'folder'}:${pathKey}`
      const nextNodeKind: SidebarNodeKind = isLeaf ? leafKind : 'folder'
      const existing = currentMap.get(nodeId)

      if (existing) {
        currentParent = existing
        const childMap = new Map(existing.children.map((child) => [child.id, child]))
        currentMap = childMap
        continue
      }

      const node: SidebarNode = {
        id: nodeId,
        label: segment,
        kind: nextNodeKind,
        children: [],
        pathKey,
      }

      if (isLeaf) {
        if (leafKind === 'package') {
          node.packageId = leaf.id
        }
        if (leafKind === 'video') {
          node.videoId = leaf.id
        }
      }

      if (currentParent) {
        currentParent.children.push(node)
        currentParent.children.sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
      } else {
        rootMap.set(node.id, node)
      }

      currentParent = node
      currentMap = new Map(node.children.map((child) => [child.id, child]))
    }
  }

  return Array.from(rootMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
}

export function findNodeById(nodes: SidebarNode[], id: string | null): SidebarNode | null {
  if (!id) {
    return null
  }

  const stack = [...nodes]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node) {
      continue
    }
    if (node.id === id) {
      return node
    }
    stack.push(...node.children)
  }
  return null
}

function scoreVector(anchor: FocusedImageRef, candidate: FocusedImageRef): number {
  const packageDistance = anchor.packageId === candidate.packageId ? 0 : 0.12
  const orderDistance = Math.abs(anchor.imageIndex - candidate.imageIndex) * 0.013
  const hash = (anchor.packageId.length * 7 + candidate.packageId.length * 11 + candidate.imageIndex * 17) % 19
  const entropy = hash * 0.01
  return Math.max(0.05, 0.97 - packageDistance - orderDistance - entropy)
}

export function buildVectorCandidates(
  anchor: FocusedImageRef,
  allRefs: FocusedImageRef[],
): VectorCandidate[] {
  return allRefs
    .map((ref) => ({
      packageId: ref.packageId,
      imageIndex: ref.imageIndex,
      score: scoreVector(anchor, ref),
    }))
    .sort((a, b) => b.score - a.score)
}
