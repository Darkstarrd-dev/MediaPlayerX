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

function makeMockDimensions(index: number): { width: number; height: number } {
  const profileIndex = index % 3

  if (profileIndex === 0) {
    const edge = 920 + ((index * 37) % 420)
    return { width: edge, height: edge }
  }

  if (profileIndex === 1) {
    return {
      width: 1360 + ((index * 71) % 700),
      height: 760 + ((index * 29) % 240),
    }
  }

  return {
    width: 760 + ((index * 43) % 260),
    height: 1280 + ((index * 61) % 700),
  }
}

function makeImages(packageId: string, count: number, clusterOffset: number): ImageItem[] {
  const items: ImageItem[] = []
  for (let i = 0; i < count; i += 1) {
    const ordinal = i + 1
    const { width, height } = makeMockDimensions(i)
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
  {
    id: 'pack-006',
    packageName: 'street_album.zip',
    displayName: '街景采样集',
    absolutePath: 'Y:/图库/街景/street_album.zip',
    treePath: ['Y盘', '图库', '街景', 'street_album.zip'],
    workTitle: '街景采样集',
    circle: 'StreetLab',
    author: 'Rei',
    tags: ['street', 'urban', 'night'],
    images: makeImages('pack-006', 38, 0),
  },
  {
    id: 'pack-007',
    packageName: 'mountain_story.zip',
    displayName: '山脊纪行',
    absolutePath: 'Y:/图库/自然/mountain_story.zip',
    treePath: ['Y盘', '图库', '自然', 'mountain_story.zip'],
    workTitle: '山脊纪行',
    circle: 'NorthPeak',
    author: 'Lina',
    tags: ['mountain', 'cloud', 'landscape'],
    images: makeImages('pack-007', 34, 2),
  },
  {
    id: 'pack-008',
    packageName: 'city_block_a.zip',
    displayName: '城市街区 A',
    absolutePath: 'Y:/图库/街景/city_block_a.zip',
    treePath: ['Y盘', '图库', '街景', 'city_block_a.zip'],
    workTitle: '城市街区',
    circle: 'StreetLab',
    author: 'Rei',
    tags: ['city', 'crossroad', 'bus'],
    images: makeImages('pack-008', 27, 1),
  },
  {
    id: 'pack-009',
    packageName: 'gallery_extra_01.zip',
    displayName: '扩展画廊 01',
    absolutePath: 'X:/收藏/扩展画廊/gallery_extra_01.zip',
    treePath: ['X盘', '收藏', '扩展画廊', 'gallery_extra_01.zip'],
    workTitle: '扩展画廊',
    circle: 'OrbitWorks',
    author: 'Nori',
    tags: ['extra', 'gallery', 'set01'],
    images: makeImages('pack-009', 24, 5),
  },
  {
    id: 'pack-010',
    packageName: 'gallery_extra_02.zip',
    displayName: '扩展画廊 02',
    absolutePath: 'X:/收藏/扩展画廊/gallery_extra_02.zip',
    treePath: ['X盘', '收藏', '扩展画廊', 'gallery_extra_02.zip'],
    workTitle: '扩展画廊',
    circle: 'OrbitWorks',
    author: 'Nori',
    tags: ['extra', 'gallery', 'set02'],
    images: makeImages('pack-010', 29, 4),
  },
  {
    id: 'pack-011',
    packageName: 'coastline_album.zip',
    displayName: '海岸线合集',
    absolutePath: 'W:/素材库/海岸/coastline_album.zip',
    treePath: ['W盘', '素材库', '海岸', 'coastline_album.zip'],
    workTitle: '海岸线合集',
    circle: 'BlueAtlas',
    author: 'Rin',
    tags: ['coast', 'sea', 'sky'],
    images: makeImages('pack-011', 31, 0),
  },
  {
    id: 'pack-012',
    packageName: 'coastline_album_b.zip',
    displayName: '海岸线合集 B',
    absolutePath: 'W:/素材库/海岸/coastline_album_b.zip',
    treePath: ['W盘', '素材库', '海岸', 'coastline_album_b.zip'],
    workTitle: '海岸线合集',
    circle: 'BlueAtlas',
    author: 'Rin',
    tags: ['coast', 'sunset', 'wave'],
    images: makeImages('pack-012', 27, 1),
  },
  {
    id: 'pack-013',
    packageName: 'castle_study.zip',
    displayName: '城堡构图练习',
    absolutePath: 'W:/素材库/建筑/castle_study.zip',
    treePath: ['W盘', '素材库', '建筑', 'castle_study.zip'],
    workTitle: '城堡构图练习',
    circle: 'StoneFrame',
    author: 'Kael',
    tags: ['castle', 'architecture', 'stone'],
    images: makeImages('pack-013', 26, 2),
  },
  {
    id: 'pack-014',
    packageName: 'castle_study_b.zip',
    displayName: '城堡构图练习 B',
    absolutePath: 'W:/素材库/建筑/castle_study_b.zip',
    treePath: ['W盘', '素材库', '建筑', 'castle_study_b.zip'],
    workTitle: '城堡构图练习',
    circle: 'StoneFrame',
    author: 'Kael',
    tags: ['castle', 'tower', 'night'],
    images: makeImages('pack-014', 22, 3),
  },
]

export const IMAGE_DIRECTORY_SOURCES: ImagePackage[] = [
  {
    id: 'dir-001',
    packageName: '[DIR] 仅图片目录',
    displayName: '仅图片目录',
    absolutePath: 'X:/收藏/仅图片目录',
    treePath: ['X盘', '收藏', '仅图片目录'],
    workTitle: '目录直读：仅图片目录',
    circle: 'Directory',
    author: 'Directory',
    tags: ['folder', 'direct-images'],
    images: makeImages('dir-001', 18, 1),
  },
  {
    id: 'dir-002',
    packageName: '[DIR] 画廊A',
    displayName: '画廊A（目录直读）',
    absolutePath: 'X:/收藏/画廊A',
    treePath: ['X盘', '收藏', '画廊A'],
    workTitle: '目录直读：画廊A',
    circle: 'Directory',
    author: 'Directory',
    tags: ['folder', 'mixed-root'],
    images: makeImages('dir-002', 7, 2),
  },
  {
    id: 'dir-003',
    packageName: '[DIR] 子目录A',
    displayName: '子目录A（目录直读）',
    absolutePath: 'X:/收藏/画廊A/子目录A',
    treePath: ['X盘', '收藏', '画廊A', '子目录A'],
    workTitle: '目录直读：子目录A',
    circle: 'Directory',
    author: 'Directory',
    tags: ['folder', 'nested'],
    images: makeImages('dir-003', 9, 3),
  },
  {
    id: 'dir-004',
    packageName: '[DIR] 更深目录',
    displayName: '更深目录（目录直读）',
    absolutePath: 'X:/收藏/画廊A/子目录A/更深目录',
    treePath: ['X盘', '收藏', '画廊A', '子目录A', '更深目录'],
    workTitle: '目录直读：更深目录',
    circle: 'Directory',
    author: 'Directory',
    tags: ['folder', 'deep'],
    images: makeImages('dir-004', 5, 4),
  },
  {
    id: 'dir-005',
    packageName: '[ZIP DIR] archive_001/chapter_01',
    displayName: 'archive_001.zip/chapter_01',
    absolutePath: 'X:/收藏/画廊A/archive_001.zip::chapter_01',
    treePath: ['X盘', '收藏', '画廊A', 'archive_001.zip', 'chapter_01'],
    workTitle: '压缩包目录直读：chapter_01',
    circle: 'ZipDirectory',
    author: 'Directory',
    tags: ['zip-folder', 'nested'],
    images: makeImages('dir-005', 6, 0),
  },
  {
    id: 'dir-006',
    packageName: '[ZIP DIR] archive_001/scene_A',
    displayName: 'archive_001.zip/chapter_01/scene_A',
    absolutePath: 'X:/收藏/画廊A/archive_001.zip::chapter_01/scene_A',
    treePath: ['X盘', '收藏', '画廊A', 'archive_001.zip', 'chapter_01', 'scene_A'],
    workTitle: '压缩包目录直读：scene_A',
    circle: 'ZipDirectory',
    author: 'Directory',
    tags: ['zip-folder', 'deep'],
    images: makeImages('dir-006', 3, 5),
  },
  {
    id: 'dir-007',
    packageName: '[ZIP DIR] retro_collection/extras',
    displayName: 'retro_collection.zip/extras',
    absolutePath: 'Z:/素材库/复古/retro_collection.zip::extras',
    treePath: ['Z盘', '素材库', '复古', 'retro_collection.zip', 'extras'],
    workTitle: '压缩包目录直读：extras',
    circle: 'ZipDirectory',
    author: 'Directory',
    tags: ['zip-folder', 'mixed-root'],
    images: makeImages('dir-007', 4, 2),
  },
  {
    id: 'dir-008',
    packageName: '[ZIP DIR] retro_collection/variant',
    displayName: 'retro_collection.zip/extras/variant',
    absolutePath: 'Z:/素材库/复古/retro_collection.zip::extras/variant',
    treePath: ['Z盘', '素材库', '复古', 'retro_collection.zip', 'extras', 'variant'],
    workTitle: '压缩包目录直读：variant',
    circle: 'ZipDirectory',
    author: 'Directory',
    tags: ['zip-folder', 'deep'],
    images: makeImages('dir-008', 2, 3),
  },
  {
    id: 'dir-009',
    packageName: '[DIR] 扩展画廊',
    displayName: '扩展画廊（目录直读）',
    absolutePath: 'X:/收藏/扩展画廊',
    treePath: ['X盘', '收藏', '扩展画廊'],
    workTitle: '目录直读：扩展画廊',
    circle: 'Directory',
    author: 'Directory',
    tags: ['folder', 'extra-root'],
    images: makeImages('dir-009', 6, 1),
  },
  {
    id: 'dir-010',
    packageName: '[DIR] 扩展画廊/分支A',
    displayName: '扩展画廊/分支A',
    absolutePath: 'X:/收藏/扩展画廊/分支A',
    treePath: ['X盘', '收藏', '扩展画廊', '分支A'],
    workTitle: '目录直读：分支A',
    circle: 'Directory',
    author: 'Directory',
    tags: ['folder', 'nested'],
    images: makeImages('dir-010', 8, 2),
  },
  {
    id: 'dir-011',
    packageName: '[DIR] 扩展画廊/分支A/子级',
    displayName: '扩展画廊/分支A/子级',
    absolutePath: 'X:/收藏/扩展画廊/分支A/子级',
    treePath: ['X盘', '收藏', '扩展画廊', '分支A', '子级'],
    workTitle: '目录直读：分支A 子级',
    circle: 'Directory',
    author: 'Directory',
    tags: ['folder', 'deep'],
    images: makeImages('dir-011', 5, 3),
  },
  {
    id: 'dir-012',
    packageName: '[DIR] 街景',
    displayName: '街景（目录直读）',
    absolutePath: 'Y:/图库/街景',
    treePath: ['Y盘', '图库', '街景'],
    workTitle: '目录直读：街景',
    circle: 'Directory',
    author: 'Directory',
    tags: ['folder', 'mixed-root'],
    images: makeImages('dir-012', 7, 4),
  },
  {
    id: 'dir-013',
    packageName: '[DIR] 街景/夜景',
    displayName: '街景/夜景',
    absolutePath: 'Y:/图库/街景/夜景',
    treePath: ['Y盘', '图库', '街景', '夜景'],
    workTitle: '目录直读：夜景',
    circle: 'Directory',
    author: 'Directory',
    tags: ['folder', 'nested'],
    images: makeImages('dir-013', 9, 5),
  },
  {
    id: 'dir-014',
    packageName: '[DIR] 街景/夜景/雨天',
    displayName: '街景/夜景/雨天',
    absolutePath: 'Y:/图库/街景/夜景/雨天',
    treePath: ['Y盘', '图库', '街景', '夜景', '雨天'],
    workTitle: '目录直读：雨天',
    circle: 'Directory',
    author: 'Directory',
    tags: ['folder', 'deep'],
    images: makeImages('dir-014', 4, 0),
  },
  {
    id: 'dir-015',
    packageName: '[ZIP DIR] city_block_a/block_north',
    displayName: 'city_block_a.zip/block_north',
    absolutePath: 'Y:/图库/街景/city_block_a.zip::block_north',
    treePath: ['Y盘', '图库', '街景', 'city_block_a.zip', 'block_north'],
    workTitle: '压缩包目录直读：block_north',
    circle: 'ZipDirectory',
    author: 'Directory',
    tags: ['zip-folder', 'nested'],
    images: makeImages('dir-015', 5, 1),
  },
  {
    id: 'dir-016',
    packageName: '[ZIP DIR] city_block_a/block_north/layer_2',
    displayName: 'city_block_a.zip/block_north/layer_2',
    absolutePath: 'Y:/图库/街景/city_block_a.zip::block_north/layer_2',
    treePath: ['Y盘', '图库', '街景', 'city_block_a.zip', 'block_north', 'layer_2'],
    workTitle: '压缩包目录直读：layer_2',
    circle: 'ZipDirectory',
    author: 'Directory',
    tags: ['zip-folder', 'deep'],
    images: makeImages('dir-016', 3, 2),
  },
  {
    id: 'dir-017',
    packageName: '[DIR] 海岸',
    displayName: '海岸（目录直读）',
    absolutePath: 'W:/素材库/海岸',
    treePath: ['W盘', '素材库', '海岸'],
    workTitle: '目录直读：海岸',
    circle: 'Directory',
    author: 'Directory',
    tags: ['folder', 'mixed-root'],
    images: makeImages('dir-017', 8, 0),
  },
  {
    id: 'dir-018',
    packageName: '[DIR] 海岸/滩涂',
    displayName: '海岸/滩涂',
    absolutePath: 'W:/素材库/海岸/滩涂',
    treePath: ['W盘', '素材库', '海岸', '滩涂'],
    workTitle: '目录直读：滩涂',
    circle: 'Directory',
    author: 'Directory',
    tags: ['folder', 'nested'],
    images: makeImages('dir-018', 6, 1),
  },
  {
    id: 'dir-019',
    packageName: '[DIR] 海岸/滩涂/潮线',
    displayName: '海岸/滩涂/潮线',
    absolutePath: 'W:/素材库/海岸/滩涂/潮线',
    treePath: ['W盘', '素材库', '海岸', '滩涂', '潮线'],
    workTitle: '目录直读：潮线',
    circle: 'Directory',
    author: 'Directory',
    tags: ['folder', 'deep'],
    images: makeImages('dir-019', 4, 2),
  },
  {
    id: 'dir-020',
    packageName: '[DIR] 建筑',
    displayName: '建筑（目录直读）',
    absolutePath: 'W:/素材库/建筑',
    treePath: ['W盘', '素材库', '建筑'],
    workTitle: '目录直读：建筑',
    circle: 'Directory',
    author: 'Directory',
    tags: ['folder', 'mixed-root'],
    images: makeImages('dir-020', 7, 3),
  },
  {
    id: 'dir-021',
    packageName: '[ZIP DIR] castle_study/wing_a',
    displayName: 'castle_study.zip/wing_a',
    absolutePath: 'W:/素材库/建筑/castle_study.zip::wing_a',
    treePath: ['W盘', '素材库', '建筑', 'castle_study.zip', 'wing_a'],
    workTitle: '压缩包目录直读：wing_a',
    circle: 'ZipDirectory',
    author: 'Directory',
    tags: ['zip-folder', 'nested'],
    images: makeImages('dir-021', 5, 4),
  },
  {
    id: 'dir-022',
    packageName: '[ZIP DIR] castle_study/wing_a/inner',
    displayName: 'castle_study.zip/wing_a/inner',
    absolutePath: 'W:/素材库/建筑/castle_study.zip::wing_a/inner',
    treePath: ['W盘', '素材库', '建筑', 'castle_study.zip', 'wing_a', 'inner'],
    workTitle: '压缩包目录直读：inner',
    circle: 'ZipDirectory',
    author: 'Directory',
    tags: ['zip-folder', 'deep'],
    images: makeImages('dir-022', 3, 5),
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

function pathKeyOf(segments: string[]): string {
  return segments.join('/')
}

function sortNodes(nodes: SidebarNode[]): void {
  const kindOrder: Record<SidebarNodeKind, number> = {
    folder: 0,
    package: 1,
    video: 2,
  }

  nodes.sort((a, b) => {
    const kindDelta = kindOrder[a.kind] - kindOrder[b.kind]
    if (kindDelta !== 0) {
      return kindDelta
    }
    return a.label.localeCompare(b.label, 'zh-CN')
  })

  for (const node of nodes) {
    if (node.children.length > 0) {
      sortNodes(node.children)
    }
  }
}

export function buildImageSidebarTree(
  packages: ImagePackage[],
  directories: ImagePackage[],
): SidebarNode[] {
  const packageByPath = new Map<string, ImagePackage>()
  const directoryByPath = new Map<string, ImagePackage>()

  for (const pkg of packages) {
    packageByPath.set(pathKeyOf(pkg.treePath), pkg)
  }
  for (const directory of directories) {
    directoryByPath.set(pathKeyOf(directory.treePath), directory)
  }

  const allLeafPaths = [...packages.map((pkg) => pkg.treePath), ...directories.map((directory) => directory.treePath)]

  const rootMap = new Map<string, SidebarNode>()
  const nodeByPath = new Map<string, SidebarNode>()

  for (const path of allLeafPaths) {
    for (let i = 0; i < path.length; i += 1) {
      const segments = path.slice(0, i + 1)
      const pathKey = pathKeyOf(segments)
      const existing = nodeByPath.get(pathKey)
      if (existing) {
        continue
      }

      const packageAtPath = packageByPath.get(pathKey)
      const directoryAtPath = directoryByPath.get(pathKey)
      const nodeKind: SidebarNodeKind = packageAtPath ? 'package' : 'folder'

      const node: SidebarNode = {
        id: `${nodeKind}:${pathKey}`,
        label: segments[segments.length - 1],
        kind: nodeKind,
        children: [],
        pathKey,
      }

      if (packageAtPath) {
        node.packageId = packageAtPath.id
        node.imageSourceId = packageAtPath.id
        node.directImageCount = packageAtPath.images.length
      } else if (directoryAtPath) {
        node.imageSourceId = directoryAtPath.id
        node.directImageCount = directoryAtPath.images.length
      }

      nodeByPath.set(pathKey, node)

      if (segments.length === 1) {
        rootMap.set(pathKey, node)
        continue
      }

      const parentPathKey = pathKeyOf(path.slice(0, i))
      const parent = nodeByPath.get(parentPathKey)
      if (parent) {
        parent.children.push(node)
      }
    }
  }

  const roots = Array.from(rootMap.values())
  sortNodes(roots)
  return roots
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

  const roots = Array.from(rootMap.values())
  sortNodes(roots)
  return roots
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
