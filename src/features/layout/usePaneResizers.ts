import { useCallback, useState, type MouseEvent as ReactMouseEvent, type MutableRefObject, type RefObject } from 'react'

import { clamp } from '../../utils/ui'

interface UsePaneResizersParams {
  appBodyRef: RefObject<HTMLDivElement | null>
  workspaceRef: RefObject<HTMLElement | null>
  workspaceBodyRef: RefObject<HTMLDivElement | null>
  appBodyWidth: number
  sidebarRatio: number
  sidebarMinWidth: number
  metadataRatio: number
  workspaceBottomPanelHeight: number
  layoutLocked: boolean
  searchPanelCollapsed: boolean
  sidebarCollapseRatio: number
  lastExpandedSidebarRatioRef: MutableRefObject<number>
  onSetSidebarRatio: (value: number) => void
  onSetMetadataRatio: (value: number) => void
  onSetWorkspaceBottomPanelHeight: (value: number) => void
}

interface UsePaneResizersResult {
  sidebarCollapsed: boolean
  normalizeSidebarRatio: (candidate: number) => number
  applySidebarRatio: (candidate: number) => void
  applyMetadataRatio: (candidate: number) => void
  horizontalResizing: boolean
  horizontalResizeCommitCount: number
  onStartSidebarResize: (event: ReactMouseEvent<HTMLDivElement>) => void
  onStartMetadataResize: (event: ReactMouseEvent<HTMLDivElement>) => void
  onStartWorkspaceBottomPanelResize: (event: ReactMouseEvent<HTMLDivElement>) => void
  onExpandSidebar: () => void
}

export function usePaneResizers({
  appBodyRef,
  workspaceRef,
  workspaceBodyRef,
  appBodyWidth,
  sidebarRatio,
  sidebarMinWidth,
  metadataRatio,
  workspaceBottomPanelHeight,
  layoutLocked,
  searchPanelCollapsed,
  sidebarCollapseRatio,
  lastExpandedSidebarRatioRef,
  onSetSidebarRatio,
  onSetMetadataRatio,
  onSetWorkspaceBottomPanelHeight,
}: UsePaneResizersParams): UsePaneResizersResult {
  const [horizontalResizing, setHorizontalResizing] = useState(false)
  const [horizontalResizeCommitCount, setHorizontalResizeCommitCount] = useState(0)

  const readAppBodyWidth = useCallback(() => {
    const measured = appBodyRef.current?.getBoundingClientRect().width
    if (measured && measured > 0) {
      return measured
    }
    if (appBodyWidth > 0) {
      return appBodyWidth
    }
    return window.innerWidth
  }, [appBodyRef, appBodyWidth])

  const normalizeSidebarRatio = useCallback(
    (candidate: number) => {
      const bounded = clamp(candidate, 0, 0.95)
      if (bounded < sidebarCollapseRatio) {
        return 0
      }

      const bodyWidth = readAppBodyWidth()
      if (bodyWidth <= 0) {
        return Number(bounded.toFixed(3))
      }

      const minRatio = clamp(sidebarMinWidth / bodyWidth, 0, 0.95)
      return Number(Math.max(bounded, minRatio).toFixed(3))
    },
    [readAppBodyWidth, sidebarCollapseRatio, sidebarMinWidth],
  )

  const applySidebarRatio = useCallback(
    (candidate: number) => {
      const next = normalizeSidebarRatio(candidate)
      if (Math.abs(next - sidebarRatio) < 0.0005) {
        return
      }
      onSetSidebarRatio(next)
    },
    [normalizeSidebarRatio, onSetSidebarRatio, sidebarRatio],
  )

  const sidebarCollapsed = sidebarRatio < sidebarCollapseRatio

  const updateSidebarRatioByClientX = useCallback(
    (clientX: number) => {
      const bodyRect = appBodyRef.current?.getBoundingClientRect()
      if (!bodyRect || bodyRect.width <= 0) {
        return
      }

      const ratio = clamp((clientX - bodyRect.left) / bodyRect.width, 0, 0.95)
      applySidebarRatio(ratio)
    },
    [appBodyRef, applySidebarRatio],
  )

  const onStartSidebarResize = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (layoutLocked) {
        return
      }
      event.preventDefault()
      setHorizontalResizing(true)

      const onMouseMove = (moveEvent: MouseEvent) => {
        updateSidebarRatioByClientX(moveEvent.clientX)
      }

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
        setHorizontalResizing(false)
        setHorizontalResizeCommitCount((value) => value + 1)
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [layoutLocked, updateSidebarRatioByClientX],
  )

  const onExpandSidebar = useCallback(() => {
    const bodyWidth = readAppBodyWidth()
    const minRatio =
      bodyWidth > 0 ? clamp(sidebarMinWidth / bodyWidth, sidebarCollapseRatio, 0.95) : sidebarCollapseRatio
    const nextRatio = Math.max(lastExpandedSidebarRatioRef.current, minRatio)
    onSetSidebarRatio(Number(nextRatio.toFixed(3)))
  }, [lastExpandedSidebarRatioRef, onSetSidebarRatio, readAppBodyWidth, sidebarCollapseRatio, sidebarMinWidth])

  const applyMetadataRatio = useCallback(
    (candidate: number) => {
      const next = Number(clamp(candidate, 0.2, 0.45).toFixed(3))
      if (Math.abs(next - metadataRatio) < 0.0005) {
        return
      }
      onSetMetadataRatio(next)
    },
    [metadataRatio, onSetMetadataRatio],
  )

  const updateMetadataRatioByClientX = useCallback(
    (clientX: number) => {
      const bodyRect = workspaceBodyRef.current?.getBoundingClientRect()
      if (!bodyRect || bodyRect.width <= 0) {
        return
      }

      const ratio = (bodyRect.right - clientX) / bodyRect.width
      applyMetadataRatio(ratio)
    },
    [applyMetadataRatio, workspaceBodyRef],
  )

  const onStartMetadataResize = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (layoutLocked) {
        return
      }
      event.preventDefault()
      setHorizontalResizing(true)

      const onMouseMove = (moveEvent: MouseEvent) => {
        updateMetadataRatioByClientX(moveEvent.clientX)
      }

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
        setHorizontalResizing(false)
        setHorizontalResizeCommitCount((value) => value + 1)
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [layoutLocked, updateMetadataRatioByClientX],
  )

  const updateWorkspaceBottomPanelHeightByClientY = useCallback(
    (clientY: number) => {
      const rect = workspaceRef.current?.getBoundingClientRect()
      if (!rect || rect.height <= 0) {
        return
      }

      const minHeight = 80
      const maxHeight = Math.max(minHeight, Math.min(360, Math.floor(rect.height - 120)))
      const nextHeight = clamp(Math.round(clientY - rect.top), minHeight, maxHeight)
      if (Math.abs(nextHeight - workspaceBottomPanelHeight) < 1) {
        return
      }

      onSetWorkspaceBottomPanelHeight(nextHeight)
    },
    [onSetWorkspaceBottomPanelHeight, workspaceBottomPanelHeight, workspaceRef],
  )

  const onStartWorkspaceBottomPanelResize = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (layoutLocked || searchPanelCollapsed) {
        return
      }
      event.preventDefault()

      const onMouseMove = (moveEvent: MouseEvent) => {
        updateWorkspaceBottomPanelHeightByClientY(moveEvent.clientY)
      }

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [layoutLocked, searchPanelCollapsed, updateWorkspaceBottomPanelHeightByClientY],
  )

  return {
    sidebarCollapsed,
    normalizeSidebarRatio,
    applySidebarRatio,
    applyMetadataRatio,
    horizontalResizing,
    horizontalResizeCommitCount,
    onStartSidebarResize,
    onStartMetadataResize,
    onStartWorkspaceBottomPanelResize,
    onExpandSidebar,
  }
}
