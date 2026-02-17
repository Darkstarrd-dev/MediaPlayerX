import { useEffect, useMemo, useRef, useState, type RefObject, type WheelEvent as ReactWheelEvent } from 'react'

import { MainUiIcon } from './MainUiIcon'
import { ToolbarTitleMarquee } from './ToolbarTitleMarquee'
import { VideoControlIcon } from './VideoControlIcon'
import { mapMediaLocatorToDto, mediaLocatorFileName } from '../features/backend'
import { useManageImageSelectionInteractions } from '../features/management/useManageImageSelectionInteractions'
import type { ParsedExternalMetadata } from '../features/metadata/parseExternalMetadata'
import { buildA11yPropsByRegistry } from '../i18n/a11y'
import { useI18n } from '../i18n/useI18n'
import type { FocusedImageRef, ImagePackage, VectorCandidate } from '../types'
import {
  type ThumbnailGridSession,
  buildThumbnailGridSession,
  collectSessionImageUrls,
  isEqualRecord,
  preloadSessionImageUrls,
  resolveImageIdForRef,
} from './imageMainSectionPreload'
import MetadataFetchPanel from './metadata/MetadataFetchPanel'

const IS_TEST_MODE = import.meta.env.MODE === 'test'
const EMPTY_IMAGE_ID_SET = new Set<string>()

interface ImageMainSectionProps {
  vectorMode: boolean
  showNamesOnly: boolean
  metadataManageMode: boolean
  thumbnailScaleLevel?: number
  thumbnailScaleLevelCount?: number
  canThumbnailScaleDown?: boolean
  canThumbnailScaleUp?: boolean
  loading: boolean
  placeholderCount: number
  enableLoadingSkeleton: boolean
  activePackage: ImagePackage | null
  focusedRef: FocusedImageRef | null
  focusedImageExists: boolean
  visibleImageRefs: FocusedImageRef[]
  refsInPage: FocusedImageRef[]
  pageStart: number
  actualCellWidth: number
  actualMediaHeight: number
  thumbnailColumns: number
  thumbnailGap: number
  vectorCandidates: VectorCandidate[]
  packageById: Map<string, ImagePackage>
  imageUrlById: Record<string, string>
  gridRef: RefObject<HTMLDivElement | null>
  onGridElementChange: (element: HTMLDivElement | null) => void
  onToggleShowNamesOnly: () => void
  onEnterFullscreen: () => void
  canJumpToAnimation: boolean
  canJumpToMusic?: boolean
  canJumpToMusicFromBooklet?: boolean
  onJumpToAnimation: () => void
  onJumpToMusic?: () => void
  onJumpToMusicFromBooklet?: () => void
  onSelectImage: (packageId: string, imageIndex: number, absoluteIndex: number) => void
  metadataPending: boolean
  metadataTargetPackageLabel: string
  metadataFetchDefaultText: string
  metadataProxyServer: string
  metadataEhentaiCookies: string
  onMetadataSyncName: () => void
  onMetadataSaveParsed: (parsed: ParsedExternalMetadata) => Promise<void>
  manageMode: boolean
  sidebarSelectedCount: number
  imageSelectedCount: number
  activeSelectionScope: 'sidebar' | 'image' | null
  pendingManageAction: boolean
  manageOperationHint: string | null
  canManageDelete: boolean
  canManageMoveNodes?: boolean
  canManageHide: boolean
  canManageUnhide: boolean
  adReviewFeatureEnabled: boolean
  adReviewDeletePending?: boolean
  adReviewPanelOpen: boolean
  checkedImageIds: ReadonlySet<string>
  adReviewScopeImageIds: ReadonlySet<string>
  adReviewLlmReviewedImageIds: ReadonlySet<string>
  adReviewNonLlmReviewedImageIds: ReadonlySet<string>
  adReviewCandidateImageIds?: ReadonlySet<string>
  adReviewResultsMode?: boolean
  adReviewGroupByPackageRows?: boolean
  onToggleImageChecked: (imageId: string, checked?: boolean) => void
  onReplaceCheckedImages: (imageIds: string[], append?: boolean) => void
  onManageDelete: () => void
  onManageGroup?: () => void
  onManageMove?: () => void
  onManageHide: () => void
  onManageUnhide: () => void
  onToggleAdReviewPanel: () => void
  onClearManageSelection: () => void
  onThumbnailScaleLevelChange?: (level: number) => void
  nodeBrowseMode?: boolean
  nodeBrowseLabel?: string
  nodeBrowseItems?: Array<{
    nodeId: string
    imageSourceId?: string
    imageNodeType: 'folder' | 'package' | 'directory'
    label: string
    packageCount: number
    imageCount: number
    descendantNodeCount: number
    coverImageUrl: string | null
  }>
  onSelectNodeBrowseItem?: (nodeId: string, imageSourceId?: string) => void
  onThumbnailWheelTurnPage?: (direction: 'next' | 'prev') => void
  onThumbnailWheelSwitchSidebarNode?: (direction: 'next' | 'prev') => void
}

function ImageMainSection({
  vectorMode,
  showNamesOnly,
  metadataManageMode,
  thumbnailScaleLevel = 1,
  thumbnailScaleLevelCount = 9,
  canThumbnailScaleDown = true,
  canThumbnailScaleUp = true,
  loading,
  placeholderCount,
  enableLoadingSkeleton,
  activePackage,
  focusedRef,
  focusedImageExists,
  visibleImageRefs,
  refsInPage,
  pageStart,
  actualCellWidth,
  actualMediaHeight: _actualMediaHeight,
  thumbnailColumns,
  thumbnailGap,
  vectorCandidates,
  packageById,
  imageUrlById,
  gridRef,
  onGridElementChange,
  manageMode,
  sidebarSelectedCount,
  imageSelectedCount,
  activeSelectionScope,
  pendingManageAction,
  manageOperationHint,
  canManageDelete,
  canManageMoveNodes = false,
  canManageHide,
  canManageUnhide,
  adReviewFeatureEnabled,
  adReviewDeletePending = false,
  adReviewPanelOpen,
  checkedImageIds,
  adReviewScopeImageIds: _adReviewScopeImageIds,
  adReviewLlmReviewedImageIds: _adReviewLlmReviewedImageIds,
  adReviewNonLlmReviewedImageIds: _adReviewNonLlmReviewedImageIds,
  adReviewCandidateImageIds = EMPTY_IMAGE_ID_SET,
  adReviewResultsMode = false,
  adReviewGroupByPackageRows = false,
  onToggleImageChecked,
  onReplaceCheckedImages,
  onManageDelete,
  onManageGroup = () => undefined,
  onManageHide,
  onManageUnhide,
  onToggleAdReviewPanel,
  onClearManageSelection,
  onThumbnailScaleLevelChange,
  onToggleShowNamesOnly,
  onEnterFullscreen,
  canJumpToAnimation,
  canJumpToMusic = false,
  canJumpToMusicFromBooklet = false,
  onJumpToAnimation,
  onJumpToMusic = () => undefined,
  onJumpToMusicFromBooklet = () => undefined,
  onSelectImage,
  metadataPending,
  metadataTargetPackageLabel,
  metadataFetchDefaultText,
  metadataProxyServer,
  metadataEhentaiCookies,
  onMetadataSyncName,
  onMetadataSaveParsed,
  nodeBrowseMode = false,
  nodeBrowseLabel = '',
  nodeBrowseItems = [],
  onSelectNodeBrowseItem,
  onThumbnailWheelTurnPage,
  onThumbnailWheelSwitchSidebarNode,
}: ImageMainSectionProps) {
  const markThumbInputMouse = () => {
    document.documentElement.dataset.mpxThumbInput = 'mouse'
  }

  const thumbOriginRafRef = useRef<number | null>(null)
  const lastOriginElRef = useRef<HTMLElement | null>(null)

  const scrollFocusedThumbIntoView = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return
    }
    const thumbCard = target.closest('.thumb-card')
    if (!(thumbCard instanceof HTMLElement)) {
      return
    }
    thumbCard.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' })
  }

  const syncFocusedThumbTransformOrigin = () => {
    const container = gridRef.current
    if (!container) {
      return
    }

    const focusedThumb = container.querySelector('.thumb-card.is-focused')
    if (!(focusedThumb instanceof HTMLElement)) {
      if (lastOriginElRef.current) {
        lastOriginElRef.current.style.removeProperty('--mpx-thumb-origin-x')
        lastOriginElRef.current.style.removeProperty('--mpx-thumb-origin-y')
        lastOriginElRef.current = null
      }
      return
    }

    const containerRect = container.getBoundingClientRect()
    const rect = focusedThumb.getBoundingClientRect()
    const scale = 1.1
    const halo = 22
    const needX = ((rect.width * (scale - 1)) / 2) + halo
    const needY = ((rect.height * (scale - 1)) / 2) + halo

    const leftSpace = rect.left - containerRect.left
    const rightSpace = containerRect.right - rect.right
    const topSpace = rect.top - containerRect.top
    const bottomSpace = containerRect.bottom - rect.bottom

    let originX = '50%'
    if (leftSpace < needX && rightSpace >= needX) {
      originX = '0%'
    } else if (rightSpace < needX && leftSpace >= needX) {
      originX = '100%'
    } else if (leftSpace < needX && rightSpace < needX) {
      originX = leftSpace >= rightSpace ? '100%' : '0%'
    }

    let originY = '50%'
    if (topSpace < needY && bottomSpace >= needY) {
      originY = '0%'
    } else if (bottomSpace < needY && topSpace >= needY) {
      originY = '100%'
    } else if (topSpace < needY && bottomSpace < needY) {
      originY = topSpace >= bottomSpace ? '100%' : '0%'
    }

    focusedThumb.style.setProperty('--mpx-thumb-origin-x', originX)
    focusedThumb.style.setProperty('--mpx-thumb-origin-y', originY)

    if (lastOriginElRef.current && lastOriginElRef.current !== focusedThumb) {
      lastOriginElRef.current.style.removeProperty('--mpx-thumb-origin-x')
      lastOriginElRef.current.style.removeProperty('--mpx-thumb-origin-y')
    }
    lastOriginElRef.current = focusedThumb
  }

  const scheduleFocusedThumbOriginSync = () => {
    if (thumbOriginRafRef.current != null) {
      return
    }
    thumbOriginRafRef.current = window.requestAnimationFrame(() => {
      thumbOriginRafRef.current = null
      syncFocusedThumbTransformOrigin()
    })
  }
  const { t } = useI18n()
  void _adReviewScopeImageIds
  void _adReviewLlmReviewedImageIds
  void _adReviewNonLlmReviewedImageIds
  const [metadataFetchOpen, setMetadataFetchOpen] = useState(false)
  const [openScalePopover, setOpenScalePopover] = useState(false)
  const [scaleDraftValue, setScaleDraftValue] = useState(
    Math.max(1, Math.min(thumbnailScaleLevelCount, Math.round(thumbnailScaleLevel))),
  )
  const [nameListDimsById, setNameListDimsById] = useState<Record<string, { width: number; height: number }>>({})
  const nameListDimsLoadingRef = useRef<Set<string>>(new Set())
  const [nameListBodyEl, setNameListBodyEl] = useState<HTMLDivElement | null>(null)
  const [nameListRange, setNameListRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 })
  const scalePopoverHideTimerRef = useRef<number | null>(null)

  const scaleLevel = Math.max(1, Math.min(thumbnailScaleLevelCount, Math.round(thumbnailScaleLevel)))

  useEffect(() => {
    setScaleDraftValue(scaleLevel)
  }, [scaleLevel])

  useEffect(() => {
    if (!showNamesOnly) {
      return
    }

    const body = nameListBodyEl
    if (!body) {
      return
    }

    let rafId: number | null = null
    const bufferRows = 6

    const compute = () => {
      const row = body.querySelector('.name-list-row')
      const rowHeight = row instanceof HTMLElement ? (row.getBoundingClientRect().height || 42) : 42
      const totalRows = visibleImageRefs.length
      const scrollTop = body.scrollTop
      const viewportHeight = body.clientHeight
      const visibleCount = Math.ceil(viewportHeight / Math.max(1, rowHeight))
      const start = Math.max(0, Math.floor(scrollTop / Math.max(1, rowHeight)) - bufferRows)
      const end = Math.min(totalRows, start + visibleCount + bufferRows * 2)

      setNameListRange((previous) => {
        if (previous.start === start && previous.end === end) {
          return previous
        }
        return { start, end }
      })
    }

    const schedule = () => {
      if (rafId != null) {
        return
      }
      rafId = window.requestAnimationFrame(() => {
        rafId = null
        compute()
      })
    }

    schedule()
    body.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      body.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (rafId != null) {
        window.cancelAnimationFrame(rafId)
      }
    }
  }, [nameListBodyEl, showNamesOnly, visibleImageRefs.length])

  useEffect(() => {
    // Keep focused thumbnail fully visible when navigating via keyboard,
    // so the focus ring / glow won't get clipped by the scroll viewport.
    if (document.documentElement.dataset.mpxThumbInput !== 'keyboard') {
      return
    }

    const container = gridRef.current
    if (!container) {
      return
    }

    const focusedThumb = container.querySelector('.thumb-card.is-focused')
    if (!(focusedThumb instanceof HTMLElement)) {
      return
    }

    focusedThumb.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' })
    scheduleFocusedThumbOriginSync()
  }, [focusedRef?.packageId, focusedRef?.imageIndex])

  useEffect(() => {
    if (IS_TEST_MODE) {
      return
    }

    const container = gridRef.current
    const handle = () => scheduleFocusedThumbOriginSync()
    if (container) {
      container.addEventListener('scroll', handle, { passive: true })
    }
    window.addEventListener('resize', handle)

    scheduleFocusedThumbOriginSync()
    return () => {
      if (container) {
        container.removeEventListener('scroll', handle)
      }
      window.removeEventListener('resize', handle)
      if (thumbOriginRafRef.current != null) {
        window.cancelAnimationFrame(thumbOriginRafRef.current)
        thumbOriginRafRef.current = null
      }
    }
  }, [nodeBrowseMode, showNamesOnly])

  useEffect(() => {
    if (IS_TEST_MODE) {
      return
    }
    scheduleFocusedThumbOriginSync()
  }, [focusedRef?.packageId, focusedRef?.imageIndex])

  const clearScalePopoverHideTimer = () => {
    if (scalePopoverHideTimerRef.current != null) {
      window.clearTimeout(scalePopoverHideTimerRef.current)
      scalePopoverHideTimerRef.current = null
    }
  }

  const openScalePopoverByHover = () => {
    clearScalePopoverHideTimer()
    setOpenScalePopover(true)
  }

  const closeScalePopoverByHover = () => {
    clearScalePopoverHideTimer()
    scalePopoverHideTimerRef.current = window.setTimeout(() => {
      setOpenScalePopover(false)
      scalePopoverHideTimerRef.current = null
    }, 140)
  }

  useEffect(
    () => () => {
      clearScalePopoverHideTimer()
    },
    [],
  )

  const initialThumbnailSession =
    !showNamesOnly && !nodeBrowseMode
      ? buildThumbnailGridSession({
          refsInPage,
          packageById,
          actualCellWidth,
          actualMediaHeight: _actualMediaHeight,
          thumbnailColumns,
          thumbnailGap,
        })
      : null
  const initialThumbnailUrls = initialThumbnailSession
    ? collectSessionImageUrls(initialThumbnailSession, imageUrlById)
    : null

  const [bufferedRefsInPage, setBufferedRefsInPage] = useState<FocusedImageRef[]>(() => {
    if (initialThumbnailSession && initialThumbnailUrls) {
      return initialThumbnailSession.refs
    }
    return []
  })
  const [bufferedThumbnailSessionKey, setBufferedThumbnailSessionKey] = useState<string | null>(() => {
    if (initialThumbnailSession && initialThumbnailUrls) {
      return initialThumbnailSession.key
    }
    return null
  })
  const [bufferedImageUrlById, setBufferedImageUrlById] = useState<Record<string, string>>(() => {
    if (initialThumbnailUrls) {
      return initialThumbnailUrls
    }
    return {}
  })
  const [pendingThumbnailSession, setPendingThumbnailSession] = useState<ThumbnailGridSession | null>(() => {
    if (initialThumbnailSession && !initialThumbnailUrls) {
      return initialThumbnailSession
    }
    return null
  })
  const pendingDecodeSequenceRef = useRef(0)

  const thumbnailGridSession = useMemo(
    () =>
      buildThumbnailGridSession({
        refsInPage,
        packageById,
        actualCellWidth,
        actualMediaHeight: _actualMediaHeight,
        thumbnailColumns,
        thumbnailGap,
      }),
    [
      _actualMediaHeight,
      actualCellWidth,
      packageById,
      refsInPage,
      thumbnailColumns,
      thumbnailGap,
    ],
  )

  useEffect(() => {
    if (nodeBrowseMode) {
      setPendingThumbnailSession(null)
      setBufferedRefsInPage(refsInPage)
      setBufferedThumbnailSessionKey(null)
      setBufferedImageUrlById((previous) => (isEqualRecord(previous, imageUrlById) ? previous : imageUrlById))
      return
    }

    if (showNamesOnly) {
      setPendingThumbnailSession(null)
      return
    }

    if (!thumbnailGridSession) {
      setPendingThumbnailSession(null)
      setBufferedRefsInPage([])
      setBufferedThumbnailSessionKey(null)
      setBufferedImageUrlById((previous) => (Object.keys(previous).length === 0 ? previous : {}))
      return
    }

    const readyUrls = collectSessionImageUrls(thumbnailGridSession, imageUrlById)

    if (bufferedThumbnailSessionKey === thumbnailGridSession.key) {
      if (readyUrls) {
        setBufferedRefsInPage(thumbnailGridSession.refs)
        setBufferedImageUrlById((previous) => (isEqualRecord(previous, readyUrls) ? previous : readyUrls))
        setPendingThumbnailSession(null)
        return
      }

      setPendingThumbnailSession(thumbnailGridSession)
      return
    }

    setPendingThumbnailSession((previous) => {
      if (previous?.key === thumbnailGridSession.key) {
        return previous
      }
      return thumbnailGridSession
    })
  }, [
    bufferedThumbnailSessionKey,
    imageUrlById,
    nodeBrowseMode,
    refsInPage,
    showNamesOnly,
    thumbnailGridSession,
  ])

  useEffect(() => {
    if (!pendingThumbnailSession) {
      return
    }

    const readyUrls = collectSessionImageUrls(pendingThumbnailSession, imageUrlById)
    if (!readyUrls) {
      return
    }

    if (IS_TEST_MODE) {
      setPendingThumbnailSession(null)
      setBufferedThumbnailSessionKey(pendingThumbnailSession.key)
      setBufferedRefsInPage(pendingThumbnailSession.refs)
      setBufferedImageUrlById((previous) => (isEqualRecord(previous, readyUrls) ? previous : readyUrls))
      return
    }

    pendingDecodeSequenceRef.current += 1
    const sequence = pendingDecodeSequenceRef.current
    let cancelled = false

    void preloadSessionImageUrls(readyUrls)
      .catch(() => undefined)
      .then(() => {
        if (cancelled || pendingDecodeSequenceRef.current !== sequence) {
          return
        }

        setPendingThumbnailSession(null)
        setBufferedThumbnailSessionKey(pendingThumbnailSession.key)
        setBufferedRefsInPage(pendingThumbnailSession.refs)
        setBufferedImageUrlById((previous) => (isEqualRecord(previous, readyUrls) ? previous : readyUrls))
      })

    return () => {
      cancelled = true
    }
  }, [imageUrlById, pendingThumbnailSession])

  const thumbnailBufferPending = !showNamesOnly && !nodeBrowseMode && pendingThumbnailSession !== null
  const refsInPageForRender = showNamesOnly || nodeBrowseMode ? refsInPage : bufferedRefsInPage
  const imageUrlByIdForRender = showNamesOnly || nodeBrowseMode ? imageUrlById : bufferedImageUrlById
  const hasRenderableThumbnailBatch =
    !showNamesOnly &&
    !nodeBrowseMode &&
    refsInPageForRender.length > 0 &&
    refsInPageForRender.every((ref) => {
      const imageId = resolveImageIdForRef(packageById, ref)
      return Boolean(imageId && imageUrlByIdForRender[imageId])
    })
  const isThumbnailInteractionLocked = !showNamesOnly && !nodeBrowseMode && thumbnailBufferPending
  const showSkeleton =
    !showNamesOnly &&
    !nodeBrowseMode &&
    enableLoadingSkeleton &&
    (!hasRenderableThumbnailBatch && (thumbnailBufferPending || (loading && refsInPageForRender.length === 0)))
  const skeletonCount = Math.max(1, thumbnailBufferPending ? (pendingThumbnailSession?.refs.length ?? placeholderCount) : placeholderCount)

  useEffect(() => {
    onGridElementChange(gridRef.current)
    return () => {
      onGridElementChange(null)
    }
  }, [gridRef, nodeBrowseMode, onGridElementChange, showNamesOnly])

  useEffect(() => {
    if (!showNamesOnly) {
      return
    }

    if (IS_TEST_MODE) {
      return
    }

    const api = window.mediaPlayerBackend
    if (!api?.readImageMetadata) {
      return
    }

    const canResolveOriginal = typeof api.resolveMediaResource === 'function'

    let cancelled = false
    const maxConcurrent = 2

    const itemsToLoad: Array<{ imageId: string; packageId: string; imageIndex: number; locatorDto: ReturnType<typeof mapMediaLocatorToDto> }> = []
    const startIndex = Math.max(0, nameListRange.start)
    const endIndex = Math.min(visibleImageRefs.length, Math.max(nameListRange.end, startIndex))
    for (let index = startIndex; index < endIndex; index += 1) {
      const ref = visibleImageRefs[index]
      const pkg = packageById.get(ref.packageId)
      const image = pkg?.images[ref.imageIndex]
      if (!image) {
        continue
      }

      const existing = nameListDimsById[image.id]
      const width = existing?.width ?? image.width
      const height = existing?.height ?? image.height
      if (width > 0 && height > 0) {
        continue
      }

      if (nameListDimsLoadingRef.current.has(image.id)) {
        continue
      }

      nameListDimsLoadingRef.current.add(image.id)
      itemsToLoad.push({
        imageId: image.id,
        packageId: ref.packageId,
        imageIndex: ref.imageIndex,
        locatorDto: mapMediaLocatorToDto(image.mediaLocator),
      })
    }

    if (itemsToLoad.length === 0) {
      return
    }

    const loadDimsFromUrl = (url: string): Promise<{ width: number; height: number } | null> => {
      return new Promise((resolve) => {
        const img = new Image()
        img.decoding = 'async'
        img.loading = 'eager'
        img.onload = () => {
          const width = img.naturalWidth || img.width || 0
          const height = img.naturalHeight || img.height || 0
          resolve(width > 0 && height > 0 ? { width, height } : null)
        }
        img.onerror = () => resolve(null)
        img.src = url
      })
    }

    let cursor = 0
    const workers = Array.from({ length: Math.min(maxConcurrent, itemsToLoad.length) }, async () => {
      while (!cancelled) {
        const index = cursor
        cursor += 1
        const next = itemsToLoad[index]
        if (!next) {
          return
        }

        try {
          const response = await api.readImageMetadata({
            package_id: next.packageId,
            image_index: next.imageIndex,
            include_hidden: manageMode,
          })
          const width = response?.image?.width ?? 0
          const height = response?.image?.height ?? 0
          if (!cancelled && width > 0 && height > 0) {
            setNameListDimsById((previous) => {
              if (previous[next.imageId]) {
                return previous
              }
              return { ...previous, [next.imageId]: { width, height } }
            })
            continue
          }

          if (!cancelled && canResolveOriginal) {
            const resource = await api.resolveMediaResource({ locator: next.locatorDto, preferred_variant: 'original' })
            const dims = resource?.resource_url ? await loadDimsFromUrl(resource.resource_url) : null
            if (!cancelled && dims) {
              setNameListDimsById((previous) => {
                if (previous[next.imageId]) {
                  return previous
                }
                return { ...previous, [next.imageId]: dims }
              })
            }
          }
        } catch {
          // ignore
        } finally {
          nameListDimsLoadingRef.current.delete(next.imageId)
        }
      }
    })

    void Promise.all(workers)
    return () => {
      cancelled = true
      for (const item of itemsToLoad) {
        nameListDimsLoadingRef.current.delete(item.imageId)
      }
    }
  }, [manageMode, nameListDimsById, nameListRange.end, nameListRange.start, packageById, showNamesOnly, visibleImageRefs])

  const { marqueeStyle, startMarqueeSelection, startThumbnailDragToggle } = useManageImageSelectionInteractions({
    manageMode,
    onReplaceCheckedImages,
    onToggleImageChecked,
    onSelectImage,
    focusOnFirstToggle: !adReviewResultsMode,
  })

  const manageSummary =
    activeSelectionScope === 'sidebar'
      ? t('a11y.manage.selectedSidebarNodes', { count: sidebarSelectedCount })
      : activeSelectionScope === 'image'
        ? t('a11y.manage.selectedMediaItems', { count: imageSelectedCount })
        : t('a11y.manage.noSelection')

  const currentThumbnailPageImageIds = useMemo(() => {
    if (!manageMode) {
      return []
    }

    const ids: string[] = []
    for (const ref of refsInPage) {
      const imageId = resolveImageIdForRef(packageById, ref)
      if (imageId) {
        ids.push(imageId)
      }
    }
    return ids
  }, [manageMode, packageById, refsInPage])
  const hasCurrentThumbnailPage = currentThumbnailPageImageIds.length > 0
  const hasAnyManageSelection = sidebarSelectedCount > 0 || imageSelectedCount > 0

  const activePackageImageProgress = (() => {
    if (!activePackage || activePackage.images.length === 0) {
      return null
    }

    const total = activePackage.images.length

    if (focusedRef?.packageId === activePackage.id) {
      const current = Math.max(1, Math.min(total, focusedRef.imageIndex + 1))
      return `${current}/${total}`
    }

    const firstInPage = refsInPage.find((ref) => ref.packageId === activePackage.id)
    if (firstInPage) {
      const current = Math.max(1, Math.min(total, firstInPage.imageIndex + 1))
      return `${current}/${total}`
    }

    const firstVisible = visibleImageRefs.find((ref) => ref.packageId === activePackage.id)
    if (firstVisible) {
      const current = Math.max(1, Math.min(total, firstVisible.imageIndex + 1))
      return `${current}/${total}`
    }

    return `1/${total}`
  })()

  const browseToolbarTitle = nodeBrowseMode
    ? t('ui.image.nodeBrowseSummary', {
        label: nodeBrowseLabel || t('ui.image.nodeBrowseDefaultLabel'),
        count: nodeBrowseItems.length,
      })
    : vectorMode
      ? t('ui.image.searchResultsView')
      : t('ui.image.packageProgressSummary', {
          packageName: activePackage?.displayName ?? t('ui.image.noPackage'),
          progress: activePackageImageProgress ?? t('ui.image.defaultProgress'),
        })

  const handleThumbnailContainerWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || event.deltaY === 0) {
      return
    }

    const direction: 'next' | 'prev' = event.deltaY > 0 ? 'next' : 'prev'
    event.preventDefault()

    if (event.ctrlKey) {
      onThumbnailWheelSwitchSidebarNode?.(direction)
      return
    }

    onThumbnailWheelTurnPage?.(direction)
  }

  return (
    <>
      <div className="main-toolbar">
        {manageMode ? (
          <>
            <div className="toolbar-actions toolbar-actions-manage">
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={hasAnyManageSelection ? t('a11y.common.clearSelection') : t('a11y.media.selectAllPage')}
                title={hasAnyManageSelection ? t('tip.common.clearSelection') : t('tip.media.selectAllPage')}
                disabled={pendingManageAction || (!hasAnyManageSelection && !hasCurrentThumbnailPage)}
                onClick={
                  hasAnyManageSelection
                    ? onClearManageSelection
                    : () => onReplaceCheckedImages(currentThumbnailPageImageIds)
                }
              >
                <MainUiIcon name={hasAnyManageSelection ? 'unselectAll' : 'selectAll'} />
              </button>
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={t('a11y.common.hide')}
                title={t('tip.common.hide')}
                disabled={!canManageHide || pendingManageAction}
                onClick={onManageHide}
              >
                <MainUiIcon name="hidden" />
              </button>
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={t('a11y.common.unhide')}
                title={t('tip.common.unhide')}
                disabled={!canManageUnhide || pendingManageAction}
                onClick={onManageUnhide}
              >
                <MainUiIcon name="reveal" />
              </button>
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={t('a11y.common.organize')}
                title={t('tip.common.organize')}
                disabled={!canManageMoveNodes || pendingManageAction}
                onClick={onManageGroup}
              >
                <MainUiIcon name="organize" />
              </button>
              <button
                className={`vector-search-btn main-icon-square-btn ${adReviewDeletePending ? 'is-pending' : ''}`}
                type="button"
                aria-label={adReviewDeletePending ? t('ui.manage.deleting') : t('a11y.common.delete')}
                title={adReviewDeletePending ? t('ui.manage.deleting') : t('tip.common.delete')}
                disabled={!canManageDelete || pendingManageAction}
                onClick={onManageDelete}
              >
                <MainUiIcon name="delete" />
              </button>
              {adReviewFeatureEnabled ? (
                <button
                  className={`feature-action-btn main-icon-square-btn ${adReviewPanelOpen ? 'is-active' : ''}`}
                  type="button"
                  aria-label={t('a11y.manage.adReview')}
                  title={t('tip.manage.adReview')}
                  disabled={pendingManageAction}
                  onClick={onToggleAdReviewPanel}
                >
                  <MainUiIcon name="adSearch" />
                </button>
              ) : null}
              {manageOperationHint ? <span className="main-toolbar-hint">{manageOperationHint}</span> : null}
            </div>
            <strong className="main-toolbar-summary" title={manageSummary}>
              {manageSummary}
            </strong>
          </>
        ) : metadataManageMode ? (
          <>
            <strong className="main-toolbar-title">{t('ui.header.metadataManage')}</strong>
            <div className="toolbar-actions toolbar-actions-manage">
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={t('a11y.common.syncName')}
                title={t('tip.common.syncName')}
                disabled={metadataPending}
                onClick={onMetadataSyncName}
              >
                <MainUiIcon name="refresh" />
              </button>
              <button
                className="feature-action-btn main-icon-square-btn"
                type="button"
                aria-label={t('a11y.metadata.fetch')}
                title={t('a11y.metadata.fetch')}
                onClick={() => setMetadataFetchOpen(true)}
              >
                <MainUiIcon name="getMetaData" />
              </button>
              {manageOperationHint ? <span className="main-toolbar-hint">{manageOperationHint}</span> : null}
            </div>
          </>
        ) : (
          <>
            <ToolbarTitleMarquee text={browseToolbarTitle} />
            <div className="toolbar-actions toolbar-actions-image-mode">
              <div className="toolbar-actions toolbar-actions-image-primary">
                <button
                  className={`toolbar-icon-btn ${showNamesOnly ? 'is-names-mode' : 'is-grid-mode'}`}
                  type="button"
                  aria-label={showNamesOnly ? t('a11y.image.switchToGridMode') : t('a11y.image.switchToNamesMode')}
                  title={showNamesOnly ? t('tip.image.switchToGridMode') : t('tip.image.switchToNamesMode')}
                  onClick={onToggleShowNamesOnly}
                >
                  <MainUiIcon name={showNamesOnly ? 'thumbnail' : 'fileList'} />
                </button>
                <div
                  className={`header-popover-control main-toolbar-scale-control ${openScalePopover ? 'is-open' : ''}`}
                  role="group"
                  aria-label={t('a11y.header.thumbnailScaleGroup')}
                  onMouseEnter={openScalePopoverByHover}
                  onMouseLeave={closeScalePopoverByHover}
                >
                  <button
                    {...buildA11yPropsByRegistry({ key: 'headerThumbnailScale', t })}
                    className="toolbar-icon-btn header-popover-trigger"
                    disabled={!canThumbnailScaleDown && !canThumbnailScaleUp}
                    type="button"
                  >
                    <svg aria-hidden="true" className="main-ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                      <path d="M11 8v6" />
                      <path d="M8 11h6" />
                    </svg>
                  </button>

                  <div
                    className="header-popover-panel"
                    hidden={!openScalePopover}
                    role="dialog"
                    aria-label={t('a11y.header.scaleSettings')}
                  >
                    <div className="header-vertical-slider" role="group" aria-label={t('a11y.header.scaleLevels')}>
                      <div className="header-vertical-slider-value">
                        {Math.max(1, Math.min(thumbnailScaleLevelCount, Math.round(scaleDraftValue)))}
                      </div>
                      <div className="header-vertical-slider-body">
                        <input
                          {...buildA11yPropsByRegistry({ key: 'headerScaleSlider', t })}
                          className="header-vertical-range"
                          max={thumbnailScaleLevelCount}
                          min={1}
                          step={0.01}
                          type="range"
                          value={scaleDraftValue}
                          onChange={(event) => {
                            const nextValue = Number(event.target.value)
                            setScaleDraftValue(nextValue)
                            const roundedLevel = Math.max(1, Math.min(thumbnailScaleLevelCount, Math.round(nextValue)))
                            onThumbnailScaleLevelChange?.(roundedLevel)
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  className="toolbar-icon-btn"
                  type="button"
                  aria-label={t('a11y.media.enterFullscreen')}
                  title={t('tip.media.enterFullscreen')}
                  onClick={onEnterFullscreen}
                  disabled={!focusedImageExists}
                >
                  <VideoControlIcon className="main-ui-icon" name="fullscreenExpand" />
                </button>
                {canJumpToMusicFromBooklet ? (
                  <button
                    className="toolbar-icon-btn"
                    type="button"
                    aria-label={t('a11y.media.music')}
                    title={t('tip.media.music')}
                    onClick={onJumpToMusicFromBooklet}
                  >
                    <MainUiIcon name="musicMode" />
                  </button>
                ) : null}
              </div>
              {canJumpToAnimation || (canJumpToMusic && !canJumpToMusicFromBooklet) ? (
                <div className="toolbar-actions toolbar-actions-series-jump">
                  {canJumpToAnimation ? (
                    <button
                      className="toolbar-icon-btn"
                      type="button"
                      aria-label={t('a11y.media.animation')}
                      title={t('tip.media.animation')}
                      onClick={onJumpToAnimation}
                    >
                      <MainUiIcon name="videoMode" />
                    </button>
                  ) : null}
                  {canJumpToMusic && !canJumpToMusicFromBooklet ? (
                    <button
                      className="toolbar-icon-btn"
                      type="button"
                      aria-label={t('a11y.media.music')}
                      title={t('tip.media.music')}
                      onClick={onJumpToMusic}
                    >
                      <MainUiIcon name="musicMode" />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>

      {nodeBrowseMode ? (
        <div
          className="image-grid node-browse-grid"
          ref={gridRef}
          onWheel={handleThumbnailContainerWheel}
          style={{
            gridTemplateColumns: `repeat(${thumbnailColumns}, ${actualCellWidth}px)`,
            gap: `${thumbnailGap}px`,
          }}
        >
          {nodeBrowseItems.map((item) => (
            <div key={item.nodeId} className="thumb-card" style={{ width: `${actualCellWidth}px` }}>
              <button
                className="thumb-card-main"
                type="button"
                onPointerDown={(event) => {
                  markThumbInputMouse()
                  scrollFocusedThumbIntoView(event.currentTarget)
                  scheduleFocusedThumbOriginSync()
                }}
                onClick={() => onSelectNodeBrowseItem?.(item.nodeId, item.imageSourceId)}
              >
                <div className="thumb-placeholder" style={{ aspectRatio: '1 / 1' }}>
                  <div className="thumb-media" style={{ width: '100%', height: '100%' }}>
                    {item.coverImageUrl ? (
                      <img
                        className="thumb-media-image"
                        src={item.coverImageUrl}
                        alt={item.label}
                        loading="lazy"
                        draggable={false}
                      />
                    ) : (
                      <div className="thumb-media-empty" />
                    )}
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      ) : showNamesOnly ? (
        <div className={`name-list ${manageMode ? 'is-manage' : ''}`} ref={gridRef}>
          <div className="name-list-header">
            <span>{t('ui.metadata.fileName')}</span>
            <span>{t('ui.image.fileSize')}</span>
            <span>{t('ui.image.resolution')}</span>
          </div>
          <div
            className="name-list-body"
            ref={setNameListBodyEl}
            onMouseDown={(event) => {
              startMarqueeSelection(event)
              startThumbnailDragToggle(event)
            }}
          >
            {visibleImageRefs.map((ref, absoluteIndex) => {
              const pkg = packageById.get(ref.packageId)
              const image = pkg?.images[ref.imageIndex]
              if (!pkg || !image) {
                return null
              }

               const fileName = mediaLocatorFileName(image.mediaLocator)
               const resolvedDims = nameListDimsById[image.id]
               const resolvedWidth = resolvedDims?.width ?? image.width
               const resolvedHeight = resolvedDims?.height ?? image.height
               const isFocused = focusedRef?.packageId === ref.packageId && focusedRef.imageIndex === ref.imageIndex
               const isChecked = checkedImageIds.has(image.id)
               const isAdReviewCandidate = adReviewCandidateImageIds.has(image.id)
               const isAdReviewExcluded = manageMode && isAdReviewCandidate && !isChecked
               return (
                <div
                  key={`${ref.packageId}-${ref.imageIndex}`}
                  data-manage-image-id={image.id}
                  data-manage-package-id={ref.packageId}
                  data-manage-image-index={String(ref.imageIndex)}
                  data-manage-absolute-index={String(absoluteIndex)}
                  className={`name-list-row ${manageMode ? 'is-manage' : ''} ${manageMode && isChecked ? 'is-selected' : ''} ${manageMode && image.hidden ? 'is-hidden' : ''} ${isFocused ? 'is-focused' : ''} ${isAdReviewExcluded ? 'is-ad-review-excluded' : ''}`}
                >
                  <button
                    className="name-list-row-main"
                    type="button"
                    onClick={!manageMode ? () => onSelectImage(ref.packageId, ref.imageIndex, absoluteIndex) : undefined}
                    onDoubleClick={!manageMode ? onEnterFullscreen : undefined}
                  >
                     <span>{`${manageMode && image.hidden ? `${t('ui.image.hiddenPrefix')} ` : ''}${fileName}`}</span>
                     <span>{`${image.sizeKb}KB`}</span>
                     <span>{resolvedWidth > 0 && resolvedHeight > 0 ? `${resolvedWidth} x ${resolvedHeight}` : '-'}</span>
                   </button>
                 </div>
               )
             })}
          </div>
        </div>
      ) : (
        <div
          className={`image-grid ${manageMode ? 'is-manage' : ''} ${isThumbnailInteractionLocked ? 'is-pending-swap' : ''}`}
          ref={gridRef}
          aria-busy={isThumbnailInteractionLocked || undefined}
          onWheel={handleThumbnailContainerWheel}
          onMouseDown={manageMode && !isThumbnailInteractionLocked ? startThumbnailDragToggle : undefined}
          style={{
            gridTemplateColumns: `repeat(${thumbnailColumns}, ${actualCellWidth}px)`,
            gap: `${thumbnailGap}px`,
          }}
        >
          {showSkeleton
            ? Array.from({ length: skeletonCount }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="thumb-card is-skeleton"
                  style={{ width: `${actualCellWidth}px` }}
                >
                  <div className="thumb-placeholder" style={{ aspectRatio: '1 / 1' }}>
                    <div className="thumb-media thumb-media-empty" style={{ width: '100%', height: '100%' }} />
                  </div>
                </div>
              ))
            : refsInPageForRender.map((ref, pageIndex) => {
              const pkg = packageById.get(ref.packageId)
              const image = pkg?.images[ref.imageIndex]
              if (!pkg || !image) {
                return null
              }

                const absoluteIndex = pageStart + pageIndex
              const isFocused = focusedRef?.packageId === ref.packageId && focusedRef.imageIndex === ref.imageIndex
              const imageSrc = imageUrlByIdForRender[image.id] ?? ''
              const isChecked = checkedImageIds.has(image.id)
              const isAdReviewCandidate = adReviewCandidateImageIds.has(image.id)
              const isAdReviewExcluded = manageMode && isAdReviewCandidate && !isChecked
              const previousRef = pageIndex > 0 ? refsInPageForRender[pageIndex - 1] : null
              const startsNewPackageRow = adReviewGroupByPackageRows && (pageIndex === 0 || previousRef?.packageId !== ref.packageId)
              return (
                <div
                    key={`${ref.packageId}-${ref.imageIndex}`}
                    data-manage-image-id={image.id}
                    data-manage-package-id={ref.packageId}
                    data-manage-image-index={String(ref.imageIndex)}
                    data-manage-absolute-index={String(absoluteIndex)}
                    className={`thumb-card ${manageMode ? 'is-manage' : ''} ${manageMode && isChecked ? 'is-selected' : ''} ${manageMode && image.hidden ? 'is-hidden' : ''} ${isFocused ? 'is-focused' : ''} ${isAdReviewExcluded ? 'is-ad-review-excluded' : ''}`}
                    style={{ width: `${actualCellWidth}px`, gridColumnStart: startsNewPackageRow ? 1 : undefined }}
                  >
                    <button
                      className="thumb-card-main"
                      type="button"
                      disabled={isThumbnailInteractionLocked}
                      onPointerDown={(event) => {
                        markThumbInputMouse()
                        scrollFocusedThumbIntoView(event.currentTarget)
                        scheduleFocusedThumbOriginSync()
                      }}
                      onClick={!manageMode ? () => onSelectImage(ref.packageId, ref.imageIndex, absoluteIndex) : undefined}
                      onDoubleClick={!manageMode ? onEnterFullscreen : undefined}
                    >
                      {manageMode && image.hidden ? <span className="manage-hidden-badge">{t('ui.image.hiddenBadge')}</span> : null}
                      <span className="visually-hidden">{`${pkg.displayName} #${image.ordinal}`}</span>
                      {vectorMode ? (
                        <span className="visually-hidden">{t('ui.image.similarityScore', { score: (vectorCandidates[absoluteIndex]?.score ?? 0).toFixed(2) })}</span>
                      ) : null}
                      <div className="thumb-placeholder" style={{ aspectRatio: '1 / 1' }}>
                        <div className="thumb-media" style={{ width: '100%', height: '100%' }}>
                          {imageSrc ? (
                            <img
                              className="thumb-media-image"
                              src={imageSrc}
                              alt={`${pkg.displayName} #${image.ordinal}`}
                              loading="lazy"
                              draggable={false}
                            />
                          ) : (
                            <div className="thumb-media-empty" />
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                )
              })}
        </div>
      )}

      {marqueeStyle && marqueeStyle.width > 2 && marqueeStyle.height > 2 ? (
        <div
          className="manage-selection-marquee"
          style={{
            left: `${marqueeStyle.left}px`,
            top: `${marqueeStyle.top}px`,
            width: `${marqueeStyle.width}px`,
            height: `${marqueeStyle.height}px`,
          }}
        />
      ) : null}

      <MetadataFetchPanel
        open={metadataFetchOpen}
        defaultText={metadataFetchDefaultText}
        proxyServer={metadataProxyServer}
        ehentaiCookies={metadataEhentaiCookies}
        metadataPending={metadataPending}
        targetPackageLabel={metadataTargetPackageLabel}
        onClose={() => setMetadataFetchOpen(false)}
        onSaveParsedMetadata={onMetadataSaveParsed}
      />

    </>
  )
}

export default ImageMainSection
