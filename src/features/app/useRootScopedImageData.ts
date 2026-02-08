import { useMemo } from 'react'

import type { FocusedImageRef, ImagePackage, SidebarNode } from '../../types'
import { collectImageSourceIds } from './helpers'

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
      pkg.images.forEach((_, imageIndex) => {
        refs.push({ packageId: pkg.id, imageIndex })
      })
    }
    return refs
  }, [rootScopedPackages])

  return {
    rootScopedPackageIds,
    rootScopedPackages,
    allScopedRefs,
  }
}
