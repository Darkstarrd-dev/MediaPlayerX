interface DragImportOverlayProps {
  active: boolean
}

function DragImportOverlay({ active }: DragImportOverlayProps) {
  if (!active) {
    return null
  }

  return (
    <div className="drop-overlay" aria-hidden="true">
      <div className="drop-overlay-card">
        <strong>拖拽导入</strong>
        <p>释放鼠标后将自动入队并在上方显示任务状态</p>
      </div>
    </div>
  )
}

export default DragImportOverlay
