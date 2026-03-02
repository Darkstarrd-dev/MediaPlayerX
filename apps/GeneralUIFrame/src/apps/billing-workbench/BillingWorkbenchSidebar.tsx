import type { ChangeEvent } from 'react'

import type { BillingWorkbenchModel } from './useBillingWorkbench'

interface BillingWorkbenchSidebarProps {
  model: BillingWorkbenchModel
}

function onNumericChange(event: ChangeEvent<HTMLInputElement>, fallback = 1): number {
  const parsed = Number.parseInt(event.target.value, 10)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.max(1, parsed)
}

export function BillingWorkbenchSidebar({ model }: BillingWorkbenchSidebarProps) {
  const { config, busy, notice } = model

  return (
    <div className="billing-sidebar-content">
      <section className="billing-step-card">
        <h3 className="billing-step-title">第 1 步：上传文件</h3>
        <input
          className="sidebar-rename-seamless-control billing-file-input"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null
            void model.onFileSelected(file)
          }}
        />
        <p className="billing-file-name">{model.sourceFileName || '未选择文件'}</p>
      </section>

      <section className="billing-step-card">
        <h3 className="billing-step-title">第 2 步：处理设置</h3>

        <div className="mpx-overlay-seamless-row billing-config-row">
          <span className="sidebar-rename-mode-prefix">数据起始行</span>
          <input
            className="sidebar-rename-seamless-control"
            type="number"
            value={config.headerRow}
            onChange={(event) => model.onConfigPatch({ headerRow: onNumericChange(event, config.headerRow) })}
          />
        </div>

        <div className="mpx-overlay-seamless-row billing-config-row">
          <span className="sidebar-rename-mode-prefix">新工作表名称</span>
          <input
            className="sidebar-rename-seamless-control"
            type="text"
            value={config.newSheetName}
            onChange={(event) => model.onConfigPatch({ newSheetName: event.target.value })}
          />
        </div>

        <div className="mpx-overlay-seamless-row billing-config-row">
          <span className="sidebar-rename-mode-prefix">筛选列名</span>
          <input
            className="sidebar-rename-seamless-control"
            type="text"
            value={config.expenseCol}
            onChange={(event) => model.onConfigPatch({ expenseCol: event.target.value })}
          />
        </div>

        <div className="mpx-overlay-seamless-row billing-config-row">
          <span className="sidebar-rename-mode-prefix">筛选关键词</span>
          <input
            className="sidebar-rename-seamless-control"
            type="text"
            value={config.expenseKey}
            onChange={(event) => model.onConfigPatch({ expenseKey: event.target.value })}
          />
        </div>

        <div className="mpx-overlay-seamless-row billing-config-row">
          <span className="sidebar-rename-mode-prefix">金额列名</span>
          <input
            className="sidebar-rename-seamless-control"
            type="text"
            value={config.amountCol}
            onChange={(event) => model.onConfigPatch({ amountCol: event.target.value })}
          />
        </div>

        <div className="mpx-overlay-seamless-row billing-config-row">
          <span className="sidebar-rename-mode-prefix">排除名单所用列</span>
          <input
            className="sidebar-rename-seamless-control"
            type="text"
            value={config.exclusionCol}
            onChange={(event) => model.onConfigPatch({ exclusionCol: event.target.value })}
          />
        </div>

        <div className="billing-config-block">
          <label className="sidebar-rename-mode-prefix" htmlFor="billing-cols-to-keep">
            保留列（英文逗号分隔）
          </label>
          <textarea
            id="billing-cols-to-keep"
            className="sidebar-rename-seamless-control billing-textarea"
            value={config.colsToKeepText}
            onChange={(event) => model.onConfigPatch({ colsToKeepText: event.target.value })}
          />
        </div>

        <div className="billing-config-block">
          <label className="sidebar-rename-mode-prefix" htmlFor="billing-col-widths">
            列宽（由主区调整同步）
          </label>
          <textarea
            id="billing-col-widths"
            className="sidebar-rename-seamless-control billing-textarea"
            value={config.colWidthsText}
            readOnly
          />
        </div>

        <div className="billing-config-block">
          <label className="sidebar-rename-mode-prefix" htmlFor="billing-exclusion-list">
            排除名单（每行一个）
          </label>
          <textarea
            id="billing-exclusion-list"
            className="sidebar-rename-seamless-control billing-textarea"
            value={config.exclusionListText}
            onChange={(event) => model.onConfigPatch({ exclusionListText: event.target.value })}
          />
        </div>
      </section>

      <section className="billing-step-card">
        <h3 className="billing-step-title">第 3 步：处理</h3>
        <button
          className="feature-action-btn billing-process-btn"
          type="button"
          disabled={!model.canGeneratePreview}
          onClick={() => {
            void model.onGeneratePreview()
          }}
        >
          生成处理后预览
        </button>
        <p className={`billing-message is-${notice?.tone ?? 'info'}`}>{notice?.text ?? (busy ? '处理中...' : '')}</p>
      </section>
    </div>
  )
}
