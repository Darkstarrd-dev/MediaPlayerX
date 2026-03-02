import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ensureXlsxRuntime } from './billing.cdn'
import {
  buildBillingProcessedPreview,
  formatWidthsText,
  normalizeSheetName,
  prepareBillingConfig,
  resolveColumnWidthsForPreview,
} from './billing.logic'
import { loadBillingWorkspaceState, persistBillingWorkspaceState } from './billing.storage'
import type {
  BillingConfigState,
  BillingProcessedPreview,
  XlsxCellLike,
  XlsxRuntimeLike,
  XlsxWorkbookLike,
} from './types'

type NoticeTone = 'info' | 'success' | 'error'

interface BillingNotice {
  tone: NoticeTone
  text: string
}

export interface BillingWorkbenchModel {
  config: BillingConfigState
  sourceFileName: string
  busy: boolean
  notice: BillingNotice | null
  preview: BillingProcessedPreview | null
  columnWidths: number[]
  downloadUrl: string | null
  downloadFileName: string
  canGeneratePreview: boolean
  aiSummary: {
    enabled: boolean
    provider: string
    modelName: string
  }
  onConfigPatch: (patch: Partial<BillingConfigState>) => void
  onFileSelected: (file: File | null) => Promise<void>
  onGeneratePreview: () => Promise<void>
  onColumnWidthChange: (index: number, nextWidth: number) => void
}

interface UseBillingWorkbenchParams {
  aiSummary: {
    enabled: boolean
    provider: string
    modelName: string
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return fallback
}

function toHeaderRow(raw: string): number {
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed)) {
    return 1
  }
  return Math.max(1, parsed)
}

export function useBillingWorkbench({ aiSummary }: UseBillingWorkbenchParams): BillingWorkbenchModel {
  const [config, setConfig] = useState<BillingConfigState>(() => loadBillingWorkspaceState().config)
  const [sourceFileName, setSourceFileName] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<BillingNotice | null>(null)
  const [preview, setPreview] = useState<BillingProcessedPreview | null>(null)
  const [columnWidths, setColumnWidths] = useState<number[]>([])
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [downloadFileName, setDownloadFileName] = useState('支出明细.xlsx')

  const runtimeRef = useRef<XlsxRuntimeLike | null>(null)
  const workbookRef = useRef<XlsxWorkbookLike | null>(null)

  useEffect(() => {
    persistBillingWorkspaceState({ config })
  }, [config])

  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl)
      }
    }
  }, [downloadUrl])

  const onConfigPatch = useCallback((patch: Partial<BillingConfigState>) => {
    setConfig((previous) => ({ ...previous, ...patch }))
  }, [])

  const ensureRuntime = useCallback(async (): Promise<XlsxRuntimeLike> => {
    if (runtimeRef.current) {
      return runtimeRef.current
    }
    const runtime = await ensureXlsxRuntime()
    runtimeRef.current = runtime
    return runtime
  }, [])

  const onFileSelected = useCallback(
    async (file: File | null) => {
      if (!file) {
        return
      }

      setBusy(true)
      setNotice({ tone: 'info', text: '正在加载文件...' })
      setPreview(null)
      setColumnWidths([])

      try {
        const runtime = await ensureRuntime()
        const arrayBuffer = await file.arrayBuffer()
        const workbook = runtime.read(new Uint8Array(arrayBuffer), { type: 'array' })
        workbookRef.current = workbook
        setSourceFileName(file.name)
        setNotice({ tone: 'success', text: `文件 "${file.name}" 已加载。` })
      } catch (error) {
        workbookRef.current = null
        setSourceFileName('')
        setNotice({ tone: 'error', text: `文件加载失败：${toErrorMessage(error, '无法读取文件')}` })
      } finally {
        setBusy(false)
      }
    },
    [ensureRuntime],
  )

  const onGeneratePreview = useCallback(async () => {
    const workbook = workbookRef.current
    if (!workbook) {
      setNotice({ tone: 'error', text: '请先上传一个文件。' })
      return
    }

    setBusy(true)
    setNotice({ tone: 'info', text: '正在处理中...' })

    try {
      const runtime = await ensureRuntime()
      const preparedConfig = prepareBillingConfig(config)
      const nextPreview = buildBillingProcessedPreview({
        workbook,
        runtime,
        config: preparedConfig,
      })
      const widths = resolveColumnWidthsForPreview(preparedConfig.colWidths, nextPreview.colNames.length)

      setPreview(nextPreview)
      setColumnWidths(widths)
      setConfig((previous) => ({
        ...previous,
        headerRow: toHeaderRow(String(previous.headerRow)),
        colWidthsText: formatWidthsText(widths),
      }))
      setNotice({
        tone: 'success',
        text: `处理完成：共 ${nextPreview.rowCount} 条支出记录，合计 ${nextPreview.totalAmount.toFixed(2)} 元。`,
      })
    } catch (error) {
      setPreview(null)
      setColumnWidths([])
      setNotice({ tone: 'error', text: `处理失败：${toErrorMessage(error, '请检查列名或设置')}` })
    } finally {
      setBusy(false)
    }
  }, [config, ensureRuntime])

  const onColumnWidthChange = useCallback((index: number, nextWidth: number) => {
    setColumnWidths((previous) => {
      if (index < 0 || index >= previous.length) {
        return previous
      }
      const next = [...previous]
      next[index] = Math.round(clamp(nextWidth, 1, 50) * 10) / 10
      setConfig((current) => ({
        ...current,
        colWidthsText: formatWidthsText(next),
      }))
      return next
    })
  }, [])

  useEffect(() => {
    if (!preview || columnWidths.length === 0) {
      setDownloadUrl((previous) => {
        if (previous) {
          URL.revokeObjectURL(previous)
        }
        return null
      })
      return
    }

    const runtime = runtimeRef.current
    if (!runtime) {
      return
    }

    const sheetName = normalizeSheetName(config.newSheetName)
    const workbook = runtime.utils.book_new()
    const sheet = runtime.utils.aoa_to_sheet(preview.outputAoA)

    sheet['!merges'] = [
      {
        s: { r: 0, c: 0 },
        e: { r: 0, c: Math.max(0, preview.colNames.length - 1) },
      },
    ]

    sheet['!cols'] = columnWidths.map((width) => ({ wch: width }))

    const sumRowIndex = preview.outputAoA.length - 2
    if (sumRowIndex >= 0) {
      const sumCellAddress = runtime.utils.encode_cell({
        r: sumRowIndex,
        c: preview.amountColIndex,
      })
      const sumCell = sheet[sumCellAddress] as XlsxCellLike | undefined
      if (sumCell) {
        sumCell.t = 'n'
        sumCell.z = '0.00'
      }
    }

    runtime.utils.book_append_sheet(workbook, sheet, sheetName)
    const output = runtime.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([output], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const nextUrl = URL.createObjectURL(blob)

    setDownloadFileName(`${sheetName}.xlsx`)
    setDownloadUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous)
      }
      return nextUrl
    })
  }, [columnWidths, config.newSheetName, preview])

  const canGeneratePreview = useMemo(() => sourceFileName.length > 0 && !busy, [busy, sourceFileName])

  return {
    config,
    sourceFileName,
    busy,
    notice,
    preview,
    columnWidths,
    downloadUrl,
    downloadFileName,
    canGeneratePreview,
    aiSummary,
    onConfigPatch,
    onFileSelected,
    onGeneratePreview,
    onColumnWidthChange,
  }
}
