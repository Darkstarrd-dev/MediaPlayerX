import { useEffect, useState } from 'react'

import type { FocusedImageRef, ImagePackage } from '../types'
import type { VectorControlMap } from '../vectorControls'
import type { VectorUniverseSceneSettings } from '../features/vector-universe/types'

type VectorUniverseOverlayComponent = typeof import('./VectorUniverseOverlay').default

const VECTOR_UNIVERSE_PRELOAD_DELAY_MS = 1500
const VECTOR_UNIVERSE_PRELOAD_IDLE_TIMEOUT_MS = 3000

let cachedVectorUniverseOverlayComponent: VectorUniverseOverlayComponent | null = null
let vectorUniverseOverlayImportPromise: Promise<VectorUniverseOverlayComponent> | null = null

function loadVectorUniverseOverlay(): Promise<VectorUniverseOverlayComponent> {
  if (cachedVectorUniverseOverlayComponent) {
    return Promise.resolve(cachedVectorUniverseOverlayComponent)
  }

  if (!vectorUniverseOverlayImportPromise) {
    vectorUniverseOverlayImportPromise = import('./VectorUniverseOverlay')
      .then((module) => {
        cachedVectorUniverseOverlayComponent = module.default
        return module.default
      })
      .catch((error) => {
        vectorUniverseOverlayImportPromise = null
        throw error
      })
  }

  return vectorUniverseOverlayImportPromise
}

export interface VectorUniverseSectionProps {
  open: boolean
  focusedRef: FocusedImageRef | null
  imageSources: ImagePackage[]
  scopeRefs: FocusedImageRef[]
  helperScale: number
  sceneSettings: VectorUniverseSceneSettings
  widgetSize: number
  vectorControls: VectorControlMap
  onClose: () => void
  onConfirmSelection: (ref: FocusedImageRef) => void
}

function VectorUniverseSection({
  open,
  focusedRef,
  imageSources,
  scopeRefs,
  helperScale,
  sceneSettings,
  widgetSize,
  vectorControls,
  onClose,
  onConfirmSelection,
}: VectorUniverseSectionProps) {
  const [overlayComponent, setOverlayComponent] = useState<VectorUniverseOverlayComponent | null>(
    () => cachedVectorUniverseOverlayComponent,
  )
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    if (import.meta.env.MODE === 'test') {
      let active = true
      void loadVectorUniverseOverlay()
        .then((component) => {
          if (!active) {
            return
          }
          setOverlayComponent(() => component)
        })
        .catch(() => {
          if (!active) {
            return
          }
          setLoadFailed(true)
        })

      return () => {
        active = false
      }
    }
    if (cachedVectorUniverseOverlayComponent) {
      return
    }

    let active = true
    let preloadTimerId = 0
    let idleRequestId: number | null = null

    const triggerPreload = () => {
      preloadTimerId = window.setTimeout(() => {
        void loadVectorUniverseOverlay()
          .then((component) => {
            if (!active) {
              return
            }
            setOverlayComponent(() => component)
          })
          .catch(() => {
            // ignore background preload failure
          })
      }, VECTOR_UNIVERSE_PRELOAD_DELAY_MS)
    }

    if ('requestIdleCallback' in window) {
      const idleWindow = window as Window & {
        requestIdleCallback: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
      }
      idleRequestId = idleWindow.requestIdleCallback(
        () => {
          triggerPreload()
        },
        { timeout: VECTOR_UNIVERSE_PRELOAD_IDLE_TIMEOUT_MS },
      )
    } else {
      triggerPreload()
    }

    return () => {
      active = false
      if (preloadTimerId) {
        window.clearTimeout(preloadTimerId)
      }
      if (idleRequestId !== null && 'cancelIdleCallback' in window) {
        const idleWindow = window as Window & {
          cancelIdleCallback: (handle: number) => void
        }
        idleWindow.cancelIdleCallback(idleRequestId)
      }
    }
  }, [])

  useEffect(() => {
    if (!open || overlayComponent) {
      return
    }

    let active = true
    setLoadFailed(false)

    void loadVectorUniverseOverlay()
      .then((component) => {
        if (!active) {
          return
        }
        setOverlayComponent(() => component)
      })
      .catch(() => {
        if (!active) {
          return
        }
        setLoadFailed(true)
      })

    return () => {
      active = false
    }
  }, [open, overlayComponent])

  if (!open) {
    return null
  }

  if (!overlayComponent) {
    return (
      <section className="vector-universe-overlay vector-universe-overlay-loading" role="dialog" aria-modal="true" aria-label="向量宇宙层">
        <p className="vector-universe-overlay-tip">
          {loadFailed ? '向量宇宙模块加载失败，请关闭后重试。' : '向量宇宙模块加载中...'}
        </p>
      </section>
    )
  }

  const OverlayComponent = overlayComponent

  return (
    <OverlayComponent
      open={open}
      focusedRef={focusedRef}
      imageSources={imageSources}
      scopeRefs={scopeRefs}
      helperScale={helperScale}
      sceneSettings={sceneSettings}
      widgetSize={widgetSize}
      vectorControls={vectorControls}
      onClose={onClose}
      onConfirmSelection={onConfirmSelection}
    />
  )
}

export default VectorUniverseSection
