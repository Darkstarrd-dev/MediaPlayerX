import { useMemo } from 'react'

import type { FocusedImageRef, ImagePackage, SidebarNode } from '../../types'
import { collectImageSourceIds, resolveSourceImageCount } from '../../utils/mediaHelpers'

interface UseRootScopedImageDataParams {
  imageRootNode: SidebarNode | null
  scopedImageSources: ImagePackage[]
}

interface UseRootScopedImageDataResult {
  rootScopedPackageIds: Set<string>
  rootScopedPackages: ImagePackage[]
  allScopedRefs: FocusedImageRef[]
}

export function useRootScopedImageData({
  imageRootNode,
  scopedImageSources,
}: UseRootScopedImageDataParams): UseRootScopedImageDataResult {
  const rootScopedPackageIds = useMemo(() => {
    if (!imageRootNode) {
      return new Set(scopedImageSources.map((source) => source.id))
    }
    return new Set(collectImageSourceIds(imageRootNode))
  }, [imageRootNode, scopedImageSources])

  const rootScopedPackages = useMemo(
    () => scopedImageSources.filter((source) => rootScopedPackageIds.has(source.id)),
    [rootScopedPackageIds, scopedImageSources],
  )

  const allScopedRefs = useMemo<FocusedImageRef[]>(() => {
    const refs: FocusedImageRef[] = []
    for (const pkg of rootScopedPackages) {
      const count = resolveSourceImageCount(pkg)
      for (let imageIndex = 0; imageIndex < count; imageIndex += 1) {
        refs.push({ packageId: pkg.id, imageIndex })
      }
    }
    return refs
  }, [rootScopedPackages])

  return {
    rootScopedPackageIds,
    rootScopedPackages,
    allScopedRefs,
  }
}
