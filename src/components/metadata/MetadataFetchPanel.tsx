import { useEffect, useMemo, useState } from 'react'

import type { ExternalMetadataResultItemDto } from '../../contracts/backend'
import {
  parseExternalMetadataToHitomi,
  type ParsedExternalMetadata,
} from '../../features/metadata/parseExternalMetadata'

interface MetadataFetchPanelProps {
  open: boolean
  defaultText: string
  proxyServer: string
  metadataPending: boolean
  targetPackageLabel: string
  onClose: () => void
  onSaveParsedMetadata: (parsed: ParsedExternalMetadata) => Promise<void>
}

type SourceMode = 'all' | 'nhentai' | 'ehentai'

function MetadataFetchPanel({
  open,
  defaultText,
  proxyServer,
  metadataPending,
  targetPackageLabel,
  onClose,
  onSaveParsedMetadata,
}: MetadataFetchPanelProps) {
  const [sourceMode, setSourceMode] = useState<SourceMode>('all')
  const [inputText, setInputText] = useState(defaultText)
  const [inputId, setInputId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<ExternalMetadataResultItemDto[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [parsed, setParsed] = useState<ParsedExternalMetadata | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    setInputText(defaultText)
    setInputId('')
    setItems([])
    setSelectedIndex(0)
    setParsed(null)
    setError(null)
  }, [defaultText, open])

  const selectedItem = items[selectedIndex] ?? null

  const canSearch = inputText.trim().length > 0 || inputId.trim().length > 0
  const canParse = Boolean(selectedItem)
  const canSave = Boolean(parsed) && !saving && !metadataPending

  const previewRaw = useMemo(() => {
    if (!selectedItem) {
      return ''
    }
    return JSON.stringify(selectedItem.raw, null, 2)
  }, [selectedItem])

  const previewParsed = useMemo(() => {
    if (!parsed) {
      return ''
    }
    return JSON.stringify(parsed, null, 2)
  }, [parsed])

  if (!open) {
    return null
  }

  const runSearch = async () => {
    const api = window.mediaPlayerBackend
    if (!api?.searchExternalMetadata) {
      setError('当前后端不支持元数据检索')
      return
    }

    setLoading(true)
    setError(null)
    setParsed(null)
    try {
      const response = await api.searchExternalMetadata({
        input_text: inputText.trim() || undefined,
        input_id: inputId.trim() || undefined,
        source: sourceMode === 'all' ? undefined : sourceMode,
        proxy_server: proxyServer.trim() || undefined,
      })
      setItems(response.items)
      setSelectedIndex(0)
      if (response.items.length === 0) {
        setError('未检索到结果')
      }
    } catch (searchError) {
      setItems([])
      setSelectedIndex(0)
      setError(searchError instanceof Error ? searchError.message : '检索失败')
    } finally {
      setLoading(false)
    }
  }

  const runParse = () => {
    if (!selectedItem) {
      return
    }
    try {
      setParsed(parseExternalMetadataToHitomi(selectedItem))
      setError(null)
    } catch (parseError) {
      setParsed(null)
      setError(parseError instanceof Error ? parseError.message : '解析失败')
    }
  }

  const runSave = async () => {
    if (!parsed) {
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSaveParsedMetadata(parsed)
      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-floating-mask" role="dialog" aria-modal="true" aria-label="获取元数据">
      <section className="settings-floating-panel metadata-fetch-panel" data-overlay-close="metadata-fetch-panel">
        <h3>获取元数据</h3>
        <p className="settings-placeholder">目标图包：{targetPackageLabel || '-'}</p>

        <div className="metadata-fetch-input-grid">
          <label>
            来源
            <select value={sourceMode} onChange={(event) => setSourceMode(event.target.value as SourceMode)}>
              <option value="all">全部</option>
              <option value="nhentai">Nhentai</option>
              <option value="ehentai">E-Hentai</option>
            </select>
          </label>
          <label>
            Text
            <input
              type="text"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void runSearch()
                }
              }}
            />
          </label>
          <label>
            ID
            <input
              type="text"
              value={inputId}
              onChange={(event) => setInputId(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void runSearch()
                }
              }}
            />
          </label>
        </div>

        <div className="settings-floating-actions">
          <button type="button" disabled={!canSearch || loading} onClick={() => void runSearch()}>
            {loading ? '检索中...' : '检索'}
          </button>
          <button type="button" disabled={!canParse} onClick={runParse}>
            解析
          </button>
          <button type="button" disabled={!canSave} onClick={() => void runSave()}>
            {saving ? '保存中...' : '保存'}
          </button>
          <button type="button" onClick={onClose}>关闭</button>
        </div>

        {error ? <p className="settings-danger-text">{error}</p> : null}

        <div className="metadata-fetch-results">
          <ul className="metadata-fetch-result-list">
            {items.map((item, index) => (
              <li key={`${item.source}-${item.id}-${index}`}>
                <button
                  type="button"
                  className={index === selectedIndex ? 'is-active' : ''}
                  onClick={() => {
                    setSelectedIndex(index)
                    setParsed(null)
                  }}
                >
                  <strong>{item.title}</strong>
                  <span>{`${item.source} #${item.id}`}</span>
                </button>
              </li>
            ))}
            {items.length === 0 ? <li className="metadata-fetch-empty">无结果</li> : null}
          </ul>

          <div className="metadata-fetch-preview-grid">
            <label>
              Raw
              <textarea readOnly value={previewRaw} />
            </label>
            <label>
              Parsed
              <textarea readOnly value={previewParsed} />
            </label>
          </div>
        </div>
      </section>
    </div>
  )
}

export default MetadataFetchPanel
