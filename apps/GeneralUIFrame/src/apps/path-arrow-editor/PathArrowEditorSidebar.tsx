import type { ArrowPath } from './types'
import type { PathArrowEditorModel } from './usePathArrowEditor'

interface PathArrowEditorSidebarProps {
  model: PathArrowEditorModel
}

function NumberPairControl({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <div className="path-arrow-control-input">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}

function PathStyleControls({
  path,
  model,
}: {
  path: ArrowPath
  model: PathArrowEditorModel
}) {
  return (
    <div className="path-arrow-path-card-body">
      <div className="path-arrow-control-row">
        <span className="path-arrow-control-label">颜色</span>
        <div className="path-arrow-control-input">
          <input
            type="color"
            value={path.useCustomColor ? path.style.color : model.globalColor}
            onChange={(event) => model.onUpdatePathStyle(path.id, { color: event.target.value })}
          />
          {path.useCustomColor ? (
            <button type="button" className="path-arrow-mini-btn" onClick={() => model.onResetPathColor(path.id)}>
              重置
            </button>
          ) : (
            <span className="path-arrow-mini-hint">使用全局</span>
          )}
        </div>
      </div>

      <div className="path-arrow-control-row">
        <span className="path-arrow-control-label">循环时间</span>
        <NumberPairControl
          value={path.style.duration}
          min={1}
          max={10}
          step={0.5}
          onChange={(value) => model.onUpdatePathStyle(path.id, { duration: value })}
        />
      </div>

      <div className="path-arrow-control-row">
        <span className="path-arrow-control-label">时间偏移</span>
        <NumberPairControl
          value={path.style.timeOffset}
          min={0}
          max={10}
          step={0.1}
          onChange={(value) => model.onUpdatePathStyle(path.id, { timeOffset: value })}
        />
      </div>

      <div className="path-arrow-control-row">
        <span className="path-arrow-control-label">箭头数量</span>
        <NumberPairControl
          value={path.style.arrowCount}
          min={1}
          max={10}
          step={1}
          onChange={(value) => model.onUpdatePathStyle(path.id, { arrowCount: value })}
        />
      </div>

      <div className="path-arrow-control-row">
        <span className="path-arrow-control-label">三角高度</span>
        <NumberPairControl
          value={path.style.triangleHeight}
          min={5}
          max={50}
          step={1}
          onChange={(value) => model.onUpdatePathStyle(path.id, { triangleHeight: value })}
        />
      </div>

      <div className="path-arrow-control-row">
        <span className="path-arrow-control-label">三角底宽</span>
        <NumberPairControl
          value={path.style.triangleWidth}
          min={5}
          max={50}
          step={1}
          onChange={(value) => model.onUpdatePathStyle(path.id, { triangleWidth: value })}
        />
      </div>

      <div className="path-arrow-control-row">
        <span className="path-arrow-control-label">尾巴长度</span>
        <NumberPairControl
          value={path.style.tailLength}
          min={0}
          max={80}
          step={1}
          onChange={(value) => model.onUpdatePathStyle(path.id, { tailLength: value })}
        />
      </div>

      <div className="path-arrow-control-row">
        <span className="path-arrow-control-label">尾巴宽度</span>
        <NumberPairControl
          value={path.style.tailWidth}
          min={2}
          max={30}
          step={1}
          onChange={(value) => model.onUpdatePathStyle(path.id, { tailWidth: value })}
        />
      </div>

      <div className="path-arrow-control-row">
        <span className="path-arrow-control-label">锚点数</span>
        <div className="path-arrow-control-input">
          <span className="path-arrow-mini-hint">{path.points.length}</span>
        </div>
      </div>
    </div>
  )
}

export function PathArrowEditorSidebar({ model }: PathArrowEditorSidebarProps) {
  return (
    <div className="path-arrow-sidebar-content">
      <section className="path-arrow-sidebar-card">
        <h3 className="path-arrow-card-title">全局样式（新建路径）</h3>

        <div className="path-arrow-control-row">
          <span className="path-arrow-control-label">全局颜色</span>
          <div className="path-arrow-control-input">
            <input
              type="color"
              value={model.globalColor}
              onChange={(event) => model.onUpdateGlobalColor(event.target.value)}
            />
          </div>
        </div>

        <div className="path-arrow-control-row">
          <span className="path-arrow-control-label">三角高度</span>
          <NumberPairControl
            value={model.globalArrowStyle.triangleHeight}
            min={5}
            max={50}
            step={1}
            onChange={(value) => model.onUpdateGlobalArrowStyle({ triangleHeight: value })}
          />
        </div>

        <div className="path-arrow-control-row">
          <span className="path-arrow-control-label">三角底宽</span>
          <NumberPairControl
            value={model.globalArrowStyle.triangleWidth}
            min={5}
            max={50}
            step={1}
            onChange={(value) => model.onUpdateGlobalArrowStyle({ triangleWidth: value })}
          />
        </div>

        <div className="path-arrow-control-row">
          <span className="path-arrow-control-label">尾巴长度</span>
          <NumberPairControl
            value={model.globalArrowStyle.tailLength}
            min={0}
            max={80}
            step={1}
            onChange={(value) => model.onUpdateGlobalArrowStyle({ tailLength: value })}
          />
        </div>

        <div className="path-arrow-control-row">
          <span className="path-arrow-control-label">尾巴宽度</span>
          <NumberPairControl
            value={model.globalArrowStyle.tailWidth}
            min={2}
            max={30}
            step={1}
            onChange={(value) => model.onUpdateGlobalArrowStyle({ tailWidth: value })}
          />
        </div>
      </section>

      <section className="path-arrow-sidebar-card">
        <h3 className="path-arrow-card-title">路径列表</h3>

        <div className="path-arrow-path-list">
          {model.paths.map((path) => {
            const selected = path.id === model.selectedPathId
            return (
              <article key={path.id} className={`path-arrow-path-card${selected ? ' is-selected' : ''}`}>
                <header className="path-arrow-path-card-header" onClick={() => model.onSelectPath(path.id)}>
                  <div className="path-arrow-path-main">
                    <button
                      type="button"
                      className={`path-arrow-collapse-btn${path.collapsed ? ' is-collapsed' : ''}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        model.onTogglePathCollapsed(path.id)
                      }}
                    >
                      ▼
                    </button>
                    <input
                      value={path.name}
                      className="path-arrow-path-name-input"
                      onChange={(event) => model.onPathNameChange(path.id, event.target.value)}
                    />
                  </div>

                  <div className="path-arrow-path-actions">
                    <button type="button" className="path-arrow-mini-btn" onClick={(event) => { event.stopPropagation(); model.onCopyPath(path.id) }}>
                      复制
                    </button>
                    <button type="button" className="path-arrow-mini-btn" onClick={(event) => { event.stopPropagation(); model.onReversePath(path.id) }}>
                      反转
                    </button>
                    <button type="button" className="path-arrow-mini-btn is-danger" onClick={(event) => { event.stopPropagation(); model.onDeletePath(path.id) }}>
                      删除
                    </button>
                  </div>
                </header>

                {path.collapsed ? null : <PathStyleControls path={path} model={model} />}
              </article>
            )
          })}

          {model.paths.length === 0 ? <div className="panel-placeholder">请先导入图片并创建路径。</div> : null}
        </div>

        <button className="feature-action-btn path-arrow-add-path-btn" type="button" disabled={!model.imageLoaded} onClick={model.onAddPath}>
          新建路径
        </button>
      </section>
    </div>
  )
}
