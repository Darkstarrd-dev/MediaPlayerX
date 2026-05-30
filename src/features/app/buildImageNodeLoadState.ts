import type { ImagePackage, SidebarNode } from '../../types'
import { resolveSourceImageCount } from '../../utils/mediaHelpers'

interface BuildImageNodeLoadStateParams {
  archiveLoadStatus: {
    runningArchivePath: string | null
    pendingArchivePaths: string[]
  }
  imageTreeForSidebar: SidebarNode[]
  scopedImageSources: ImagePackage[]
  normalizePathForCompare: (value: string) => string
}

export function buildImageNodeLoadState({
  archiveLoadStatus,
  imageTreeForSidebar,
  scopedImageSources,
  normalizePathForCompare,
}: BuildImageNodeLoadStateParams): Record<string, 'pending' | 'running'> {
  const pendingPathSet = new Set(archiveLoadStatus.pendingArchivePaths.map((value) => normalizePathForCompare(value)))
  const runningPath = archiveLoadStatus.runningArchivePath ? normalizePathForCompare(archiveLoadStatus.runningArchivePath) : null

  const packageLoadStateBySourceId = new Map<string, 'pending' | 'running'>()

  for (const source of scopedImageSources) {
    const normalizedPath = normalizePathForCompare(source.absolutePath)
    const lowerPath = normalizedPath.toLowerCase()
    const isRar7z = lowerPath.endsWith('.rar') || lowerPath.endsWith('.7z')
    if (!isRar7z) {
      continue
    }

    if (runningPath && normalizedPath === runningPath) {
      packageLoadStateBySourceId.set(source.id, 'running')
      continue
    }

    if (pendingPathSet.has(normalizedPath) || resolveSourceImageCount(source) === 0) {
      packageLoadStateBySourceId.set(source.id, 'pending')
    }
  }

  const nodeStateById: Record<string, 'pending' | 'running'> = {}
  const walk = (nodes: SidebarNode[]): ('pending' | 'running' | null)[] =>
    nodes.map((node) => {
      let state: 'pending' | 'running' | null = null

      if (node.imageSourceId) {
        state = packageLoadStateBySourceId.get(node.imageSourceId) ?? null
      }

      const childStates = walk(node.children)
      for (const childState of childStates) {
        if (childState === 'running') {
          state = 'running'
          break
        }
        if (childState === 'pending' && !state) {
          state = 'pending'
        }
      }

      if (state) {
        nodeStateById[node.id] = state
      }

      return state
    })

  walk(imageTreeForSidebar)
  return nodeStateById
}
