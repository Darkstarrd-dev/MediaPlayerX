import {
  mouseButtonToToken,
  normalizeShortcutBinding,
  shortcutMatches,
  shortcutMouseMatches,
} from '../../shortcuts'
import type { VectorControlMap } from '../../vectorControls'

export interface SceneInputState {
  moveUpActive: boolean
  moveDownActive: boolean
  moveLeftActive: boolean
  moveRightActive: boolean
  accelerateActive: boolean
  mouseForward: boolean
  mouseBackward: boolean
}

interface CreateSceneInputControllerParams {
  canvas: HTMLCanvasElement
  controls: VectorControlMap
  controlsEnabled: boolean
  onPointerLockChange: (isLocked: boolean) => void
}

interface SceneInputController {
  state: SceneInputState
  scheduleAutoPointerLock: () => void
  dispose: () => void
}

export function createSceneInputController({
  canvas,
  controls,
  controlsEnabled,
  onPointerLockChange,
}: CreateSceneInputControllerParams): SceneInputController {
  const state: SceneInputState = {
    moveUpActive: false,
    moveDownActive: false,
    moveLeftActive: false,
    moveRightActive: false,
    accelerateActive: false,
    mouseForward: false,
    mouseBackward: false,
  }

  let pointerRelockTimer = 0
  let pointerRelockRaf = 0
  let pointerAutoLockEnabled = true

  const clearInputs = () => {
    state.moveUpActive = false
    state.moveDownActive = false
    state.moveLeftActive = false
    state.moveRightActive = false
    state.accelerateActive = false
    state.mouseForward = false
    state.mouseBackward = false
  }

  const bindingContainsMouseButton = (binding: string, button: number): boolean => {
    const normalized = normalizeShortcutBinding(binding)
    if (!normalized) {
      return false
    }

    const token = mouseButtonToToken(button)
    return normalized.split('|').some((combo) => combo.endsWith(token))
  }

  const requestPointerLock = () => {
    if (document.pointerLockElement === canvas) {
      return
    }

    if (!canvas.isConnected || canvas.ownerDocument !== document) {
      return
    }

    const request = (canvas as HTMLCanvasElement & { requestPointerLock?: () => void }).requestPointerLock
    if (!request) {
      return
    }

    try {
      const maybePromise = request.call(canvas) as unknown
      if (
        typeof maybePromise === 'object' &&
        maybePromise !== null &&
        'catch' in maybePromise &&
        typeof (maybePromise as { catch: (handler: () => void) => void }).catch === 'function'
      ) {
        ;(maybePromise as { catch: (handler: () => void) => void }).catch(() => undefined)
      }
    } catch {
      return
    }
  }

  const syncPointerLock = () => {
    const isLocked = document.pointerLockElement === canvas
    onPointerLockChange(isLocked)

    if (!isLocked) {
      state.mouseForward = false
      state.mouseBackward = false

      if (pointerAutoLockEnabled) {
        pointerRelockTimer = window.setTimeout(() => {
          requestPointerLock()
        }, 0)
      }
    }
  }

  const scheduleAutoPointerLock = () => {
    if (!pointerAutoLockEnabled || document.pointerLockElement === canvas) {
      return
    }

    pointerRelockRaf = window.requestAnimationFrame(() => {
      requestPointerLock()
    })
  }

  const onKeyDown = (event: KeyboardEvent) => {
    let matched = false

    if (shortcutMatches(controls.moveUp, event)) {
      matched = true
      if (controlsEnabled) {
        state.moveUpActive = true
      }
    }
    if (shortcutMatches(controls.moveDown, event)) {
      matched = true
      if (controlsEnabled) {
        state.moveDownActive = true
      }
    }
    if (shortcutMatches(controls.moveLeft, event)) {
      matched = true
      if (controlsEnabled) {
        state.moveLeftActive = true
      }
    }
    if (shortcutMatches(controls.moveRight, event)) {
      matched = true
      if (controlsEnabled) {
        state.moveRightActive = true
      }
    }
    if (shortcutMatches(controls.accelerate, event)) {
      matched = true
      if (controlsEnabled) {
        state.accelerateActive = true
      }
    }

    if (matched) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  const onKeyUp = (event: KeyboardEvent) => {
    let matched = false

    if (shortcutMatches(controls.moveUp, event)) {
      matched = true
      state.moveUpActive = false
    }
    if (shortcutMatches(controls.moveDown, event)) {
      matched = true
      state.moveDownActive = false
    }
    if (shortcutMatches(controls.moveLeft, event)) {
      matched = true
      state.moveLeftActive = false
    }
    if (shortcutMatches(controls.moveRight, event)) {
      matched = true
      state.moveRightActive = false
    }
    if (shortcutMatches(controls.accelerate, event)) {
      matched = true
      state.accelerateActive = false
    }

    if (matched) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  const onMouseDown = (event: MouseEvent) => {
    requestPointerLock()

    let matched = false

    if (shortcutMouseMatches(controls.moveForward, event)) {
      matched = true
      if (controlsEnabled) {
        state.mouseForward = true
      }
    }
    if (shortcutMouseMatches(controls.moveBackward, event)) {
      matched = true
      if (controlsEnabled) {
        state.mouseBackward = true
      }
    }

    if (matched) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  const onMouseUp = (event: MouseEvent) => {
    if (shortcutMouseMatches(controls.moveForward, event) || bindingContainsMouseButton(controls.moveForward, event.button)) {
      state.mouseForward = false
    }

    if (shortcutMouseMatches(controls.moveBackward, event) || bindingContainsMouseButton(controls.moveBackward, event.button)) {
      state.mouseBackward = false
    }
  }

  const onCanvasContextMenu = (event: MouseEvent) => {
    event.preventDefault()
  }

  const onWindowFocus = () => {
    scheduleAutoPointerLock()
  }

  window.addEventListener('keydown', onKeyDown, true)
  window.addEventListener('keyup', onKeyUp, true)
  document.addEventListener('pointerlockchange', syncPointerLock)
  document.addEventListener('pointerlockerror', syncPointerLock)
  window.addEventListener('mouseup', onMouseUp, true)
  window.addEventListener('blur', clearInputs)
  window.addEventListener('focus', onWindowFocus)
  canvas.addEventListener('click', requestPointerLock)
  canvas.addEventListener('mousedown', onMouseDown)
  canvas.addEventListener('contextmenu', onCanvasContextMenu)

  const dispose = () => {
    pointerAutoLockEnabled = false
    clearInputs()
    window.cancelAnimationFrame(pointerRelockRaf)
    window.clearTimeout(pointerRelockTimer)

    window.removeEventListener('keydown', onKeyDown, true)
    window.removeEventListener('keyup', onKeyUp, true)
    document.removeEventListener('pointerlockchange', syncPointerLock)
    document.removeEventListener('pointerlockerror', syncPointerLock)
    window.removeEventListener('mouseup', onMouseUp, true)
    window.removeEventListener('blur', clearInputs)
    window.removeEventListener('focus', onWindowFocus)

    canvas.removeEventListener('click', requestPointerLock)
    canvas.removeEventListener('mousedown', onMouseDown)
    canvas.removeEventListener('contextmenu', onCanvasContextMenu)
  }

  return {
    state,
    scheduleAutoPointerLock,
    dispose,
  }
}
