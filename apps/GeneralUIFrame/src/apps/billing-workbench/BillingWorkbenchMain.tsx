import type { BillingWorkbenchModel } from './useBillingWorkbench'

interface BillingWorkbenchMainProps {
  model: BillingWorkbenchModel
}

function formatCell(cell: string | number | null, isAmountCell: boolean): string {
  if (cell === null) {
    return ''
  }
  if (typeof cell === 'number' && isAmountCell) {
    return cell.toFixed(2)
  }
  return String(cell)
}

export function BillingWorkbenchMain({ model }: BillingWorkbenchMainProps) {
  const preview = model.preview

  if (!preview) {
    return (
      <div className="billing-main-shell">
        <section className="billing-main-placeholder">
          <p>处理后将在此处显示预览和调整工具</p>
        </section>
      </div>
    )
  }

  const sumRowIndex = preview.outputAoA.length - 2

  return (
    <div className="billing-main-shell">
      <section className="billing-width-controls">
        <h3 className="billing-step-title">第 4 步：预览和调整（可横向滚动）</h3>
        <p className="billing-width-hint">调整列宽（单位：ch）</p>
        <div className="billing-width-grid">
          {preview.colNames.map((colName, index) => {
            const width = model.columnWidths[index] ?? 12
            return (
              <label key={colName + String(index)} className="billing-width-control">
                <span>{colName}</span>
                <div className="billing-width-control-row">
                  <input
                    type="range"
                    min={1}
                    max={50}
                    step={0.5}
                    value={width}
                    onChange={(event) => model.onColumnWidthChange(index, Number(event.target.value))}
                  />
                  <input
                    className="billing-width-number"
                    type="number"
                    min={1}
                    max={50}
                    step={0.5}
                    value={width}
                    onChange={(event) => model.onColumnWidthChange(index, Number(event.target.value))}
                  />
                </div>
              </label>
            )
          })}
        </div>
      </section>

      <section className="billing-table-wrapper mpx-scroll-area">
        <table className="billing-preview-table">
          <colgroup>
            {model.columnWidths.map((width, index) => (
              <col key={index} style={{ width: `${width}ch` }} />
            ))}
          </colgroup>
          <tbody>
            {preview.outputAoA.map((row, rowIndex) => {
              if (rowIndex === 0) {
                return (
                  <tr key={`title-${rowIndex}`}>
                    <td className="billing-title-cell" colSpan={preview.colNames.length}>
                      {row[0]}
                    </td>
                  </tr>
                )
              }

              return (
                <tr key={`row-${rowIndex}`} className={rowIndex === sumRowIndex ? 'is-sum-row' : ''}>
                  {row.map((cell, cellIndex) => {
                    const isAmountCell = cellIndex === preview.amountColIndex
                    const isSummaryLabelCell =
                      cellIndex === Math.max(0, preview.amountColIndex - 1) &&
                      (rowIndex === sumRowIndex || rowIndex === sumRowIndex + 1)
                    const className = isAmountCell && rowIndex === sumRowIndex
                      ? 'billing-sum-cell'
                      : isSummaryLabelCell
                        ? 'billing-summary-label-cell'
                        : undefined

                    return (
                      <td key={`${rowIndex}-${cellIndex}`} className={className}>
                        {formatCell(cell, isAmountCell && rowIndex === sumRowIndex)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="billing-download-row">
        <a
          className={`feature-action-btn billing-download-btn${model.downloadUrl ? '' : ' is-disabled'}`}
          href={model.downloadUrl ?? '#'}
          download={model.downloadFileName}
          aria-disabled={!model.downloadUrl}
          onClick={(event) => {
            if (!model.downloadUrl) {
              event.preventDefault()
            }
          }}
        >
          第 5 步：下载处理后的文件
        </a>
      </section>
    </div>
  )
}
