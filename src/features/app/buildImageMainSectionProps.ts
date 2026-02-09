import type { RefObject } from 'react'

import type { AppSettings } from '../../contracts/settings'
import type { FocusedImageRef, ImagePackage, VectorCandidate } from '../../types'

interface BuildImageMainSectionPropsParams {
  vectorResultsActive: boolean
  showNamesOnly: boolean
  backendPageLoading: boolean
  pagedPageSize: number
  enableLoadingSkeleton: boolean
  activePackageForDisplay: ImagePackage | null
  focusedRef: FocusedImageRef | null
  focusedImageExists: boolean
  visibleImageRefs: FocusedImageRef[]
  refsInPageEffective: FocusedImageRef[]
  pageStartEffective: number
  actualCellWidth: number
  actualMediaHeight: number
  thumbnailColumns: number
  actualThumbnailGap: number
  vectorSearchResults: VectorCandidate[]
  normalizedPageIndexEffective: number
  imageTotalPagesEffective: number
  packageByIdEffective: Map<string, ImagePackage>
  thumbnailImageUrlById: Record<string, string>
  gridRef: RefObject<HTMLDivElement | null>
  manageMode: boolean
  checkedImageIdSet: Set<string>
  updateSettings: (patch: Partial<AppSettings>) => void
  setFullscreenActiveWithAutoStop: (value: boolean) => void
  setVectorFocusIndex: (value: number) => void
  setImageFocus: (packageId: string, imageIndex: number) => void
  onToggleImageChecked: (imageId: string, checked?: boolean) => void
  onReplaceCheckedImages: (imageIds: string[], append?: boolean) => void
  goPrevPage: () => void
  goNextPage: () => void
}

export function buildImageMainSectionProps(params: BuildImageMainSectionPropsParams) {
  return {
    vectorMode: params.vectorResultsActive,
    showNamesOnly: params.showNamesOnly,
    loading: params.enableLoadingSkeleton ? params.backendPageLoading : false,
    placeholderCount: Math.max(1, params.pagedPageSize),
    enableLoadingSkeleton: params.enableLoadingSkeleton,
    activePackage: params.activePackageForDisplay,
    focusedRef: params.focusedRef,
    focusedImageExists: params.focusedImageExists,
    visibleImageRefs: params.visibleImageRefs,
    refsInPage: params.refsInPageEffective,
    pageStart: params.pageStartEffective,
    actualCellWidth: params.actualCellWidth,
    actualMediaHeight: params.actualMediaHeight,
    thumbnailColumns: params.thumbnailColumns,
    thumbnailGap: params.actualThumbnailGap,
    vectorCandidates: params.vectorSearchResults,
    normalizedPageIndex: params.normalizedPageIndexEffective,
    imageTotalPages: params.imageTotalPagesEffective,
    packageById: params.packageByIdEffective,
    imageUrlById: params.thumbnailImageUrlById,
    gridRef: params.gridRef,
    manageMode: params.manageMode,
    checkedImageIds: params.checkedImageIdSet,
    onToggleImageChecked: params.onToggleImageChecked,
    onReplaceCheckedImages: params.onReplaceCheckedImages,
    onToggleShowNamesOnly: () => params.updateSettings({ showNamesOnly: !params.showNamesOnly }),
    onEnterFullscreen: () => params.setFullscreenActiveWithAutoStop(true),
    onSelectImage: (packageId: string, imageIndex: number, absoluteIndex: number) => {
      if (params.vectorResultsActive) {
        params.setVectorFocusIndex(absoluteIndex)
      }
      params.setImageFocus(packageId, imageIndex)
      params.updateSettings({ sidebarFocus: 'main' })
    },
    onPrevPage: params.goPrevPage,
    onNextPage: params.goNextPage,
  }
}
