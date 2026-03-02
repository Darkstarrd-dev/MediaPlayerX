export interface BillingConfigState {
  headerRow: number
  newSheetName: string
  expenseCol: string
  expenseKey: string
  amountCol: string
  exclusionCol: string
  colsToKeepText: string
  colWidthsText: string
  exclusionListText: string
}

export interface BillingPreparedConfig {
  headerRow: number
  newSheetName: string
  expenseCol: string
  expenseKey: string
  amountCol: string
  exclusionCol: string
  colsToKeep: string[]
  colWidths: number[]
  exclusionSet: Set<string>
}

export interface BillingProcessedPreview {
  outputAoA: Array<Array<string | number | null>>
  title: string
  colNames: string[]
  amountColIndex: number
  totalAmount: number
  rowCount: number
}

export interface XlsxCellLike {
  v?: unknown
  t?: string
  z?: string
}

export interface XlsxSheetLike {
  [key: string]: unknown
  ['!merges']?: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }>
  ['!cols']?: Array<{ wch: number }>
}

export interface XlsxWorkbookLike {
  SheetNames: string[]
  Sheets: Record<string, XlsxSheetLike>
}

export interface XlsxRuntimeLike {
  read: (data: ArrayBuffer | Uint8Array, options: { type: 'array' }) => XlsxWorkbookLike
  write: (workbook: XlsxWorkbookLike, options: { bookType: 'xlsx'; type: 'array' }) => ArrayBuffer
  utils: {
    sheet_to_json: <T>(sheet: XlsxSheetLike, options: { range: number }) => T[]
    aoa_to_sheet: (aoa: Array<Array<string | number | null>>) => XlsxSheetLike
    book_new: () => XlsxWorkbookLike
    book_append_sheet: (workbook: XlsxWorkbookLike, sheet: XlsxSheetLike, name: string) => void
    encode_cell: (cell: { r: number; c: number }) => string
  }
}

export interface BillingWorkspaceState {
  config: BillingConfigState
}

export const DEFAULT_BILLING_CONFIG: BillingConfigState = {
  headerRow: 17,
  newSheetName: '支出明细',
  expenseCol: '收/支',
  expenseKey: '支出',
  amountCol: '金额(元)',
  exclusionCol: '交易对方',
  colsToKeepText: '交易时间, 交易对方, 商品, 收/支, 金额(元), 支付方式, 当前状态',
  colWidthsText: '10.8, 22, 18, 5, 9, 8, 11',
  exclusionListText: '',
}
