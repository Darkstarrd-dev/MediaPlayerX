import type { ImagePackageDto, SidebarNodeDto } from '../src/contracts/backend'

export function buildImageSidebarTree(
  imagePackages: ImagePackageDto[],
  imageDirectories: ImagePackageDto[],
): SidebarNodeDto[] {
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

  const roots = Array.from(rootMap.values())
  hydrateAggregateCounts(roots)
  sortNodes(roots)
  return roots
}
