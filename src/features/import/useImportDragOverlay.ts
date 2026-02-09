import { useCallback, useEffect, useRef, useState, type DragEventHandler } from 'react'

import {
  collectPathsFromDataTransfer,
  isEventImportHandled,
  markEventImportHandled,
  shouldShowDragOverlay,
} from './importPathUtils'

interface UseImportDragOverlayParams {
  enqueueDragDropPaths: (paths: string[]) => void
  onPathResolveFailed: () => void
}

interface UseImportDragOverlayResult {
  dragOverlayActive: boolean
  onDragEnterImport: DragEventHandler<HTMLDivElement>
  onDragOverImport: DragEventHandler<HTMLDivElement>
  onDragLeaveImport: DragEventHandler<HTMLDivElement>
  onDropImport: DragEventHandler<HTMLDivElement>
}

export function useImportDragOverlay({
  enqueueDragDropPaths,
  onPathResolveFailed,
}: UseImportDragOverlayParams): UseImportDragOverlayResult {
  const dragDepthRef = useRef(0)
  const [dragOverlayActive, setDragOverlayActive] = useState(false)

  const onDragEnterImport: DragEventHandler<HTMLDivElement> = useCallback((event) => {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy'
    }

    if (!shouldShowDragOverlay(event.dataTransfer)) {
      return
    }

    dragDepthRef.current += 1
    setDragOverlayActive(true)
  }, [])

  const onDropImport: DragEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      event.preventDefault()

      if (isEventImportHandled(event)) {
        dragDepthRef.current = 0
        setDragOverlayActive(false)
        return
      }

      dragDepthRef.current = 0
      setDragOverlayActive(false)

      const mergedPaths = collectPathsFromDataTransfer(event.dataTransfer)
      if (mergedPaths.length === 0) {
        if ((event.dataTransfer?.files?.length ?? 0) > 0) {
          onPathResolveFailed()
        }
        return
      }

      markEventImportHandled(event)
      enqueueDragDropPaths(mergedPaths)
    },
    [enqueueDragDropPaths, onPathResolveFailed],
  )

  const onDragOverImport: DragEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      event.preventDefault()
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy'
      }

      if (!dragOverlayActive && shouldShowDragOverlay(event.dataTransfer)) {
        setDragOverlayActive(true)
      }
    },
    [dragOverlayActive],
  )

  const onDragLeaveImport: DragEventHandler<HTMLDivElement> = useCallback(() => {
    if (!dragOverlayActive) {
      return
    }

    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) {
      setDragOverlayActive(false)
    }
  }, [dragOverlayActive])

  useEffect(() => {
    const onWindowDragEnter = (event: DragEvent) => {
      event.preventDefault()
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy'
      }

      if (!shouldShowDragOverlay(event.dataTransfer)) {
        return
      }

      dragDepthRef.current += 1
      setDragOverlayActive(true)
    }

    const onWindowDragOver = (event: DragEvent) => {
      event.preventDefault()

      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy'
      }

      if (!dragOverlayActive && shouldShowDragOverlay(event.dataTransfer)) {
        setDragOverlayActive(true)
      }
    }

    const onWindowDrop = (event: DragEvent) => {
      event.preventDefault()

      if (isEventImportHandled(event)) {
        dragDepthRef.current = 0
        setDragOverlayActive(false)
        return
      }

      dragDepthRef.current = 0
      setDragOverlayActive(false)

      const mergedPaths = collectPathsFromDataTransfer(event.dataTransfer)
      if (mergedPaths.length === 0) {
        return
      }

      markEventImportHandled(event)
      enqueueDragDropPaths(mergedPaths)
    }

    const onWindowDragLeave = () => {
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
      if (dragDepthRef.current === 0) {
        setDragOverlayActive(false)
      }
    }

    window.addEventListener('dragenter', onWindowDragEnter, true)
    window.addEventListener('dragover', onWindowDragOver, true)
    window.addEventListener('dragleave', onWindowDragLeave, true)
    window.addEventListener('drop', onWindowDrop, true)
    return () => {
      window.removeEventListener('dragenter', onWindowDragEnter, true)
      window.removeEventListener('dragover', onWindowDragOver, true)
      window.removeEventListener('dragleave', onWindowDragLeave, true)
      window.removeEventListener('drop', onWindowDrop, true)
    }
  }, [dragOverlayActive, enqueueDragDropPaths])

  return {
    dragOverlayActive,
    onDragEnterImport,
    onDragOverImport,
    onDragLeaveImport,
    onDropImport,
  }
}
