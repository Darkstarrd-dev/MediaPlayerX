import type { ImagePackageDto, SidebarNodeDto } from '../src/contracts/backend'

const MUSIC_BOOKLET_ROOT_LABEL = 'CD Booklet'

function isMusicBookletRootNode(node: SidebarNodeDto): boolean {
  return node.path_key.localeCompare(MUSIC_BOOKLET_ROOT_LABEL, 'zh-CN', { sensitivity: 'base' }) === 0
}

function moveMusicBookletRootToEnd(nodes: SidebarNodeDto[]): void {
  nodes.sort((left, right) => {
    const leftBooklet = isMusicBookletRootNode(left)
    const rightBooklet = isMusicBookletRootNode(right)
    if (leftBooklet === rightBooklet) {
      return 0
    }
    return leftBooklet ? 1 : -1
  })
}

export function buildImageSidebarTree(
  imagePackages: ImagePackageDto[],
  imageDirectories: ImagePackageDto[],
): SidebarNodeDto[] {
  const resolveFirstVisibleImageId = (source: ImagePackageDto | undefined): string | null => {
    if (!source) {
      return null
    }

    const firstVisibleImage = source.images.find((image) => !(image.hidden ?? false))
    return firstVisibleImage?.id ?? null
  }

  const countVisibleImages = (source: ImagePackageDto | undefined): number => {
    if (!source) {
      return 0
    }
    return source.images.reduce((count, image) => (image.hidden ? count : count + 1), 0)
  }

  const packageByPath = new Map<string, ImagePackageDto>()
  const directoryByPath = new Map<string, ImagePackageDto>()

  for (const pkg of imagePackages) {
    packageByPath.set(pkg.tree_path.join('/'), pkg)
  }
  for (const directory of imageDirectories) {
    directoryByPath.set(directory.tree_path.join('/'), directory)
  }

  const firstVisibleImageIdBySourceId = new Map<string, string>()
  for (const source of [...imagePackages, ...imageDirectories]) {
    const firstVisibleImageId = resolveFirstVisibleImageId(source)
    if (!firstVisibleImageId) {
      continue
    }
    firstVisibleImageIdBySourceId.set(source.id, firstVisibleImageId)
  }

  const allLeafPaths = [...imagePackages.map((pkg) => pkg.tree_path), ...imageDirectories.map((directory) => directory.tree_path)]

  const rootMap = new Map<string, SidebarNodeDto>()
  const nodeByPath = new Map<string, SidebarNodeDto>()

  for (const sourcePath of allLeafPaths) {
    for (let index = 0; index < sourcePath.length; index += 1) {
      const segments = sourcePath.slice(0, index + 1)
      const pathKey = segments.join('/')
      if (nodeByPath.has(pathKey)) {
        continue
      }

      const packageAtPath = packageByPath.get(pathKey)
      const directoryAtPath = directoryByPath.get(pathKey)
      const kind = packageAtPath ? 'package' : 'folder'
      const imageNodeType = packageAtPath ? 'package' : directoryAtPath ? 'directory' : 'folder'

      const node: SidebarNodeDto = {
        id: `${kind}:${pathKey}`,
        label: segments[segments.length - 1] ?? pathKey,
        kind,
        image_node_type: imageNodeType,
        children: [],
        path_key: pathKey,
      }

      if (packageAtPath) {
        node.package_id = packageAtPath.id
        node.image_source_id = packageAtPath.id
        node.direct_image_count = countVisibleImages(packageAtPath)
      } else if (directoryAtPath) {
        node.image_source_id = directoryAtPath.id
        node.direct_image_count = countVisibleImages(directoryAtPath)
      }

      nodeByPath.set(pathKey, node)

      if (segments.length === 1) {
        rootMap.set(pathKey, node)
        continue
      }

      const parentPath = sourcePath.slice(0, index).join('/')
      const parentNode = nodeByPath.get(parentPath)
      if (parentNode) {
        parentNode.children.push(node)
      }
    }
  }

  const hydrateAggregateCounts = (
    nodes: SidebarNodeDto[],
  ): { packageCount: number; imageCount: number; nodeCount: number } => {
    let packageCount = 0
    let imageCount = 0
    let nodeCount = 0

    for (const node of nodes) {
      const childAggregate = hydrateAggregateCounts(node.children)
      const selfPackageCount = node.image_node_type === 'package' ? 1 : 0
      const selfImageCount = node.direct_image_count ?? 0

      const totalPackageCount = selfPackageCount + childAggregate.packageCount
      const totalImageCount = selfImageCount + childAggregate.imageCount

      node.descendant_package_count = totalPackageCount
      node.descendant_image_count = totalImageCount
      node.descendant_node_count = childAggregate.nodeCount

      packageCount += totalPackageCount
      imageCount += totalImageCount
      nodeCount += childAggregate.nodeCount + 1
    }

    return {
      packageCount,
      imageCount,
      nodeCount,
    }
  }

  const sortNodes = (nodes: SidebarNodeDto[]) => {
    nodes.sort((left, right) => {
      const kindOrder: Record<SidebarNodeDto['kind'], number> = {
        folder: 0,
        package: 1,
        video: 2,
      }
      const kindDelta = kindOrder[left.kind] - kindOrder[right.kind]
      if (kindDelta !== 0) {
        return kindDelta
      }
      return left.label.localeCompare(right.label, 'zh-CN')
    })

    for (const node of nodes) {
      if (node.children.length > 0) {
        sortNodes(node.children)
      }
    }
  }

  const hydrateNodeCoverRefs = (node: SidebarNodeDto): { sourceId: string | null; imageId: string | null } => {
    if (node.image_node_type === 'package' || node.image_node_type === 'directory') {
      const sourceId = node.image_source_id ?? null
      const imageId = sourceId ? (firstVisibleImageIdBySourceId.get(sourceId) ?? null) : null
      if (sourceId) {
        node.cover_source_id = sourceId
      } else {
        delete node.cover_source_id
      }
      if (imageId) {
        node.cover_image_id = imageId
      } else {
        delete node.cover_image_id
      }

      for (const child of node.children) {
        hydrateNodeCoverRefs(child)
      }

      return {
        sourceId,
        imageId,
      }
    }

    let coverSourceId: string | null = null
    let coverImageId: string | null = null

    for (const child of node.children) {
      const childCover = hydrateNodeCoverRefs(child)
      if (!coverImageId && childCover.imageId) {
        coverImageId = childCover.imageId
        coverSourceId = childCover.sourceId
      }
    }

    if (coverSourceId) {
      node.cover_source_id = coverSourceId
    } else {
      delete node.cover_source_id
    }

    if (coverImageId) {
      node.cover_image_id = coverImageId
    } else {
      delete node.cover_image_id
    }

    return {
      sourceId: coverSourceId,
      imageId: coverImageId,
    }
  }

  const roots = Array.from(rootMap.values())
  hydrateAggregateCounts(roots)
  sortNodes(roots)
  moveMusicBookletRootToEnd(roots)

  for (const node of roots) {
    hydrateNodeCoverRefs(node)
  }

  return roots
}
