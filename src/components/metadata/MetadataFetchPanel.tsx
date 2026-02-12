import { useEffect, useMemo, useRef, useState } from 'react'

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

interface SourceTextMap {
  nhentai: string
  ehentai: string
}

interface SourceParsedMap {
  nhentai: ParsedExternalMetadata | null
  ehentai: ParsedExternalMetadata | null
}

interface SourcePreviewCollapseMap {
  nhentai: {
    request: boolean
    response: boolean
  }
  ehentai: {
    request: boolean
    response: boolean
  }
}

const SOURCE_KEYS: MetadataSource[] = ['nhentai', 'ehentai']

function createEmptySourceLists(): SourceLists {
  return { nhentai: [], ehentai: [] }
}

function createInitialSelectedIndexBySource(): Record<MetadataSource, number> {
  return {
    nhentai: 0,
    ehentai: 0,
  }
}

function createEmptySourceTextMap(): SourceTextMap {
  return {
    nhentai: '',
    ehentai: '',
  }
}

function createEmptyParsedBySource(): SourceParsedMap {
  return {
    nhentai: null,
    ehentai: null,
  }
}

function createInitialPreviewCollapseBySource(): SourcePreviewCollapseMap {
  return {
    nhentai: {
      request: false,
      response: false,
    },
    ehentai: {
      request: false,
      response: false,
    },
  }
}

function getSourceDisplayLabel(source: MetadataSource): string {
  return source === 'nhentai' ? 'Nhentai' : 'E-Hentai'
}

function getSourceShortLabel(source: MetadataSource): string {
  return source === 'nhentai' ? 'NH' : 'EH'
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

interface AutoSizeReadonlyTextareaProps {
  id: string
  label: string
  value: string
}

function AutoSizeReadonlyTextarea({ id, label, value }: AutoSizeReadonlyTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!textareaRef.current) {
      return
    }
    textareaRef.current.style.height = '0px'
    const nextHeight = Math.max(120, textareaRef.current.scrollHeight)
    textareaRef.current.style.height = `${nextHeight}px`
  }, [value])

  return (
    <label className="metadata-fetch-preview-field" htmlFor={id}>
      <span>{label}</span>
      <textarea id={id} ref={textareaRef} readOnly value={value} />
    </label>
  )
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
  const [inputId, setInputId] = useState('')
  const [inputText, setInputText] = useState(defaultText)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceLists, setSourceLists] = useState<SourceLists>(createEmptySourceLists())
  const [selectedSource, setSelectedSource] = useState<MetadataSource>('nhentai')
  const [selectedIndexBySource, setSelectedIndexBySource] = useState<Record<MetadataSource, number>>(
    createInitialSelectedIndexBySource(),
  )
  const [requestPreviewBySource, setRequestPreviewBySource] = useState<SourceTextMap>(createEmptySourceTextMap())
  const [responsePreviewBySource, setResponsePreviewBySource] = useState<SourceTextMap>(createEmptySourceTextMap())
  const [parsedBySource, setParsedBySource] = useState<SourceParsedMap>(createEmptyParsedBySource())
  const [previewCollapseBySource, setPreviewCollapseBySource] = useState<SourcePreviewCollapseMap>(
    createInitialPreviewCollapseBySource(),
  )

  useEffect(() => {
    if (!open) {
      return
    }
    setInputText(defaultText)
    setInputId('')
    setSourceLists(createEmptySourceLists())
    setSelectedSource('nhentai')
    setSelectedIndexBySource(createInitialSelectedIndexBySource())
    setRequestPreviewBySource(createEmptySourceTextMap())
    setResponsePreviewBySource(createEmptySourceTextMap())
    setParsedBySource(createEmptyParsedBySource())
    setPreviewCollapseBySource(createInitialPreviewCollapseBySource())
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

  const selectedItemBySource: Record<MetadataSource, ExternalMetadataResultItemDto | null> = useMemo(
    () => ({
      nhentai: sourceLists.nhentai[selectedIndexBySource.nhentai ?? 0] ?? null,
      ehentai: sourceLists.ehentai[selectedIndexBySource.ehentai ?? 0] ?? null,
    }),
    [selectedIndexBySource, sourceLists],
  )

  const selectedItem = selectedItemBySource[selectedSource]
  const resultCount = sourceLists.nhentai.length + sourceLists.ehentai.length
  const selectedParsed = parsedBySource[selectedSource]

  const previewRawBySource: SourceTextMap = useMemo(
    () => ({
      nhentai: selectedItemBySource.nhentai ? JSON.stringify(selectedItemBySource.nhentai.raw, null, 2) : '',
      ehentai: selectedItemBySource.ehentai ? JSON.stringify(selectedItemBySource.ehentai.raw, null, 2) : '',
    }),
    [selectedItemBySource],
  )

  const previewParsedBySource: SourceTextMap = useMemo(
    () => ({
      nhentai: parsedBySource.nhentai ? JSON.stringify(parsedBySource.nhentai, null, 2) : '',
      ehentai: parsedBySource.ehentai ? JSON.stringify(parsedBySource.ehentai, null, 2) : '',
    }),
    [parsedBySource],
  )

  const canSearch = inputText.trim().length > 0 || inputId.trim().length > 0
  const canParse = Boolean(selectedItem)
  const canSave = Boolean(selectedParsed) && !saving && !metadataPending

  if (!open) {
    return null
  }

  const runSearch = async () => {
    const requestBase = {
      input_text: inputText.trim() || undefined,
      input_id: inputId.trim() || undefined,
      proxy_server: proxyServer.trim() || undefined,
    }
    const targetSources: MetadataSource[] = sourceMode === 'all' ? SOURCE_KEYS : [sourceMode]

    const api = window.mediaPlayerBackend
    const searchExternalMetadata = api?.searchExternalMetadata
    if (!searchExternalMetadata) {
      const nextRequestPreviewBySource = createEmptySourceTextMap()
      const nextResponsePreviewBySource = createEmptySourceTextMap()

      for (const source of targetSources) {
        nextRequestPreviewBySource[source] = JSON.stringify({ ...requestBase, source }, null, 2)
        nextResponsePreviewBySource[source] = JSON.stringify(
          {
            message: '当前后端不支持元数据检索',
            code: 'backend_unavailable',
          },
          null,
          2,
        )
      }

      setRequestPreviewBySource(nextRequestPreviewBySource)
      setResponsePreviewBySource(nextResponsePreviewBySource)
      setSourceLists(createEmptySourceLists())
      setSelectedIndexBySource(createInitialSelectedIndexBySource())
      setParsedBySource(createEmptyParsedBySource())
      setPreviewCollapseBySource(createInitialPreviewCollapseBySource())
      setError('当前后端不支持元数据检索')
      return
    }

    setLoading(true)
    setError(null)
    setParsedBySource(createEmptyParsedBySource())
    setPreviewCollapseBySource(createInitialPreviewCollapseBySource())

    try {
      const nextSourceLists = createEmptySourceLists()
      const nextRequestPreviewBySource = createEmptySourceTextMap()
      const nextResponsePreviewBySource = createEmptySourceTextMap()
      const searchErrors: string[] = []

      await Promise.all(
        targetSources.map(async (source) => {
          const requestPayload = { ...requestBase, source }
          nextRequestPreviewBySource[source] = JSON.stringify(requestPayload, null, 2)

          try {
            const response = await searchExternalMetadata(requestPayload)
            nextSourceLists[source] = response.items.filter((item) => item.source === source)
            nextResponsePreviewBySource[source] = JSON.stringify(response, null, 2)
          } catch (searchError) {
            nextResponsePreviewBySource[source] = JSON.stringify(buildErrorPayload(searchError), null, 2)
            searchErrors.push(`${getSourceShortLabel(source)}: ${searchError instanceof Error ? searchError.message : '检索失败'}`)
          }
        }),
      )

      setSourceLists(nextSourceLists)
      setSelectedIndexBySource(createInitialSelectedIndexBySource())
      setRequestPreviewBySource(nextRequestPreviewBySource)
      setResponsePreviewBySource(nextResponsePreviewBySource)

      const nextSelectedSource: MetadataSource =
        nextSourceLists[selectedSource].length > 0
          ? selectedSource
          : nextSourceLists.nhentai.length > 0
            ? 'nhentai'
            : nextSourceLists.ehentai.length > 0
              ? 'ehentai'
              : 'nhentai'
      setSelectedSource(nextSelectedSource)

      if (searchErrors.length > 0) {
        setError(searchErrors.join(' | '))
      } else if (nextSourceLists.nhentai.length + nextSourceLists.ehentai.length === 0) {
        setError('未检索到结果')
      }
    } finally {
      setLoading(false)
    }
  }

  const runParse = () => {
    const source = selectedSource
    const currentItem = selectedItemBySource[source]
    if (!currentItem) {
      return
    }

    try {
      const nextParsed = parseExternalMetadataToHitomi(currentItem)
      setParsedBySource((previous) => ({
        ...previous,
        [source]: nextParsed,
      }))
      setPreviewCollapseBySource((previous) => ({
        ...previous,
        [source]: {
          request: true,
          response: true,
        },
      }))
      setError(null)
    } catch (parseError) {
      setParsedBySource((previous) => ({
        ...previous,
        [source]: null,
      }))
      setError(parseError instanceof Error ? parseError.message : '解析失败')
    }
  }

  const runSave = async () => {
    if (!selectedParsed) {
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSaveParsedMetadata(selectedParsed)
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

        <div className="metadata-fetch-shell settings-block">
          <p className="settings-placeholder">目标图包：{targetPackageLabel || '-'} </p>

          <fieldset className="settings-subsection metadata-fetch-search-section">
            <legend>检索参数</legend>
            <div className="metadata-fetch-input-grid">
              <div className="metadata-fetch-source-picker">
                <span>来源</span>
                <div className="mode-switch metadata-fetch-source-switch" role="group" aria-label="metadata-fetch-source-switch">
                  <button type="button" className={sourceMode === 'nhentai' ? 'is-active' : ''} onClick={() => setSourceMode('nhentai')}>
                    NH
                  </button>
                  <button type="button" className={sourceMode === 'ehentai' ? 'is-active' : ''} onClick={() => setSourceMode('ehentai')}>
                    EH
                  </button>
                  <button type="button" className={sourceMode === 'all' ? 'is-active' : ''} onClick={() => setSourceMode('all')}>
                    ALL
                  </button>
                </div>
              </div>

              <label>
                检索ID
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

              <label>
                检索关键字
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

              <div className="metadata-fetch-search-action">
                <button type="button" disabled={!canSearch || loading} onClick={() => void runSearch()}>
                  {loading ? '检索中...' : '检索'}
                </button>
              </div>
            </div>
          </fieldset>

          <div className="settings-floating-actions metadata-fetch-actions">
            <button type="button" disabled={!canParse} onClick={runParse}>
              解析
            </button>
            <button type="button" disabled={!canSave} onClick={() => void runSave()}>
              {saving ? '保存中...' : '保存'}
            </button>
          </div>

          {error ? <p className="settings-danger-text">{error}</p> : null}

          <div className="metadata-fetch-results">
            {SOURCE_KEYS.map((source) => {
              const list = sourceLists[source]
              const selectedIndex = selectedIndexBySource[source] ?? 0
              const isActiveSource = selectedSource === source
              const requestCollapsed = previewCollapseBySource[source].request
              const responseCollapsed = previewCollapseBySource[source].response

              return (
                <section
                  key={source}
                  className={`metadata-fetch-source-column ${isActiveSource ? 'is-active' : ''}`}
                  data-source={source}
                >
                  <header>
                    <strong>{getSourceDisplayLabel(source)}</strong>
                    <span>{`${list.length} 条`}</span>
                  </header>

                  <ul className="metadata-fetch-result-list">
                    {list.map((item, index) => (
                      <li key={`${source}-${item.id}-${index}`}>
                        <button
                          type="button"
                          className={isActiveSource && index === selectedIndex ? 'is-active' : ''}
                          onClick={() => {
                            setSelectedSource(source)
                            setSelectedIndexBySource((previous) => ({
                              ...previous,
                              [source]: index,
                            }))
                            setParsedBySource((previous) => ({
                              ...previous,
                              [source]: null,
                            }))
                            setPreviewCollapseBySource((previous) => ({
                              ...previous,
                              [source]: {
                                request: false,
                                response: false,
                              },
                            }))
                          }}
                        >
                          <strong>{item.title}</strong>
                          <span>{`#${item.id}`}</span>
                        </button>
                      </li>
                    ))}
                    {list.length === 0 ? <li className="metadata-fetch-empty">无结果</li> : null}
                  </ul>

                  <div className="metadata-fetch-preview-stack">
                    <section className="metadata-fetch-preview-card">
                      <button
                        type="button"
                        className="metadata-fetch-preview-toggle"
                        onClick={() => {
                          setPreviewCollapseBySource((previous) => ({
                            ...previous,
                            [source]: {
                              ...previous[source],
                              request: !previous[source].request,
                            },
                          }))
                        }}
                      >
                        <span>Request Body</span>
                        <span>{requestCollapsed ? '展开' : '折叠'}</span>
                      </button>
                      {!requestCollapsed ? (
                        <AutoSizeReadonlyTextarea
                          id={`${source}-request-body`}
                          label="Request Body"
                          value={requestPreviewBySource[source]}
                        />
                      ) : null}
                    </section>

                    <section className="metadata-fetch-preview-card">
                      <button
                        type="button"
                        className="metadata-fetch-preview-toggle"
                        onClick={() => {
                          setPreviewCollapseBySource((previous) => ({
                            ...previous,
                            [source]: {
                              ...previous[source],
                              response: !previous[source].response,
                            },
                          }))
                        }}
                      >
                        <span>Response Body</span>
                        <span>{responseCollapsed ? '展开' : '折叠'}</span>
                      </button>
                      {!responseCollapsed ? (
                        <AutoSizeReadonlyTextarea
                          id={`${source}-response-body`}
                          label="Response Body"
                          value={responsePreviewBySource[source]}
                        />
                      ) : null}
                    </section>

                    <section className="metadata-fetch-preview-card">
                      <AutoSizeReadonlyTextarea id={`${source}-raw`} label="Raw" value={previewRawBySource[source]} />
                    </section>

                    <section className="metadata-fetch-preview-card">
                      <AutoSizeReadonlyTextarea id={`${source}-parsed`} label="Parsed" value={previewParsedBySource[source]} />
                    </section>
                  </div>
                </section>
              )
            })}
          </div>

          <p className="metadata-fetch-total">{`总结果 ${resultCount} 条，当前来源 ${getSourceDisplayLabel(selectedSource)}`}</p>
        </div>
      </section>
    </div>
  )
}

export default MetadataFetchPanel
