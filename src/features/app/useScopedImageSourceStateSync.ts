import { useEffect, type Dispatch, type SetStateAction } from 'react'

import type { ImagePackage } from '../../types'
import { clamp } from '../../utils/ui'

interface UseScopedImageSourceStateSyncParams {
  scopedImageSources: ImagePackage[]
  setFocusByPackage: Dispatch<SetStateAction<Record<string, number>>>
  setPageByPackage: Dispatch<SetStateAction<Record<string, number>>>
  setGradeByPackage: Dispatch<SetStateAction<Record<string, number | null>>>
}

export function useScopedImageSourceStateSync({
  scopedImageSources,
  setFocusByPackage,
  setPageByPackage,
  setGradeByPackage,
}: UseScopedImageSourceStateSyncParams): void {
  useEffect(() => {
    const nextSourceIds = new Set(scopedImageSources.map((source) => source.id))

    setFocusByPackage((previous) => {
      const next: Record<string, number> = {}
      let changed = false

      for (const source of scopedImageSources) {
        const hadPrev = Object.prototype.hasOwnProperty.call(previous, source.id)
        const prevValue = previous[source.id] ?? 0
        const nextValue = clamp(prevValue, 0, Math.max(0, source.images.length - 1))
        next[source.id] = nextValue
        if (!hadPrev || nextValue !== prevValue) {
          changed = true
        }
      }

      for (const key of Object.keys(previous)) {
        if (!nextSourceIds.has(key)) {
          changed = true
          break
        }
      }

      return changed ? next : previous
    })

    setPageByPackage((previous) => {
      const next: Record<string, number> = {}
      let changed = false

      for (const source of scopedImageSources) {
        const hadPrev = Object.prototype.hasOwnProperty.call(previous, source.id)
        const prevValue = previous[source.id] ?? 0
        const nextValue = Math.max(0, prevValue)
        next[source.id] = nextValue
        if (!hadPrev || nextValue !== prevValue) {
          changed = true
        }
      }

      for (const key of Object.keys(previous)) {
        if (!nextSourceIds.has(key)) {
          changed = true
          break
        }
      }

      return changed ? next : previous
    })

    setGradeByPackage((previous) => {
      const next: Record<string, number | null> = {}
      let changed = false

      for (const source of scopedImageSources) {
        if (Object.prototype.hasOwnProperty.call(previous, source.id)) {
          next[source.id] = previous[source.id] ?? null
          continue
        }

        next[source.id] = source.mockGrade ?? null
        changed = true
      }

      for (const key of Object.keys(previous)) {
        if (!nextSourceIds.has(key)) {
          changed = true
          break
        }
      }

      return changed ? next : previous
    })
  }, [scopedImageSources, setFocusByPackage, setGradeByPackage, setPageByPackage])
}
