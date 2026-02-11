import type { FocusedImageRef, ImagePackage } from '../types'
import type { VectorControlMap } from '../vectorControls'
import type { VectorUniverseSceneSettings } from '../features/vector-universe/types'
import VectorUniverseOverlay from './VectorUniverseOverlay'

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
  )
}

export default VectorUniverseSection
