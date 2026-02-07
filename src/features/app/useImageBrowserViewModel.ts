import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react'

import type { BrowserMode, FocusedImageRef, ImageItem, ImagePackage, VectorCandidate } from '../../types'
import { clamp } from '../../utils/ui'

interface UseImageBrowserViewModelParams {
  mode: BrowserMode
  selectedPackageId: string
  setSelectedPackageId: Dispatch<SetStateAction<string>>
  imageFocusActive: boolean
  setImageFocusActive: Dispatch<SetStateAction<boolean>>
  focusByPackage: Record<string, number>
  setFocusByPackage: Dispatch<SetStateAction<Record<string, number>>>
  pageByPackage: Record<string, number>
  setPageByPackage: Dispatch<SetStateAction<Record<string, number>>>
  vectorSearchResults: VectorCandidate[]
  vectorFocusIndex: number
  setVectorFocusIndex: Dispatch<SetStateAction<number>>
  vectorPage: number
  setVectorPage: Dispatch<SetStateAction<number>>
  gradeByPackage: Record<string, number | null>
  setGradeByPackage: Dispatch<SetStateAction<Record<string, number | null>>>
  packageById: Map<string, ImagePackage>
  orderedRootScopedPackages: ImagePackage[]
  orderedRootScopedImageRefs: FocusedImageRef[]
  vectorResultsActive: boolean
  showNamesOnly: boolean
  thumbnailColumns: number
  pagedPageSize: number
  fullscreenActive: boolean
}

interface UseImageBrowserViewModelResult {
  activePackage: ImagePackage | null
  focusedRef: FocusedImageRef | null
  focusedImage: ImageItem | null
  focusedImagePackage: ImagePackage | null
  metadataImagePackage: ImagePackage | null
  currentGrade: number | null
  visibleImageRefs: FocusedImageRef[]
  imageTotalPages: number
  normalizedPageIndex: number
  pageStart: number
  refsInPage: FocusedImageRef[]
  setImageFocus: (packageId: string, imageIndex: number) => void
  moveImage: (delta: number) => void
  moveImageVertical: (direction: 'up' | 'down') => void
  jumpImageBoundary: (target: 'first' | 'last') => void
  goPackage: (delta: number) => void
  setPackageGrade: (grade: number | null) => void
  goPrevPage: () => void
  goNextPage: () => void
}

export function useImageBrowserViewModel({
  mode,
  selectedPackageId,
  setSelectedPackageId,
  imageFocusActive,
  setImageFocusActive,
  focusByPackage,
  setFocusByPackage,
  pageByPackage,
  setPageByPackage,
  vectorSearchResults,
  vectorFocusIndex,
  setVectorFocusIndex,
  vectorPage,
  setVectorPage,
  gradeByPackage,
  setGradeByPackage,
  packageById,
  orderedRootScopedPackages,
  orderedRootScopedImageRefs,
  vectorResultsActive,
  showNamesOnly,
  thumbnailColumns,
  pagedPageSize,
  fullscreenActive,
}: UseImageBrowserViewModelParams): UseImageBrowserViewModelResult {
  const activePackage = packageById.get(selectedPackageId) ?? orderedRootScopedPackages[0] ?? null

  const activeVectorRef = vectorSearchResults[vectorFocusIndex]
  const focusedRef = useMemo<FocusedImageRef | null>(() => {
    if (mode === 'image' && vectorResultsActive) {
      if (!activeVectorRef) {
        return null
      }
      return { packageId: activeVectorRef.packageId, imageIndex: activeVectorRef.imageIndex }
    }

    if (!activePackage || !imageFocusActive) {
      return null
    }

    return {
      packageId: activePackage.id,
      imageIndex: clamp(focusByPackage[activePackage.id] ?? 0, 0, activePackage.images.length - 1),
    }
  }, [activePackage, activeVectorRef, focusByPackage, imageFocusActive, mode, vectorResultsActive])

  const focusedImage = useMemo(() => {
    if (!focusedRef) {
      return null
    }
    return packageById.get(focusedRef.packageId)?.images[focusedRef.imageIndex] ?? null
  }, [focusedRef, packageById])

  const focusedImagePackage = useMemo(() => {
    if (!focusedRef) {
      return null
    }
    return packageById.get(focusedRef.packageId) ?? null
  }, [focusedRef, packageById])

  const metadataImagePackage = focusedImagePackage ?? activePackage

  const currentGrade = mode === 'image' && metadataImagePackage ? (gradeByPackage[metadataImagePackage.id] ?? null) : null

  const visibleImageRefs = useMemo(() => {
    if (mode !== 'image') {
      return []
    }

    if (vectorResultsActive) {
      return vectorSearchResults.map((candidate) => ({
        packageId: candidate.packageId,
        imageIndex: candidate.imageIndex,
      }))
    }

    if (!activePackage) {
      return []
    }

    return activePackage.images.map((_, imageIndex) => ({
      packageId: activePackage.id,
      imageIndex,
    }))
  }, [activePackage, mode, vectorResultsActive, vectorSearchResults])

  const imagePageIndex = showNamesOnly ? 0 : vectorResultsActive ? vectorPage : (pageByPackage[selectedPackageId] ?? 0)
  const imageTotalPages = showNamesOnly ? 1 : Math.max(1, Math.ceil(visibleImageRefs.length / pagedPageSize))
  const normalizedPageIndex = showNamesOnly ? 0 : clamp(imagePageIndex, 0, imageTotalPages - 1)
  const pageStart = showNamesOnly ? 0 : normalizedPageIndex * pagedPageSize
  const pageEnd = showNamesOnly ? visibleImageRefs.length : pageStart + pagedPageSize
  const refsInPage = showNamesOnly ? visibleImageRefs : visibleImageRefs.slice(pageStart, pageEnd)

  const setImageFocus = useCallback(
    (packageId: string, imageIndex: number) => {
      const pkg = packageById.get(packageId)
      if (!pkg) {
        return
      }

      const clampedIndex = clamp(imageIndex, 0, pkg.images.length - 1)
      setImageFocusActive(true)
      setSelectedPackageId(packageId)
      setFocusByPackage((previous) => ({
        ...previous,
        [packageId]: clampedIndex,
      }))
      setPageByPackage((previous) => ({
        ...previous,
        [packageId]: Math.floor(clampedIndex / pagedPageSize),
      }))
    },
    [packageById, pagedPageSize, setFocusByPackage, setImageFocusActive, setPageByPackage, setSelectedPackageId],
  )

  const moveImage = useCallback(
    (delta: number) => {
      if (mode !== 'image') {
        return
      }

      if (vectorResultsActive) {
        if (vectorSearchResults.length === 0) {
          return
        }

        const currentIndex = clamp(vectorFocusIndex, 0, vectorSearchResults.length - 1)
        const nextIndex = clamp(currentIndex + delta, 0, vectorSearchResults.length - 1)
        const nextRef = vectorSearchResults[nextIndex]
        if (!nextRef) {
          return
        }

        setVectorFocusIndex(nextIndex)
        setImageFocus(nextRef.packageId, nextRef.imageIndex)
        return
      }

      if (!activePackage) {
        return
      }

      const current = focusByPackage[activePackage.id] ?? 0

      if (!fullscreenActive || orderedRootScopedImageRefs.length === 0) {
        setImageFocus(activePackage.id, current + delta)
        return
      }

      const currentIndex = orderedRootScopedImageRefs.findIndex(
        (ref) => ref.packageId === activePackage.id && ref.imageIndex === clamp(current, 0, activePackage.images.length - 1),
      )

      if (currentIndex < 0) {
        setImageFocus(activePackage.id, current + delta)
        return
      }

      const nextIndex = clamp(currentIndex + delta, 0, orderedRootScopedImageRefs.length - 1)
      const nextRef = orderedRootScopedImageRefs[nextIndex]
      if (!nextRef) {
        return
      }

      setImageFocus(nextRef.packageId, nextRef.imageIndex)
    },
    [
      activePackage,
      focusByPackage,
      fullscreenActive,
      mode,
      orderedRootScopedImageRefs,
      setImageFocus,
      setVectorFocusIndex,
      vectorFocusIndex,
      vectorResultsActive,
      vectorSearchResults,
    ],
  )

  const moveImageVertical = useCallback(
    (direction: 'up' | 'down') => {
      if (mode !== 'image') {
        return
      }

      if (vectorResultsActive) {
        if (vectorSearchResults.length === 0) {
          return
        }

        const step = showNamesOnly ? 1 : Math.max(1, thumbnailColumns)
        const currentIndex = clamp(vectorFocusIndex, 0, vectorSearchResults.length - 1)
        const candidate = direction === 'up' ? currentIndex - step : currentIndex + step
        const nextIndex = clamp(candidate, 0, vectorSearchResults.length - 1)
        const nextRef = vectorSearchResults[nextIndex]
        if (!nextRef) {
          return
        }

        setVectorFocusIndex(nextIndex)
        setImageFocus(nextRef.packageId, nextRef.imageIndex)
        return
      }

      if (!activePackage) {
        return
      }

      const step = showNamesOnly ? 1 : Math.max(1, thumbnailColumns)
      const current = focusByPackage[activePackage.id] ?? 0
      const candidate = direction === 'up' ? current - step : current + step

      if (candidate < 0) {
        setImageFocus(activePackage.id, 0)
        return
      }

      if (candidate >= activePackage.images.length) {
        setImageFocus(activePackage.id, activePackage.images.length - 1)
        return
      }

      setImageFocus(activePackage.id, candidate)
    },
    [
      activePackage,
      focusByPackage,
      mode,
      setImageFocus,
      setVectorFocusIndex,
      showNamesOnly,
      thumbnailColumns,
      vectorFocusIndex,
      vectorResultsActive,
      vectorSearchResults,
    ],
  )

  const jumpImageBoundary = useCallback(
    (target: 'first' | 'last') => {
      if (mode !== 'image') {
        return
      }

      if (vectorResultsActive) {
        if (vectorSearchResults.length === 0) {
          return
        }

        const nextIndex = target === 'first' ? 0 : vectorSearchResults.length - 1
        const nextRef = vectorSearchResults[nextIndex]
        if (!nextRef) {
          return
        }

        setVectorFocusIndex(nextIndex)
        setImageFocus(nextRef.packageId, nextRef.imageIndex)
        return
      }

      if (!activePackage) {
        return
      }

      const nextIndex = target === 'first' ? 0 : activePackage.images.length - 1
      setImageFocus(activePackage.id, nextIndex)
    },
    [activePackage, mode, setImageFocus, setVectorFocusIndex, vectorResultsActive, vectorSearchResults],
  )

  const goPackage = useCallback(
    (delta: number) => {
      if (mode !== 'image' || vectorResultsActive) {
        return
      }

      if (orderedRootScopedPackages.length === 0) {
        return
      }

      const currentIndexInList = orderedRootScopedPackages.findIndex((pkg) => pkg.id === selectedPackageId)
      const safeCurrent = currentIndexInList >= 0 ? currentIndexInList : 0
      const nextIndex = clamp(safeCurrent + delta, 0, orderedRootScopedPackages.length - 1)
      const nextPackage = orderedRootScopedPackages[nextIndex]
      if (!nextPackage) {
        return
      }

      setSelectedPackageId(nextPackage.id)
    },
    [mode, orderedRootScopedPackages, selectedPackageId, setSelectedPackageId, vectorResultsActive],
  )

  const setPackageGrade = useCallback(
    (grade: number | null) => {
      if (mode !== 'image' || !metadataImagePackage) {
        return
      }

      setGradeByPackage((previous) => ({
        ...previous,
        [metadataImagePackage.id]: grade,
      }))
    },
    [metadataImagePackage, mode, setGradeByPackage],
  )

  const goPrevPage = useCallback(() => {
    if (showNamesOnly) {
      return
    }

    if (vectorResultsActive) {
      setVectorPage((value) => clamp(value - 1, 0, imageTotalPages - 1))
      return
    }

    setPageByPackage((previous) => ({
      ...previous,
      [selectedPackageId]: clamp((previous[selectedPackageId] ?? 0) - 1, 0, imageTotalPages - 1),
    }))
  }, [imageTotalPages, selectedPackageId, setPageByPackage, setVectorPage, showNamesOnly, vectorResultsActive])

  const goNextPage = useCallback(() => {
    if (showNamesOnly) {
      return
    }

    if (vectorResultsActive) {
      setVectorPage((value) => clamp(value + 1, 0, imageTotalPages - 1))
      return
    }

    setPageByPackage((previous) => ({
      ...previous,
      [selectedPackageId]: clamp((previous[selectedPackageId] ?? 0) + 1, 0, imageTotalPages - 1),
    }))
  }, [imageTotalPages, selectedPackageId, setPageByPackage, setVectorPage, showNamesOnly, vectorResultsActive])

  return {
    activePackage,
    focusedRef,
    focusedImage,
    focusedImagePackage,
    metadataImagePackage,
    currentGrade,
    visibleImageRefs,
    imageTotalPages,
    normalizedPageIndex,
    pageStart,
    refsInPage,
    setImageFocus,
    moveImage,
    moveImageVertical,
    jumpImageBoundary,
    goPackage,
    setPackageGrade,
    goPrevPage,
    goNextPage,
  }
}
