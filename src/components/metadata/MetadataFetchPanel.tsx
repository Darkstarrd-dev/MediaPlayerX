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
type MetadataSource = 'nhentai' | 'ehentai'

interface SourceLists {
  nhentai: ExternalMetadataResultItemDto[]
  ehentai: ExternalMetadataResultItemDto[]
}

function buildErrorPayload(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return {
      message: '检索失败',
      raw: String(error),
    }
  }

  return {
    message: error.message,
    name: error.name,
  }
}

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
  const [sourceLists, setSourceLists] = useState<SourceLists>({ nhentai: [], ehentai: [] })
  const [selectedSource, setSelectedSource] = useState<MetadataSource>('nhentai')
  const [selectedIndexBySource, setSelectedIndexBySource] = useState<Record<MetadataSource, number>>({
    nhentai: 0,
    ehentai: 0,
  })
  const [requestPreview, setRequestPreview] = useState('')
  const [responsePreview, setResponsePreview] = useState('')
  const [parsed, setParsed] = useState<ParsedExternalMetadata | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    setInputText(defaultText)
    setInputId('')
    setSourceLists({ nhentai: [], ehentai: [] })
    setSelectedSource('nhentai')
    setSelectedIndexBySource({ nhentai: 0, ehentai: 0 })
    setRequestPreview('')
    setResponsePreview('')
    setParsed(null)
    setError(null)
  }, [defaultText, open])

  useEffect(() => {
    if (!open) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [onClose, open])

  const selectedList = sourceLists[selectedSource]
  const selectedItem = selectedList[selectedIndexBySource[selectedSource] ?? 0] ?? null
  const resultCount = sourceLists.nhentai.length + sourceLists.ehentai.length

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
    const requestPayload = {
      input_text: inputText.trim() || undefined,
      input_id: inputId.trim() || undefined,
      source: sourceMode === 'all' ? undefined : sourceMode,
      proxy_server: proxyServer.trim() || undefined,
    }

    const api = window.mediaPlayerBackend
    if (!api?.searchExternalMetadata) {
      setRequestPreview(JSON.stringify(requestPayload, null, 2))
      setResponsePreview(
        JSON.stringify(
          {
            message: '当前后端不支持元数据检索',
            code: 'backend_unavailable',
          },
          null,
          2,
        ),
      )
      setSourceLists({ nhentai: [], ehentai: [] })
      setSelectedIndexBySource({ nhentai: 0, ehentai: 0 })
      setError('当前后端不支持元数据检索')
      return
    }

    setLoading(true)
    setError(null)
    setParsed(null)
    setRequestPreview(JSON.stringify(requestPayload, null, 2))

    try {
      const response = await api.searchExternalMetadata(requestPayload)
      const nhentai = response.items.filter((item) => item.source === 'nhentai')
      const ehentai = response.items.filter((item) => item.source === 'ehentai')

      setSourceLists({ nhentai, ehentai })
      setSelectedIndexBySource({ nhentai: 0, ehentai: 0 })
      setResponsePreview(JSON.stringify(response, null, 2))

      if (nhentai.length > 0) {
        setSelectedSource('nhentai')
      } else if (ehentai.length > 0) {
        setSelectedSource('ehentai')
      }

      if (response.items.length === 0) {
        setError('未检索到结果')
      }
    } catch (searchError) {
      setSourceLists({ nhentai: [], ehentai: [] })
      setSelectedIndexBySource({ nhentai: 0, ehentai: 0 })
      setResponsePreview(JSON.stringify(buildErrorPayload(searchError), null, 2))
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
    <div className="settings-mask" role="dialog" aria-modal="true" aria-label="获取元数据" data-overlay-close="metadata-fetch-panel">
      <section className="settings-panel metadata-fetch-panel" data-overlay-close="metadata-fetch-panel">
        <header className="settings-head metadata-fetch-head">
          <span className="settings-head-spacer" />
          <h2>获取元数据</h2>
          <button type="button" onClick={onClose}>
            关闭
          </button>
        </header>

        <div className="metadata-fetch-shell">
          <p className="settings-placeholder">目标图包：{targetPackageLabel || '-'} </p>

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

          <div className="settings-floating-actions metadata-fetch-actions">
            <button type="button" disabled={!canSearch || loading} onClick={() => void runSearch()}>
              {loading ? '检索中...' : '检索'}
            </button>
            <button type="button" disabled={!canParse} onClick={runParse}>
              解析
            </button>
            <button type="button" disabled={!canSave} onClick={() => void runSave()}>
              {saving ? '保存中...' : '保存'}
            </button>
          </div>

          {error ? <p className="settings-danger-text">{error}</p> : null}

          <div className="metadata-fetch-results">
            <section className="metadata-fetch-source-column">
              <header>
                <strong>Nhentai</strong>
                <span>{`${sourceLists.nhentai.length} 条`}</span>
              </header>
              <ul className="metadata-fetch-result-list">
                {sourceLists.nhentai.map((item, index) => (
                  <li key={`nhentai-${item.id}-${index}`}>
                    <button
                      type="button"
                      className={selectedSource === 'nhentai' && index === (selectedIndexBySource.nhentai ?? 0) ? 'is-active' : ''}
                      onClick={() => {
                        setSelectedSource('nhentai')
                        setSelectedIndexBySource((previous) => ({ ...previous, nhentai: index }))
                        setParsed(null)
                      }}
                    >
                      <strong>{item.title}</strong>
                      <span>{`#${item.id}`}</span>
                    </button>
                  </li>
                ))}
                {sourceLists.nhentai.length === 0 ? <li className="metadata-fetch-empty">无结果</li> : null}
              </ul>
            </section>

            <section className="metadata-fetch-source-column">
              <header>
                <strong>E-Hentai</strong>
                <span>{`${sourceLists.ehentai.length} 条`}</span>
              </header>
              <ul className="metadata-fetch-result-list">
                {sourceLists.ehentai.map((item, index) => (
                  <li key={`ehentai-${item.id}-${index}`}>
                    <button
                      type="button"
                      className={selectedSource === 'ehentai' && index === (selectedIndexBySource.ehentai ?? 0) ? 'is-active' : ''}
                      onClick={() => {
                        setSelectedSource('ehentai')
                        setSelectedIndexBySource((previous) => ({ ...previous, ehentai: index }))
                        setParsed(null)
                      }}
                    >
                      <strong>{item.title}</strong>
                      <span>{`#${item.id}`}</span>
                    </button>
                  </li>
                ))}
                {sourceLists.ehentai.length === 0 ? <li className="metadata-fetch-empty">无结果</li> : null}
              </ul>
            </section>
          </div>

          <p className="metadata-fetch-total">{`总结果 ${resultCount} 条，当前来源 ${selectedSource}`}</p>

          <div className="metadata-fetch-preview-grid">
            <label>
              Request Body
              <textarea readOnly value={requestPreview} />
            </label>
            <label>
              Response Body
              <textarea readOnly value={responsePreview} />
            </label>
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
