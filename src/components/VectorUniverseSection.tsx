import { Suspense, lazy } from 'react'

import type { FocusedImageRef, ImagePackage } from '../types'
import type { VectorControlMap } from '../vectorControls'
import type { VectorUniverseSceneSettings } from '../features/vector-universe/types'

const VectorUniverseOverlay = lazy(() => import('./VectorUniverseOverlay'))

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
  if (!open) {
    return null
  }

  return (
    <Suspense
      fallback={
        <section className="vector-universe-overlay vector-universe-overlay-loading" role="dialog" aria-modal="true" aria-label="向量宇宙层">
          <p className="vector-universe-overlay-tip">向量宇宙模块加载中...</p>
        </section>
      }
    >
      <VectorUniverseOverlay
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
    </Suspense>
  )
}

export default VectorUniverseSection
