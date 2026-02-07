import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  buildVectorUniverseNodesByScope,
  useVectorUniverseScene,
} from '../features/vector-universe/useVectorUniverseScene'
import { shortcutMatches } from '../shortcuts'
import type { VectorControlMap } from '../vectorControls'
import type { VectorUniverseSceneSettings } from '../features/vector-universe/types'
import type { FocusedImageRef, ImagePackage } from '../types'
import VectorUniverseWidget from './VectorUniverseWidget'

interface VectorUniverseOverlayProps {
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

const LOD_LABELS = {
  far: '远',
  mid: '中',
  near: '近',
} as const

function VectorUniverseOverlay({
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
}: VectorUniverseOverlayProps) {
  const sceneHostRef = useRef<HTMLDivElement>(null)
  const [hudCollapsed, setHudCollapsed] = useState(false)
  const [escPendingExit, setEscPendingExit] = useState(false)
  const escPendingTimerRef = useRef(0)
  const previousPointerLockedRef = useRef(false)

  const nodes = useMemo(
    () => buildVectorUniverseNodesByScope(imageSources, scopeRefs, focusedRef, sceneSettings.dispersion),
    [focusedRef, imageSources, sceneSettings.dispersion, scopeRefs],
  )
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])

  const focusNodeId = focusedRef ? `${focusedRef.packageId}:${focusedRef.imageIndex}` : null
  const controlsEnabled = Boolean(focusNodeId)

  const {
    rendererReady,
    pointerLocked,
    focusLod,
    lodCounts,
    worldHalfExtent,
    cameraPosition,
    cameraForward,
    targetNodeId,
  } = useVectorUniverseScene({
    open,
    containerRef: sceneHostRef,
    nodes,
    focusNodeId,
    controlsEnabled,
    settings: sceneSettings,
    controls: vectorControls,
  })

  const targetNode = targetNodeId ? nodeById.get(targetNodeId) ?? null : null

  const handleUniverseExitIntent = useCallback(() => {
    if (escPendingExit) {
      window.clearTimeout(escPendingTimerRef.current)
      escPendingTimerRef.current = 0
      setEscPendingExit(false)
      onClose()
      return
    }

    setEscPendingExit(true)
    window.clearTimeout(escPendingTimerRef.current)
    escPendingTimerRef.current = window.setTimeout(() => {
      setEscPendingExit(false)
    }, 1200)
  }, [escPendingExit, onClose])

  useEffect(() => {
    if (!open) {
      return
    }

    setHudCollapsed(false)
    setEscPendingExit(false)
    previousPointerLockedRef.current = false

    return () => {
      window.clearTimeout(escPendingTimerRef.current)
      escPendingTimerRef.current = 0
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      previousPointerLockedRef.current = false
      return
    }

    const wasPointerLocked = previousPointerLockedRef.current
    if (wasPointerLocked && !pointerLocked && controlsEnabled && !escPendingExit) {
      handleUniverseExitIntent()
    }

    previousPointerLockedRef.current = pointerLocked
  }, [controlsEnabled, escPendingExit, handleUniverseExitIntent, open, pointerLocked])

  useEffect(() => {
    if (!open) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (shortcutMatches(vectorControls.toggleHud, event)) {
        event.preventDefault()
        setHudCollapsed((value) => !value)
        return
      }

      if (shortcutMatches(vectorControls.exitUniverse, event)) {
        event.preventDefault()
        handleUniverseExitIntent()
        return
      }

      if (!shortcutMatches(vectorControls.confirmSelection, event)) {
        return
      }

      event.preventDefault()
      if (!controlsEnabled || !targetNode) {
        return
      }

      onConfirmSelection({
        packageId: targetNode.packageId,
        imageIndex: targetNode.imageIndex,
      })
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [controlsEnabled, handleUniverseExitIntent, onConfirmSelection, open, targetNode, vectorControls])

  if (!open) {
    return null
  }

  return (
    <section className="vector-universe-overlay" role="dialog" aria-modal="true" aria-label="向量宇宙层">
      <div className="vector-universe-stage-wrap">
        <div ref={sceneHostRef} className="vector-universe-stage" />

        <button className="vector-universe-close-btn" aria-label="关闭向量宇宙" type="button" onClick={onClose}>
          关闭
        </button>

        <VectorUniverseWidget
          cameraPosition={cameraPosition}
          cameraForward={cameraForward}
          worldHalfExtent={worldHalfExtent}
          helperScale={helperScale}
          ready={rendererReady}
          size={widgetSize}
        />

        {!rendererReady ? (
          <p className="vector-universe-overlay-tip">
            当前环境未启用 WebGL，Three.js 渲染链路未启动。
          </p>
        ) : null}

        {!controlsEnabled ? (
          <p className="vector-universe-overlay-tip is-warning">请先在主视图选中图片</p>
        ) : null}

        {escPendingExit ? (
          <p className="vector-universe-overlay-tip is-exit-warning">再按一次 Esc 退出向量宇宙</p>
        ) : null}
      </div>

      <footer className={`vector-universe-hud ${hudCollapsed ? 'is-collapsed' : ''}`}>
        {hudCollapsed ? (
          <p data-testid="vector-universe-hud-compact">
            命中：
            <span data-testid="vector-universe-front-hit">{targetNode ? `${targetNode.packageId} #${targetNode.imageIndex + 1}` : '无命中'}</span>
            {' | '}范围：
            <span data-testid="vector-universe-scope-count">{nodes.length}</span>
            张 | LOD：
            <span data-testid="vector-universe-lod-level">{focusLod ? LOD_LABELS[focusLod] : '无'}</span>
          </p>
        ) : (
          <>
            <p>
              控制：W/A/S/D 本地上左下右，鼠标旋转视角，鼠标左键前进、右键后退，Shift 加速，Space 选中并退出，Esc 连按两次退出，F1 折叠 HUD。
            </p>
            <p>
              鼠标锁定：
              <span>{pointerLocked ? '已锁定' : '未锁定'}</span>
            </p>
            <p>
              正前方命中：
              <span data-testid="vector-universe-front-hit">{targetNode ? `${targetNode.packageId} #${targetNode.imageIndex + 1}` : '无命中'}</span>
            </p>
            <p>
              范围：
              <span data-testid="vector-universe-scope-count">{nodes.length}</span>
              张
            </p>
            <p>
              状态：
              <span data-testid="vector-universe-lod-level">{focusLod ? LOD_LABELS[focusLod] : '未定位 LOD'}</span>
            </p>
            <div role="group" aria-label="LOD 层级标识" className="vector-universe-lod-grid">
              <span data-testid="vector-universe-lod-far">远距离：{lodCounts.far}</span>
              <span data-testid="vector-universe-lod-mid">中距离：{lodCounts.mid}</span>
              <span data-testid="vector-universe-lod-near">近距离：{lodCounts.near}</span>
            </div>
          </>
        )}
      </footer>
    </section>
  )
}

export default VectorUniverseOverlay
