import { useEffect, useMemo, useRef, useState } from 'react'

import { MainUiIcon } from '../MainUiIcon'
import { useI18n } from '../../i18n/useI18n'
import type { ExternalMetadataResultItemDto, SearchExternalMetadataDebugDto } from '../../contracts/backend'
import {
  parseExternalMetadataToHitomi,
  type ParsedExternalMetadata,
} from '../../features/metadata/parseExternalMetadata'

interface MetadataFetchPanelProps {
  open: boolean
  defaultText: string
  proxyServer: string
  ehentaiCookies: string
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

interface SourceDebugMap {
  nhentai: SearchExternalMetadataDebugDto | null
  ehentai: SearchExternalMetadataDebugDto | null
}

interface SourceParsedMap {
  nhentai: ParsedExternalMetadata | null
  ehentai: ParsedExternalMetadata | null
}

interface SourcePreviewCollapseMap {
  nhentai: {
    debug: boolean
    request: boolean
    response: boolean
    raw: boolean
    parsed: boolean
  }
  ehentai: {
    debug: boolean
    request: boolean
    response: boolean
    raw: boolean
    parsed: boolean
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

function createEmptySourceDebugMap(): SourceDebugMap {
  return {
    nhentai: null,
    ehentai: null,
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
      debug: false,
      request: false,
      response: false,
      raw: true,
      parsed: true,
    },
    ehentai: {
      debug: false,
      request: false,
      response: false,
      raw: true,
      parsed: true,
    },
  }
}

function getSourceDisplayLabel(source: MetadataSource): string {
  return source === 'nhentai' ? 'ui.metadata.fetchSourceNhentai' : 'ui.metadata.fetchSourceEhentai'
}

function getSourceShortLabel(source: MetadataSource): string {
  return source === 'nhentai' ? 'NH' : 'EH'
}

function buildErrorPayload(error: unknown, fallbackMessage: string): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return {
      message: fallbackMessage,
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
  ehentaiCookies,
  metadataPending,
  targetPackageLabel,
  onClose,
  onSaveParsedMetadata,
}: MetadataFetchPanelProps) {
  const { t } = useI18n()
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
  const [debugBySource, setDebugBySource] = useState<SourceDebugMap>(createEmptySourceDebugMap())
  const [parsedBySource, setParsedBySource] = useState<SourceParsedMap>(createEmptyParsedBySource())
  const [previewCollapseBySource, setPreviewCollapseBySource] = useState<SourcePreviewCollapseMap>(
    createInitialPreviewCollapseBySource(),
  )

  const getSourceLabel = (source: MetadataSource): string => t(getSourceDisplayLabel(source))

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
    setDebugBySource(createEmptySourceDebugMap())
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

  const resultCount = sourceLists.nhentai.length + sourceLists.ehentai.length

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

  const previewDebugBySource: SourceTextMap = useMemo(
    () => ({
      nhentai: debugBySource.nhentai ? JSON.stringify(debugBySource.nhentai, null, 2) : '',
      ehentai: debugBySource.ehentai ? JSON.stringify(debugBySource.ehentai, null, 2) : '',
    }),
    [debugBySource],
  )

  const canSearch = inputText.trim().length > 0 || inputId.trim().length > 0
  if (!open) {
    return null
  }

  const runSearch = async () => {
    const requestBase = {
      input_text: inputText.trim() || undefined,
      input_id: inputId.trim() || undefined,
      proxy_server: proxyServer.trim() || undefined,
    }
    const ehentaiCookieText = ehentaiCookies.trim()
    const targetSources: MetadataSource[] = sourceMode === 'all' ? SOURCE_KEYS : [sourceMode]
    const buildRequestPayload = (source: MetadataSource) => {
      return {
        ...requestBase,
        source,
        ...(source === 'ehentai' && ehentaiCookieText ? { ehentai_cookies: ehentaiCookieText } : {}),
      }
    }

    const api = window.mediaPlayerBackend
    const searchExternalMetadata = api?.searchExternalMetadata
    if (!searchExternalMetadata) {
      const nextRequestPreviewBySource = createEmptySourceTextMap()
      const nextResponsePreviewBySource = createEmptySourceTextMap()

      for (const source of targetSources) {
        nextRequestPreviewBySource[source] = JSON.stringify(buildRequestPayload(source), null, 2)
        nextResponsePreviewBySource[source] = JSON.stringify(
          {
            message: t('ui.metadata.fetchUnsupported'),
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
      setDebugBySource(createEmptySourceDebugMap())
      setParsedBySource(createEmptyParsedBySource())
      setPreviewCollapseBySource(createInitialPreviewCollapseBySource())
      setError(t('ui.metadata.fetchUnsupported'))
      return
    }

    setLoading(true)
    setError(null)
    setDebugBySource(createEmptySourceDebugMap())
    setParsedBySource(createEmptyParsedBySource())
    setPreviewCollapseBySource(createInitialPreviewCollapseBySource())

    try {
      const nextSourceLists = createEmptySourceLists()
      const nextRequestPreviewBySource = createEmptySourceTextMap()
      const nextResponsePreviewBySource = createEmptySourceTextMap()
      const nextDebugBySource = createEmptySourceDebugMap()
      const searchErrors: string[] = []

      await Promise.all(
        targetSources.map(async (source) => {
          const requestPayload = buildRequestPayload(source)
          nextRequestPreviewBySource[source] = JSON.stringify(requestPayload, null, 2)

          try {
            const response = await searchExternalMetadata(requestPayload)
            nextSourceLists[source] = response.items.filter((item) => item.source === source)
            nextResponsePreviewBySource[source] = JSON.stringify(response, null, 2)
            nextDebugBySource[source] = response.debug ?? null
          } catch (searchError) {
            nextResponsePreviewBySource[source] = JSON.stringify(buildErrorPayload(searchError, t('ui.metadata.fetchSearchFailed')), null, 2)
            searchErrors.push(`${getSourceShortLabel(source)}: ${searchError instanceof Error ? searchError.message : t('ui.metadata.fetchSearchFailed')}`)
          }
        }),
      )

      setSourceLists(nextSourceLists)
      setSelectedIndexBySource(createInitialSelectedIndexBySource())
      setRequestPreviewBySource(nextRequestPreviewBySource)
      setResponsePreviewBySource(nextResponsePreviewBySource)
      setDebugBySource(nextDebugBySource)

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
        setError(t('ui.metadata.fetchNoResultFound'))
      }
    } finally {
      setLoading(false)
    }
  }

  const runParse = (source: MetadataSource) => {
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
          debug: true,
          request: true,
          response: true,
          raw: false,
          parsed: false,
        },
      }))
      setError(null)
    } catch (parseError) {
      setParsedBySource((previous) => ({
        ...previous,
        [source]: null,
      }))
      setError(parseError instanceof Error ? parseError.message : t('ui.metadata.fetchParseFailed'))
    }
  }

  const runSave = async (source: MetadataSource) => {
    const selectedParsed = parsedBySource[source]
    if (!selectedParsed) {
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSaveParsedMetadata(selectedParsed)
      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('ui.metadata.fetchSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-mask" role="dialog" aria-modal="true" aria-label={t('a11y.metadata.fetchDialog')} data-overlay-close="metadata-fetch-panel">
      <section className="settings-panel metadata-fetch-panel" data-overlay-close="metadata-fetch-panel">
        <header className="settings-head metadata-fetch-head">
          <span className="settings-head-spacer" />
          <h2>{t('ui.metadata.fetchTitle')}</h2>
          <button className="feature-action-btn main-icon-square-btn" type="button" aria-label={t('a11y.common.close')} title={t('tip.common.close')} onClick={onClose}>
            <MainUiIcon name="close" />
          </button>
        </header>

        <div className="metadata-fetch-shell settings-block">
          <p className="settings-placeholder">{t('ui.metadata.fetchTargetPackage', { label: targetPackageLabel || '-' })}</p>

          <fieldset className="settings-subsection metadata-fetch-search-section">
            <legend>{t('ui.metadata.fetchSearchParams')}</legend>
            <div className="metadata-fetch-input-grid">
              <div className="metadata-fetch-source-picker">
                <span>{t('ui.metadata.source')}</span>
                <div className="mode-switch metadata-fetch-source-switch" role="group" aria-label={t('a11y.metadata.fetchSourceSwitch')}>
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
                {t('ui.metadata.fetchId')}
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
                {t('ui.metadata.fetchKeyword')}
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
                <button
                  className="feature-action-btn main-icon-square-btn"
                  type="button"
                  aria-label={loading ? t('a11y.common.searching') : t('a11y.common.search')}
                  title={loading ? t('tip.common.searching') : t('tip.common.search')}
                  disabled={!canSearch || loading}
                  onClick={() => void runSearch()}
                >
                  <MainUiIcon name="search" />
                </button>
              </div>
            </div>
          </fieldset>

          {error ? <p className="settings-danger-text">{error}</p> : null}

          <div className="metadata-fetch-results">
            {SOURCE_KEYS.map((source) => {
              const list = sourceLists[source]
              const selectedIndex = selectedIndexBySource[source] ?? 0
              const isActiveSource = selectedSource === source
              const debugCollapsed = previewCollapseBySource[source].debug
              const requestCollapsed = previewCollapseBySource[source].request
              const responseCollapsed = previewCollapseBySource[source].response
              const rawCollapsed = previewCollapseBySource[source].raw
              const parsedCollapsed = previewCollapseBySource[source].parsed
              const canParse = Boolean(selectedItemBySource[source])
              const canSave = Boolean(parsedBySource[source]) && !saving && !metadataPending

              return (
                <section
                  key={source}
                  className={`metadata-fetch-source-column ${isActiveSource ? 'is-active' : ''}`}
                  data-source={source}
                >
                  <header>
                    <strong>{getSourceLabel(source)}</strong>
                    <span>{t('ui.metadata.fetchSourceResultCount', { count: list.length })}</span>
                  </header>

                  <div className="settings-floating-actions metadata-fetch-actions metadata-fetch-actions-inline">
                    <button
                      className="feature-action-btn main-icon-square-btn"
                      type="button"
                      aria-label={t('a11y.common.parse')}
                      title={t('tip.common.parse')}
                      disabled={!canParse}
                      onClick={() => {
                        setSelectedSource(source)
                        runParse(source)
                      }}
                    >
                      <MainUiIcon name="parse" />
                    </button>
                    <button
                      className="feature-action-btn main-icon-square-btn"
                      type="button"
                      aria-label={saving && selectedSource === source ? t('a11y.common.saving') : t('a11y.common.save')}
                      title={saving && selectedSource === source ? t('tip.common.saving') : t('tip.common.save')}
                      disabled={!canSave}
                      onClick={() => {
                        setSelectedSource(source)
                        void runSave(source)
                      }}
                    >
                      <MainUiIcon name="save" />
                    </button>
                  </div>

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
                                debug: false,
                                request: false,
                                response: false,
                                raw: false,
                                parsed: true,
                              },
                            }))
                          }}
                        >
                          <strong>{item.title}</strong>
                          <span>{`#${item.id}`}</span>
                        </button>
                      </li>
                    ))}
                    {list.length === 0 ? <li className="metadata-fetch-empty">{t('ui.common.noResults')}</li> : null}
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
                              parsed: !previous[source].parsed,
                            },
                          }))
                        }}
                      >
                        <span>{t('ui.metadata.fetchPreviewParsed')}</span>
                        <span className="metadata-fetch-preview-state" aria-hidden="true">
                          <MainUiIcon name={parsedCollapsed ? 'expand' : 'collapse'} />
                        </span>
                      </button>
                      {!parsedCollapsed ? (
                          <AutoSizeReadonlyTextarea id={`${source}-parsed`} label={t('ui.metadata.fetchPreviewParsed')} value={previewParsedBySource[source]} />
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
                              raw: !previous[source].raw,
                            },
                          }))
                        }}
                      >
                        <span>{t('ui.metadata.fetchPreviewRaw')}</span>
                        <span className="metadata-fetch-preview-state" aria-hidden="true">
                          <MainUiIcon name={rawCollapsed ? 'expand' : 'collapse'} />
                        </span>
                      </button>
                      {!rawCollapsed ? (
                          <AutoSizeReadonlyTextarea id={`${source}-raw`} label={t('ui.metadata.fetchPreviewRaw')} value={previewRawBySource[source]} />
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
                              debug: !previous[source].debug,
                            },
                          }))
                        }}
                      >
                        <span>{t('ui.metadata.fetchPreviewDebugTrace')}</span>
                        <span className="metadata-fetch-preview-state" aria-hidden="true">
                          <MainUiIcon name={debugCollapsed ? 'expand' : 'collapse'} />
                        </span>
                      </button>
                      {!debugCollapsed ? (
                        <AutoSizeReadonlyTextarea
                          id={`${source}-debug-trace`}
                           label={t('ui.metadata.fetchPreviewDebugTrace')}
                           value={previewDebugBySource[source]}
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
                              request: !previous[source].request,
                            },
                          }))
                        }}
                      >
                        <span>{t('ui.metadata.fetchPreviewRequestBody')}</span>
                        <span className="metadata-fetch-preview-state" aria-hidden="true">
                          <MainUiIcon name={requestCollapsed ? 'expand' : 'collapse'} />
                        </span>
                      </button>
                      {!requestCollapsed ? (
                        <AutoSizeReadonlyTextarea
                          id={`${source}-request-body`}
                           label={t('ui.metadata.fetchPreviewRequestBody')}
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
                        <span>{t('ui.metadata.fetchPreviewResponseBody')}</span>
                        <span className="metadata-fetch-preview-state" aria-hidden="true">
                          <MainUiIcon name={responseCollapsed ? 'expand' : 'collapse'} />
                        </span>
                      </button>
                      {!responseCollapsed ? (
                        <AutoSizeReadonlyTextarea
                          id={`${source}-response-body`}
                           label={t('ui.metadata.fetchPreviewResponseBody')}
                           value={responsePreviewBySource[source]}
                        />
                      ) : null}
                    </section>
                  </div>
                </section>
              )
            })}
          </div>

          <p className="metadata-fetch-total">{t('ui.metadata.fetchTotalSummary', { count: resultCount, source: getSourceLabel(selectedSource) })}</p>
        </div>
      </section>
    </div>
  )
}

export default MetadataFetchPanel
