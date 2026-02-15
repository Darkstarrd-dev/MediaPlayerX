import type { ManageAdReviewTaskDto } from '../../contracts/backend'
import type { FocusedImageRef, ImagePackage, SidebarNode } from '../../types'

interface ResolveAdReviewPageDerivationsParams {
  adReviewResultsMode: boolean
  orderedRootScopedImageRefs: FocusedImageRef[]
  packageByIdEffective: Map<string, ImagePackage>
  adReviewFocusTask: ManageAdReviewTaskDto | null
  selectedSidebarNode: SidebarNode | null
  pagedPageSize: number
  normalizedPageIndexEffective: number
  visibleImageRefs: FocusedImageRef[]
  refsInPageEffective: FocusedImageRef[]
  pageStartEffective: number
  imageTotalPagesEffective: number
}

interface ResolveAdReviewPageDerivationsResult {
  visibleImageRefsForMain: FocusedImageRef[]
  refsInPageBase: FocusedImageRef[]
  pageStartForMain: number
  normalizedPageIndexForMain: number
  imageTotalPagesForMain: number
}

function pathKeyHasPrefix(pathKey: string, prefix: string): boolean {
  return pathKey === prefix || pathKey.startsWith(`${prefix}/`)
}

function resolveImageIdByRef(ref: FocusedImageRef, packageByIdEffective: Map<string, ImagePackage>): string | null {
  return packageByIdEffective.get(ref.packageId)?.images[ref.imageIndex]?.id ?? null
}

export function resolveAdReviewPageDerivations({
  adReviewResultsMode,
  orderedRootScopedImageRefs,
  packageByIdEffective,
  adReviewFocusTask,
  selectedSidebarNode,
  pagedPageSize,
  normalizedPageIndexEffective,
  visibleImageRefs,
  refsInPageEffective,
  pageStartEffective,
  imageTotalPagesEffective,
}: ResolveAdReviewPageDerivationsParams): ResolveAdReviewPageDerivationsResult {
  const adReviewFocusCandidateImageIdSet = new Set(adReviewFocusTask?.candidates.map((candidate) => candidate.image_id) ?? [])
  const adReviewFocusRefsAll = adReviewResultsMode
    ? orderedRootScopedImageRefs.filter((ref) => {
        const imageId = resolveImageIdByRef(ref, packageByIdEffective)
        return Boolean(imageId && adReviewFocusCandidateImageIdSet.has(imageId))
      })
    : []

  const adReviewFocusRefsBySidebar = adReviewResultsMode
    ? adReviewFocusRefsAll.filter((ref) => {
        if (!selectedSidebarNode) {
          return true
        }

        const selectedNodeIsFolder = selectedSidebarNode.kind === 'folder' || selectedSidebarNode.imageNodeType === 'folder'
        if (selectedNodeIsFolder) {
          const packagePathKey = packageByIdEffective.get(ref.packageId)?.treePath.join('/')
          return Boolean(packagePathKey && pathKeyHasPrefix(packagePathKey, selectedSidebarNode.pathKey))
        }

        const nodePackageId = selectedSidebarNode.imageSourceId ?? selectedSidebarNode.packageId
        if (!nodePackageId) {
          return true
        }

        return ref.packageId === nodePackageId
      })
    : []

  const adReviewImageTotalPages = Math.max(1, Math.ceil(adReviewFocusRefsBySidebar.length / Math.max(1, pagedPageSize)))
  const adReviewNormalizedPageIndex = Math.min(Math.max(normalizedPageIndexEffective, 0), adReviewImageTotalPages - 1)
  const adReviewPageStart = adReviewNormalizedPageIndex * pagedPageSize

  const visibleImageRefsForMain = adReviewResultsMode ? adReviewFocusRefsBySidebar : visibleImageRefs
  const refsInPageBase = adReviewResultsMode
    ? adReviewFocusRefsBySidebar.slice(adReviewPageStart, adReviewPageStart + pagedPageSize)
    : refsInPageEffective
  const pageStartForMain = adReviewResultsMode ? adReviewPageStart : pageStartEffective
  const normalizedPageIndexForMain = adReviewResultsMode ? adReviewNormalizedPageIndex : normalizedPageIndexEffective
  const imageTotalPagesForMain = adReviewResultsMode ? adReviewImageTotalPages : imageTotalPagesEffective

  return {
    visibleImageRefsForMain,
    refsInPageBase,
    pageStartForMain,
    normalizedPageIndexForMain,
    imageTotalPagesForMain,
  }
}
