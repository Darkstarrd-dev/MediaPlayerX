import { clamp } from '../../utils/ui'

const FULLSCREEN_CONTROLS_REFERENCE_ASPECT = 16 / 9
const FULLSCREEN_CONTROLS_WIDTH_RATIO = 0.45
const REGULAR_BUTTON_WIDTH = 34
const PRIMARY_BUTTON_WIDTH = 45
const EDGE_GROUP_BUTTON_GAP = 10
const CENTER_GROUP_BUTTON_GAP = 16
const LEFT_GROUP_BUTTON_COUNT = 5
const CENTER_GROUP_BUTTON_COUNT = 4
const RIGHT_GROUP_BUTTON_COUNT = 5
const INTER_GROUP_GAP = 10 * 2
const FULLSCREEN_CONTROLS_MIN_WIDTH =
  LEFT_GROUP_BUTTON_COUNT * REGULAR_BUTTON_WIDTH +
  (LEFT_GROUP_BUTTON_COUNT - 1) * EDGE_GROUP_BUTTON_GAP +
  CENTER_GROUP_BUTTON_COUNT * PRIMARY_BUTTON_WIDTH +
  (CENTER_GROUP_BUTTON_COUNT - 1) * CENTER_GROUP_BUTTON_GAP +
  RIGHT_GROUP_BUTTON_COUNT * REGULAR_BUTTON_WIDTH +
  (RIGHT_GROUP_BUTTON_COUNT - 1) * EDGE_GROUP_BUTTON_GAP +
  INTER_GROUP_GAP

export function resolveFullscreenControlsWidth(params: {
  viewportWidth: number
  viewportHeight: number
  widthCap: number
}): number {
  const safeViewportWidth = Math.max(1, params.viewportWidth)
  const safeViewportHeight = Math.max(1, params.viewportHeight)
  const safeWidthCap = clamp(params.widthCap, 640, 1920)

  const maxWidth = Math.max(120, Math.min(safeViewportWidth - 16, safeWidthCap))
  const fitWidth = Math.min(safeViewportWidth, safeViewportHeight * FULLSCREEN_CONTROLS_REFERENCE_ASPECT)
  const preferredWidth = Math.round(fitWidth * FULLSCREEN_CONTROLS_WIDTH_RATIO)
  const minWidth = Math.min(maxWidth, FULLSCREEN_CONTROLS_MIN_WIDTH)

  return Math.max(minWidth, Math.min(preferredWidth, maxWidth))
}
