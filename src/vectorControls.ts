import { normalizeShortcutBinding } from './shortcuts'

export type VectorControlAction =
  | 'moveUp'
  | 'moveDown'
  | 'moveLeft'
  | 'moveRight'
  | 'moveForward'
  | 'moveBackward'
  | 'accelerate'
  | 'confirmSelection'
  | 'exitUniverse'
  | 'toggleHud'

export type VectorControlKind = 'hold' | 'trigger'

export interface VectorControlDefinition {
  action: VectorControlAction
  label: string
  kind: VectorControlKind
}

export type VectorControlMap = Record<VectorControlAction, string>

export const VECTOR_CONTROL_DEFINITIONS: VectorControlDefinition[] = [
  { action: 'moveUp', label: '向量宇宙：上移', kind: 'hold' },
  { action: 'moveDown', label: '向量宇宙：下移', kind: 'hold' },
  { action: 'moveLeft', label: '向量宇宙：左移', kind: 'hold' },
  { action: 'moveRight', label: '向量宇宙：右移', kind: 'hold' },
  { action: 'moveForward', label: '向量宇宙：前进', kind: 'hold' },
  { action: 'moveBackward', label: '向量宇宙：后退', kind: 'hold' },
  { action: 'accelerate', label: '向量宇宙：加速', kind: 'hold' },
  { action: 'confirmSelection', label: '向量宇宙：确认命中', kind: 'trigger' },
  { action: 'exitUniverse', label: '向量宇宙：退出', kind: 'trigger' },
  { action: 'toggleHud', label: '向量宇宙：HUD 折叠', kind: 'trigger' },
]

export const DEFAULT_VECTOR_CONTROLS: VectorControlMap = {
  moveUp: 'KeyW',
  moveDown: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  moveForward: 'MouseLeft',
  moveBackward: 'MouseRight',
  accelerate: 'ShiftLeft|ShiftRight',
  confirmSelection: 'Space',
  exitUniverse: 'Escape',
  toggleHud: 'F1',
}

export interface VectorControlConflict {
  combo: string
  actions: VectorControlAction[]
}

export function findVectorControlConflicts(map: VectorControlMap): VectorControlConflict[] {
  const bucket = new Map<string, VectorControlAction[]>()

  for (const definition of VECTOR_CONTROL_DEFINITIONS) {
    const raw = normalizeShortcutBinding(map[definition.action])
    if (!raw) {
      continue
    }

    for (const combo of raw.split('|')) {
      const list = bucket.get(combo) ?? []
      list.push(definition.action)
      bucket.set(combo, list)
    }
  }

  const conflicts: VectorControlConflict[] = []
  for (const [combo, actions] of bucket.entries()) {
    if (actions.length > 1) {
      conflicts.push({ combo, actions })
    }
  }

  return conflicts
}
