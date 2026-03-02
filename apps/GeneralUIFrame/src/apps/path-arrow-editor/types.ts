export interface Vector2 {
  x: number
  y: number
}

export interface PathPoint extends Vector2 {
  handleIn: Vector2 | null
  handleOut: Vector2 | null
}

export interface ArrowStyle {
  color: string
  arrowCount: number
  triangleHeight: number
  triangleWidth: number
  tailLength: number
  tailWidth: number
  duration: number
  timeOffset: number
}

export interface ArrowPath {
  id: string
  name: string
  points: PathPoint[]
  style: ArrowStyle
  reversed: boolean
  useCustomColor: boolean
  collapsed: boolean
}

export interface GlobalArrowStyle {
  triangleHeight: number
  triangleWidth: number
  tailLength: number
  tailWidth: number
}

export interface PathArrowEditorPersistedState {
  globalColor: string
  globalArrowStyle: GlobalArrowStyle
  paths: ArrowPath[]
  selectedPathId: string | null
  zoom: number
}
