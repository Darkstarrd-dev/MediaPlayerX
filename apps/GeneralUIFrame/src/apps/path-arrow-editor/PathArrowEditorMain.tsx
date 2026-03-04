import type { PathArrowEditorModel } from './usePathArrowEditor'

interface PathArrowEditorMainProps {
  model: PathArrowEditorModel
}

export function PathArrowEditorMain({ model }: PathArrowEditorMainProps) {
  const {
    fileInputRef,
    jsonFileInputRef,
    mainCanvasRef,
    overlayCanvasRef,
    interactionCanvasRef,
    canvasContainerRef,
    canvasWrapperRef,
    imageLoaded,
    imageName,
    statusText,
    zoom,
    paths,
    isPlaying,
    isExporting,
    exportProgress,
    onTriggerImageImport,
    onImageFileChange,
    onTriggerJsonImport,
    onJsonFileChange,
    onExportJson,
    onZoomIn,
    onZoomOut,
    onZoomFit,
    onZoomReset,
    onTogglePlay,
    onExportAnimation,
    onCanvasPointerDown,
    onCanvasPointerMove,
    onCanvasPointerUp,
    onCanvasContextMenu,
  } = model

  return (
    <div className="path-arrow-main-shell">
      <div className="path-arrow-header">
        <div className="path-arrow-header-group">
          <button className="feature-action-btn" type="button" onClick={onTriggerImageImport} disabled={isExporting}>
            导入图片
          </button>
          <button className="feature-action-btn" type="button" onClick={onTriggerJsonImport} disabled={isExporting}>
            导入路径
          </button>
          <button className="feature-action-btn" type="button" onClick={onExportJson} disabled={paths.length === 0 || isExporting}>
            导出路径
          </button>
        </div>

        <div className="path-arrow-header-group">
          <button className="feature-action-btn" type="button" onClick={onZoomOut} disabled={isExporting}>
            -
          </button>
          <span className="path-arrow-zoom-value">{Math.round(zoom * 100)}%</span>
          <button className="feature-action-btn" type="button" onClick={onZoomIn} disabled={isExporting}>
            +
          </button>
          <button className="feature-action-btn" type="button" onClick={onZoomFit} disabled={!imageLoaded || isExporting}>
            适应
          </button>
          <button className="feature-action-btn" type="button" onClick={onZoomReset} disabled={isExporting}>
            1:1
          </button>
        </div>

        <div className="path-arrow-header-group">
          <button className="feature-action-btn" type="button" onClick={onTogglePlay} disabled={!imageLoaded || isExporting}>
            {isPlaying ? '停止' : '播放'}
          </button>
          <button className="feature-action-btn" type="button" onClick={() => void onExportAnimation('gif')} disabled={!imageLoaded || isExporting}>
            导出GIF
          </button>
          <button className="feature-action-btn" type="button" onClick={() => void onExportAnimation('mp4')} disabled={!imageLoaded || isExporting}>
            导出MP4
          </button>
          <button className="feature-action-btn" type="button" onClick={() => void onExportAnimation('png')} disabled={!imageLoaded || isExporting}>
            导出PNG
          </button>
        </div>

        <div className="path-arrow-header-note">左键新增/拖拽锚点，右键选择锚点，Delete 删除</div>
      </div>

      <div className="path-arrow-canvas-container" ref={canvasContainerRef}>
        <div className={`path-arrow-upload-hint${imageLoaded ? ' is-hidden' : ''}`} onClick={onTriggerImageImport}>
          <div className="path-arrow-upload-icon">📁</div>
          <p>点击导入图片开始编辑</p>
        </div>

        <div className={`path-arrow-canvas-wrapper${imageLoaded ? '' : ' is-hidden'}`} ref={canvasWrapperRef}>
          <canvas ref={mainCanvasRef} />
          <canvas ref={overlayCanvasRef} className="path-arrow-overlay-canvas" />
          <canvas
            ref={interactionCanvasRef}
            className="path-arrow-interaction-canvas"
            onMouseDown={onCanvasPointerDown}
            onMouseMove={onCanvasPointerMove}
            onMouseUp={onCanvasPointerUp}
            onMouseLeave={onCanvasPointerUp}
            onContextMenu={onCanvasContextMenu}
          />
        </div>
      </div>

      <div className="path-arrow-status-bar">
        <span>{statusText}</span>
        <span>{isExporting ? `导出进度 ${exportProgress}%` : imageName || '未加载图片'}</span>
      </div>

      <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" hidden onChange={onImageFileChange} />
      <input ref={jsonFileInputRef} type="file" accept=".json,application/json" hidden onChange={onJsonFileChange} />
    </div>
  )
}
