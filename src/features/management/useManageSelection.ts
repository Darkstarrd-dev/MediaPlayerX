import { useCallback, useEffect, useMemo, useState } from 'react'

interface UseManageSelectionParams {
  flatSidebarNodeIds: string[]
  validImageIdSet?: ReadonlySet<string>
  sidebarDescendantNodeIdsById?: ReadonlyMap<string, string[]>
}

interface ToggleImageCheckedOptions {
  shiftKey?: boolean
  orderedIds?: readonly string[]
}

export function useManageSelection({
  flatSidebarNodeIds,
  validImageIdSet,
  sidebarDescendantNodeIdsById,
}: UseManageSelectionParams) {
  const [sidebarCheckedNodeIds, setSidebarCheckedNodeIds] = useState<string[]>([])
  const [sidebarAnchorNodeId, setSidebarAnchorNodeId] = useState<string | null>(null)
  const [imageCheckedIds, setImageCheckedIds] = useState<string[]>([])
  const [imageAnchorId, setImageAnchorId] = useState<string | null>(null)

  const sidebarCheckedNodeIdSet = useMemo(() => new Set(sidebarCheckedNodeIds), [sidebarCheckedNodeIds])
  const imageCheckedIdSet = useMemo(() => new Set(imageCheckedIds), [imageCheckedIds])

  const activeSelectionScope: 'sidebar' | 'image' | null =
    sidebarCheckedNodeIds.length > 0 ? 'sidebar' : imageCheckedIds.length > 0 ? 'image' : null

  const clearSidebarSelections = useCallback(() => {
    setSidebarCheckedNodeIds([])
    setSidebarAnchorNodeId(null)
  }, [])

  const clearImageSelections = useCallback(() => {
    setImageCheckedIds([])
    setImageAnchorId(null)
  }, [])

  const clearAllSelections = useCallback(() => {
    clearSidebarSelections()
    clearImageSelections()
  }, [clearImageSelections, clearSidebarSelections])

  useEffect(() => {
    const validNodeSet = new Set(flatSidebarNodeIds)
    setSidebarCheckedNodeIds((previous) => {
      const next = previous.filter((nodeId) => validNodeSet.has(nodeId))
      if (next.length === previous.length && next.every((nodeId, index) => nodeId === previous[index])) {
        return previous
      }
      return next
    })
    setSidebarAnchorNodeId((previous) => (previous && validNodeSet.has(previous) ? previous : null))
  }, [flatSidebarNodeIds])

  useEffect(() => {
    if (!validImageIdSet) {
      return
    }
    setImageCheckedIds((previous) => {
      const next = previous.filter((imageId) => validImageIdSet.has(imageId))
      if (next.length === previous.length && next.every((imageId, index) => imageId === previous[index])) {
        return previous
      }
      return next
    })
    setImageAnchorId((previous) => (previous && validImageIdSet.has(previous) ? previous : null))
  }, [validImageIdSet])

  const toggleSidebarNodeChecked = useCallback(
    (nodeId: string, shiftKey: boolean) => {
      setImageCheckedIds([])

      setSidebarCheckedNodeIds((previous) => {
        const next = new Set(previous)

        if (shiftKey && sidebarAnchorNodeId) {
          const startIndex = flatSidebarNodeIds.indexOf(sidebarAnchorNodeId)
          const endIndex = flatSidebarNodeIds.indexOf(nodeId)
          if (startIndex >= 0 && endIndex >= 0) {
            const [from, to] = startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex]
            for (let index = from; index <= to; index += 1) {
              const rangeNodeId = flatSidebarNodeIds[index]
              if (rangeNodeId) {
                next.add(rangeNodeId)
                const descendants = sidebarDescendantNodeIdsById?.get(rangeNodeId) ?? []
                for (const descendantNodeId of descendants) {
                  next.add(descendantNodeId)
                }
              }
            }
            return Array.from(next)
          }
        }

        const descendants = sidebarDescendantNodeIdsById?.get(nodeId) ?? []
        if (next.has(nodeId)) {
          next.delete(nodeId)
          for (const descendantNodeId of descendants) {
            next.delete(descendantNodeId)
          }
        } else {
          next.add(nodeId)
          for (const descendantNodeId of descendants) {
            next.add(descendantNodeId)
          }
        }
        return Array.from(next)
      })

      if (!shiftKey || !sidebarAnchorNodeId) {
        setSidebarAnchorNodeId(nodeId)
      }
    },
    [flatSidebarNodeIds, sidebarAnchorNodeId, sidebarDescendantNodeIdsById],
  )

  const checkSidebarNode = useCallback(
    (nodeId: string) => {
      setImageCheckedIds([])

      setSidebarCheckedNodeIds((previous) => {
        const next = new Set(previous)
        next.add(nodeId)
        const descendants = sidebarDescendantNodeIdsById?.get(nodeId) ?? []
        for (const descendantNodeId of descendants) {
          next.add(descendantNodeId)
        }
        return Array.from(next)
      })
    },
    [sidebarDescendantNodeIdsById],
  )

  const toggleImageChecked = useCallback(
    (imageId: string, checked?: boolean, options?: ToggleImageCheckedOptions) => {
      setSidebarCheckedNodeIds([])
      setSidebarAnchorNodeId(null)

      const orderedIds = options?.orderedIds
      const shiftKey = Boolean(options?.shiftKey)
      const canApplyShiftRange =
        shiftKey &&
        imageAnchorId &&
        Array.isArray(orderedIds) &&
        orderedIds.length > 0 &&
        orderedIds.includes(imageAnchorId) &&
        orderedIds.includes(imageId)

      setImageCheckedIds((previous) => {
        const next = new Set(previous)

        if (canApplyShiftRange && imageAnchorId && orderedIds) {
          const startIndex = orderedIds.indexOf(imageAnchorId)
          const endIndex = orderedIds.indexOf(imageId)
          if (startIndex >= 0 && endIndex >= 0) {
            const [from, to] = startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex]
            for (let index = from; index <= to; index += 1) {
              const rangeImageId = orderedIds[index]
              if (rangeImageId) {
                next.add(rangeImageId)
              }
            }
            return Array.from(next)
          }
        }

        const shouldCheck = typeof checked === 'boolean' ? checked : !next.has(imageId)
        if (shouldCheck) {
          next.add(imageId)
        } else {
          next.delete(imageId)
        }
        return Array.from(next)
      })

      if (!canApplyShiftRange) {
        setImageAnchorId(imageId)
      }
    },
    [imageAnchorId],
  )

  const replaceImageCheckedIds = useCallback((imageIds: string[], append = false) => {
    const normalized = Array.from(new Set(imageIds.map((value) => value.trim()).filter(Boolean)))
    setSidebarCheckedNodeIds([])
    setSidebarAnchorNodeId(null)
    setImageAnchorId(null)

    if (append) {
      setImageCheckedIds((previous) => Array.from(new Set([...previous, ...normalized])))
      return
    }

    setImageCheckedIds(normalized)
  }, [])

  return {
    sidebarCheckedNodeIds,
    sidebarCheckedNodeIdSet,
    imageCheckedIds,
    imageCheckedIdSet,
    activeSelectionScope,
    clearSidebarSelections,
    clearImageSelections,
    clearAllSelections,
    toggleSidebarNodeChecked,
    checkSidebarNode,
    toggleImageChecked,
    replaceImageCheckedIds,
  }
}
