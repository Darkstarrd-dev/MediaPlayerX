import {
  DEFAULT_BILLING_CONFIG,
  type BillingConfigState,
  type BillingPreparedConfig,
  type BillingProcessedPreview,
  type XlsxCellLike,
  type XlsxRuntimeLike,
  type XlsxSheetLike,
  type XlsxWorkbookLike,
} from './types'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function asText(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

function sanitizeColumns(text: string): string[] {
  return text
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
}

function sanitizeColumnWidths(text: string): number[] {
  return text
    .split(',')
    .map((token) => Number.parseFloat(token.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Math.round(value * 10) / 10)
}

function sanitizeExclusionSet(text: string): Set<string> {
  return new Set(
    text
      .split('\n')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  )
}

function normalizeHeaderRow(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_BILLING_CONFIG.headerRow
  }
  return Math.max(1, Math.floor(value))
}

export function prepareBillingConfig(config: BillingConfigState): BillingPreparedConfig {
  const colsToKeep = sanitizeColumns(config.colsToKeepText)
  const colWidths = sanitizeColumnWidths(config.colWidthsText)
  const safeAmountCol = config.amountCol.trim() || DEFAULT_BILLING_CONFIG.amountCol
  const normalizedCols = colsToKeep.length > 0 ? [...colsToKeep] : [safeAmountCol]

  if (!normalizedCols.includes(safeAmountCol)) {
    normalizedCols.push(safeAmountCol)
  }

  return {
    headerRow: normalizeHeaderRow(config.headerRow),
    newSheetName: config.newSheetName.trim() || DEFAULT_BILLING_CONFIG.newSheetName,
    expenseCol: config.expenseCol.trim() || DEFAULT_BILLING_CONFIG.expenseCol,
    expenseKey: config.expenseKey.trim() || DEFAULT_BILLING_CONFIG.expenseKey,
    amountCol: safeAmountCol,
    exclusionCol: config.exclusionCol.trim() || DEFAULT_BILLING_CONFIG.exclusionCol,
    colsToKeep: normalizedCols,
    colWidths,
    exclusionSet: sanitizeExclusionSet(config.exclusionListText),
  }
}

function parseAmount(value: unknown): number {
  const normalized = asText(value).replace(/[¥,\s]/g, '')
  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed)) {
    return 0
  }
  return parsed
}

function readCellText(sheet: XlsxSheetLike, cellId: string): string {
  const cell = sheet[cellId] as XlsxCellLike | undefined
  return asText(cell?.v).trim()
}

export function resolveBillingTitle(sheet: XlsxSheetLike, fallbackSheetName: string): string {
  const title1 = readCellText(sheet, 'A1')
  const title3 = readCellText(sheet, 'A3')
  const title3Part2 = readCellText(sheet, 'C3')
  const merged = `${title1} (${title3} ${title3Part2})`.trim()

  if (merged.replace(/[()\s]/g, '').length > 0) {
    return merged
  }
  return fallbackSheetName
}

export function normalizeSheetName(raw: string): string {
  const base = raw.trim() || DEFAULT_BILLING_CONFIG.newSheetName
  const cleaned = base.replace(/[\\/*?:[\]]/g, '_').trim()
  const safe = cleaned.length > 0 ? cleaned : DEFAULT_BILLING_CONFIG.newSheetName
  return safe.slice(0, 31)
}

export function resolveColumnWidthsForPreview(
  preferred: number[],
  colCount: number,
): number[] {
  const fallback = sanitizeColumnWidths(DEFAULT_BILLING_CONFIG.colWidthsText)
  const widths: number[] = []

  for (let index = 0; index < colCount; index += 1) {
    const preferredWidth = preferred[index]
    const fallbackWidth = fallback[index] ?? 12
    const width = Number.isFinite(preferredWidth) ? preferredWidth : fallbackWidth
    widths.push(Math.round(clamp(width, 1, 50) * 10) / 10)
  }

  return widths
}

export function formatWidthsText(widths: number[]): string {
  return widths.map((width) => width.toFixed(1)).join(', ')
}

export function buildBillingProcessedPreview({
  workbook,
  runtime,
  config,
}: {
  workbook: XlsxWorkbookLike
  runtime: XlsxRuntimeLike
  config: BillingPreparedConfig
}): BillingProcessedPreview {
  const sourceSheetName = workbook.SheetNames[0]
  const sourceSheet = sourceSheetName ? workbook.Sheets[sourceSheetName] : null
  if (!sourceSheetName || !sourceSheet) {
    throw new Error('找不到可用工作表')
  }

  const title = resolveBillingTitle(sourceSheet, config.newSheetName)
  const jsonRows = runtime.utils.sheet_to_json<Record<string, unknown>>(sourceSheet, {
    range: Math.max(0, config.headerRow - 1),
  })

  let totalAmount = 0
  const processedRows = jsonRows
    .filter((row) => asText(row[config.expenseCol]) === config.expenseKey)
    .filter((row) => !config.exclusionSet.has(asText(row[config.exclusionCol]).trim()))
    .map((row) => {
      const amount = parseAmount(row[config.amountCol])
      totalAmount += amount

      const mapped = config.colsToKeep.map((column) => {
        if (column === config.amountCol) {
          return amount
        }
        return asText(row[column])
      })
      return mapped
    })

  const amountColIndex = config.colsToKeep.indexOf(config.amountCol)
  const safeAmountColIndex = amountColIndex >= 0 ? amountColIndex : 0

  const outputAoA: Array<Array<string | number | null>> = []
  outputAoA.push([title])
  outputAoA.push(...processedRows)

  const sumRow = new Array(config.colsToKeep.length).fill(null) as Array<string | number | null>
  if (safeAmountColIndex > 0) {
    sumRow[safeAmountColIndex - 1] = '合计'
  }
  sumRow[safeAmountColIndex] = Number(totalAmount.toFixed(2))
  outputAoA.push(sumRow)

  const actualRow = new Array(config.colsToKeep.length).fill(null) as Array<string | number | null>
  if (safeAmountColIndex > 0) {
    actualRow[safeAmountColIndex - 1] = '实际'
  }
  outputAoA.push(actualRow)

  return {
    outputAoA,
    title,
    colNames: config.colsToKeep,
    amountColIndex: safeAmountColIndex,
    totalAmount: Number(totalAmount.toFixed(2)),
    rowCount: processedRows.length,
  }
}
