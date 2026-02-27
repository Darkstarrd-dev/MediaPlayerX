import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'

import { MainUiIcon } from '../MainUiIcon'
import { useI18n } from '../../i18n/useI18n'
import type { ExternalMetadataResultItemDto, SearchExternalMetadataDebugDto } from '../../contracts/backend'
import type { MetadataFetchTarget } from '../../features/metadata/metadataFetchTargets'
import {
  parseExternalMetadataToHitomi,
  type ParsedExternalMetadata,
} from '../../features/metadata/parseExternalMetadata'

interface MetadataFetchPanelProps {
  open: boolean
  targets: MetadataFetchTarget[]
  proxyServer: string
  ehentaiCookies: string
  metadataPending: boolean
  onClose: () => void
  onSaveParsedMetadataToTarget: (packageId: string, parsed: ParsedExternalMetadata) => Promise<void>
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

interface TargetRuntimeState {
  sourceLists: SourceLists
  selectedIndexBySource: Record<MetadataSource, number>
  requestPreviewBySource: SourceTextMap
  responsePreviewBySource: SourceTextMap
  debugBySource: SourceDebugMap
  parsedBySource: SourceParsedMap
  previewCollapseBySource: SourcePreviewCollapseMap
  error: string | null
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

function createTargetRuntimeState(): TargetRuntimeState {
  return {
    sourceLists: createEmptySourceLists(),
    selectedIndexBySource: createInitialSelectedIndexBySource(),
    requestPreviewBySource: createEmptySourceTextMap(),
    responsePreviewBySource: createEmptySourceTextMap(),
    debugBySource: createEmptySourceDebugMap(),
    parsedBySource: createEmptyParsedBySource(),
    previewCollapseBySource: createInitialPreviewCollapseBySource(),
    error: null,
  }
}

function createTargetRuntimeStateMap(targets: MetadataFetchTarget[]): Record<string, TargetRuntimeState> {
  return Object.fromEntries(targets.map((target) => [target.packageId, createTargetRuntimeState()]))
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
  ariaLabel: string
  value: string
}

function AutoSizeReadonlyTextarea({ id, ariaLabel, value }: AutoSizeReadonlyTextareaProps) {
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
    <textarea
      id={id}
      className="metadata-fetch-preview-textarea"
      ref={textareaRef}
      readOnly
      aria-label={ariaLabel}
      value={value}
    />
  )
}

function MetadataFetchPanel({
  open,
  targets,
  proxyServer,
  ehentaiCookies,
  metadataPending,
  onClose,
  onSaveParsedMetadataToTarget,
}: MetadataFetchPanelProps) {
  const { t } = useI18n()
  const resetTargetsRef = useRef<MetadataFetchTarget[]>(targets)
  const resetTargetIdentityKeyRef = useRef<string | null>(null)
  const [sourceMode, setSourceMode] = useState<SourceMode>('all')
  const [inputId, setInputId] = useState('')
  const [requestIntervalMs, setRequestIntervalMs] = useState(1200)
  const [requestIntervalInput, setRequestIntervalInput] = useState('1200ms')
  const [targetKeywords, setTargetKeywords] = useState<string[]>([])
  const [activeTargetIndex, setActiveTargetIndex] = useState(0)
  const [selectedSource, setSelectedSource] = useState<MetadataSource>('nhentai')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [runtimeByTarget, setRuntimeByTarget] = useState<Record<string, TargetRuntimeState>>({})
  const runTokenRef = useRef(0)
  const targetIdentityKey = useMemo(
    () => targets.map((target) => target.packageId.trim()).join('\u0001'),
    [targets],
  )

  const getSourceLabel = (source: MetadataSource): string => t(getSourceDisplayLabel(source))
  const currentTarget = targets[activeTargetIndex] ?? null
  const currentRuntime =
    (currentTarget ? runtimeByTarget[currentTarget.packageId] : null) ?? createTargetRuntimeState()

  const selectedItemBySource: Record<MetadataSource, ExternalMetadataResultItemDto | null> = useMemo(
    () => ({
      nhentai:
        currentRuntime.sourceLists.nhentai[currentRuntime.selectedIndexBySource.nhentai ?? 0] ?? null,
      ehentai:
        currentRuntime.sourceLists.ehentai[currentRuntime.selectedIndexBySource.ehentai ?? 0] ?? null,
    }),
    [currentRuntime],
  )

  const resultCount =
    currentRuntime.sourceLists.nhentai.length + currentRuntime.sourceLists.ehentai.length

  const previewRawBySource: SourceTextMap = useMemo(
    () => ({
      nhentai: selectedItemBySource.nhentai ? JSON.stringify(selectedItemBySource.nhentai.raw, null, 2) : '',
      ehentai: selectedItemBySource.ehentai ? JSON.stringify(selectedItemBySource.ehentai.raw, null, 2) : '',
    }),
    [selectedItemBySource],
  )

  const previewParsedBySource: SourceTextMap = useMemo(
    () => ({
      nhentai: currentRuntime.parsedBySource.nhentai ? JSON.stringify(currentRuntime.parsedBySource.nhentai, null, 2) : '',
      ehentai: currentRuntime.parsedBySource.ehentai ? JSON.stringify(currentRuntime.parsedBySource.ehentai, null, 2) : '',
    }),
    [currentRuntime.parsedBySource],
  )

  const previewDebugBySource: SourceTextMap = useMemo(
    () => ({
      nhentai: currentRuntime.debugBySource.nhentai ? JSON.stringify(currentRuntime.debugBySource.nhentai, null, 2) : '',
      ehentai: currentRuntime.debugBySource.ehentai ? JSON.stringify(currentRuntime.debugBySource.ehentai, null, 2) : '',
    }),
    [currentRuntime.debugBySource],
  )

  useEffect(() => {
    resetTargetsRef.current = targets
  }, [targets])

  useEffect(() => {
    if (!open) {
      resetTargetIdentityKeyRef.current = null
      return
    }
    if (resetTargetIdentityKeyRef.current === targetIdentityKey) {
      return
    }
    const resetTargets = resetTargetsRef.current
    setInputId('')
    setRequestIntervalMs(1200)
    setRequestIntervalInput('1200ms')
    setActiveTargetIndex(0)
    setSelectedSource('nhentai')
    setTargetKeywords(resetTargets.map((target) => target.defaultText))
    setRuntimeByTarget(createTargetRuntimeStateMap(resetTargets))
    resetTargetIdentityKeyRef.current = targetIdentityKey
  }, [open, targetIdentityKey])

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

  const withTargetRuntime = (packageId: string, updater: (state: TargetRuntimeState) => TargetRuntimeState) => {
    setRuntimeByTarget((previous) => {
      const current = previous[packageId] ?? createTargetRuntimeState()
      return {
        ...previous,
        [packageId]: updater(current),
      }
    })
  }

  const canSearch =
    inputId.trim().length > 0 || targetKeywords.some((keyword) => keyword.trim().length > 0)
  if (!open) {
    return null
  }

  const runSearch = async () => {
    const api = window.mediaPlayerBackend
    const searchExternalMetadata = api?.searchExternalMetadata
    const ehentaiCookieText = ehentaiCookies.trim()
    const targetSources: MetadataSource[] = sourceMode === 'all' ? SOURCE_KEYS : [sourceMode]
    const runToken = runTokenRef.current + 1
    runTokenRef.current = runToken

    if (targets.length === 0) {
      return
    }

    setLoading(true)
    try {
      for (const [targetIndex, target] of targets.entries()) {
        if (runTokenRef.current !== runToken) {
          return
        }
        const keyword = targetKeywords[targetIndex] ?? ''
        const requestBase = {
          input_text: keyword.trim() || undefined,
          input_id: inputId.trim() || undefined,
          proxy_server: proxyServer.trim() || undefined,
        }

        const buildRequestPayload = (source: MetadataSource) => ({
          ...requestBase,
          source,
          ...(source === 'ehentai' && ehentaiCookieText ? { ehentai_cookies: ehentaiCookieText } : {}),
        })

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

          withTargetRuntime(target.packageId, (state) => ({
            ...state,
            sourceLists: createEmptySourceLists(),
            selectedIndexBySource: createInitialSelectedIndexBySource(),
            requestPreviewBySource: nextRequestPreviewBySource,
            responsePreviewBySource: nextResponsePreviewBySource,
            debugBySource: createEmptySourceDebugMap(),
            parsedBySource: createEmptyParsedBySource(),
            previewCollapseBySource: createInitialPreviewCollapseBySource(),
            error: t('ui.metadata.fetchUnsupported'),
          }))
          continue
        }

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
              nextResponsePreviewBySource[source] = JSON.stringify(
                buildErrorPayload(searchError, t('ui.metadata.fetchSearchFailed')),
                null,
                2,
              )
              searchErrors.push(
                `${getSourceShortLabel(source)}: ${searchError instanceof Error ? searchError.message : t('ui.metadata.fetchSearchFailed')}`,
              )
            }
          }),
        )

        withTargetRuntime(target.packageId, (state) => ({
          ...state,
          sourceLists: nextSourceLists,
          selectedIndexBySource: createInitialSelectedIndexBySource(),
          requestPreviewBySource: nextRequestPreviewBySource,
          responsePreviewBySource: nextResponsePreviewBySource,
          debugBySource: nextDebugBySource,
          parsedBySource: createEmptyParsedBySource(),
          previewCollapseBySource: createInitialPreviewCollapseBySource(),
          error:
            searchErrors.length > 0
              ? searchErrors.join(' | ')
              : nextSourceLists.nhentai.length + nextSourceLists.ehentai.length === 0
                ? t('ui.metadata.fetchNoResultFound')
                : null,
        }))

        if (targetIndex < targets.length - 1 && requestIntervalMs > 0) {
          await new Promise<void>((resolve) => {
            window.setTimeout(() => resolve(), requestIntervalMs)
          })
        }
      }
    } finally {
      if (runTokenRef.current === runToken) {
        setLoading(false)
      }
    }
  }

  const runParse = (source: MetadataSource) => {
    if (!currentTarget) {
      return
    }
    const currentItem = selectedItemBySource[source]
    if (!currentItem) {
      return
    }

    try {
      const nextParsed = parseExternalMetadataToHitomi(currentItem)
      withTargetRuntime(currentTarget.packageId, (state) => ({
        ...state,
        parsedBySource: {
          ...state.parsedBySource,
          [source]: nextParsed,
        },
        previewCollapseBySource: {
          ...state.previewCollapseBySource,
          [source]: {
            debug: true,
            request: true,
            response: true,
            raw: false,
            parsed: false,
          },
        },
        error: null,
      }))
    } catch (parseError) {
      withTargetRuntime(currentTarget.packageId, (state) => ({
        ...state,
        parsedBySource: {
          ...state.parsedBySource,
          [source]: null,
        },
        error: parseError instanceof Error ? parseError.message : t('ui.metadata.fetchParseFailed'),
      }))
    }
  }

  const runSave = async (source: MetadataSource) => {
    if (!currentTarget) {
      return
    }
    const selectedParsed = currentRuntime.parsedBySource[source]
    if (!selectedParsed) {
      return
    }

    setSaving(true)
    withTargetRuntime(currentTarget.packageId, (state) => ({ ...state, error: null }))
    try {
      await onSaveParsedMetadataToTarget(currentTarget.packageId, selectedParsed)
      if (targets.length <= 1) {
        onClose()
      }
    } catch (saveError) {
      withTargetRuntime(currentTarget.packageId, (state) => ({
        ...state,
        error: saveError instanceof Error ? saveError.message : t('ui.metadata.fetchSaveFailed'),
      }))
    } finally {
      setSaving(false)
    }
  }

  const handleInputEnterSearch = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void runSearch()
    }
  }

  return (
    <div className="settings-mask" data-slot="fg-main-toolbar-image-metadata-fetch-panel" role="dialog" aria-modal="true" aria-label={t('a11y.metadata.fetchDialog')} data-overlay-close="metadata-fetch-panel">
      <section className="settings-panel metadata-fetch-panel" data-overlay-close="metadata-fetch-panel">
        <header className="settings-head metadata-fetch-head">
          <div className="metadata-fetch-head-main">
            <h2>{t('ui.metadata.fetchTitle')}</h2>
            <p className="settings-placeholder metadata-fetch-head-placeholder">
              {`\t\t${t('ui.metadata.fetchTargetPackage', { label: currentTarget?.label || '-' })} (${Math.min(activeTargetIndex + 1, Math.max(1, targets.length))}/${Math.max(1, targets.length)})\t\t${t('ui.metadata.fetchTotalSummary', { count: resultCount, source: getSourceLabel(selectedSource) })}`}
            </p>
          </div>
          <button className="feature-action-btn main-icon-square-btn" type="button" aria-label={t('a11y.common.close')} data-tooltip-label={t('tip.common.close')} onClick={onClose}>
            <MainUiIcon name="close" />
          </button>
        </header>

        <div className="metadata-fetch-shell settings-block mpx-scrollbar-hidden mpx-overlay-merged-stack">
          <div className="metadata-fetch-search-row mpx-overlay-merged-top mpx-overlay-seamless-row" aria-label={t('ui.metadata.fetchSearchParams')}>
            <div className="metadata-fetch-source-group" role="group" aria-label={t('a11y.metadata.fetchSourceSwitch')}>
              <button type="button" className={`metadata-fetch-mode-btn mpx-overlay-seamless-cell mpx-overlay-seamless-btn ${sourceMode === 'nhentai' ? 'is-active' : ''}`} onClick={() => setSourceMode('nhentai')}>
                N
              </button>
              <button type="button" className={`metadata-fetch-mode-btn mpx-overlay-seamless-cell mpx-overlay-seamless-btn ${sourceMode === 'ehentai' ? 'is-active' : ''}`} onClick={() => setSourceMode('ehentai')}>
                E
              </button>
              <button type="button" className={`metadata-fetch-mode-btn mpx-overlay-seamless-cell mpx-overlay-seamless-btn ${sourceMode === 'all' ? 'is-active' : ''}`} onClick={() => setSourceMode('all')}>
                A
              </button>
            </div>

            <input
              className="metadata-fetch-seamless-control mpx-overlay-seamless-cell"
              type="text"
              value={inputId}
              placeholder="检索ID"
              onChange={(event) => setInputId(event.target.value)}
              onKeyDown={handleInputEnterSearch}
            />

            <input
              className="metadata-fetch-seamless-control mpx-overlay-seamless-cell"
              type="text"
              value={targetKeywords[activeTargetIndex] ?? ''}
              placeholder="检索关键字"
              onChange={(event) => {
                const nextValue = event.target.value
                setTargetKeywords((previous) => {
                  const next = [...previous]
                  next[activeTargetIndex] = nextValue
                  return next
                })
              }}
              onKeyDown={handleInputEnterSearch}
            />

            <input
              className="metadata-fetch-seamless-control metadata-fetch-interval-control mpx-overlay-seamless-cell"
              type="text"
              inputMode="numeric"
              value={requestIntervalInput}
              placeholder="请求间隔(ms)"
              onChange={(event) => {
                const digitsOnly = event.target.value.replace(/\D+/g, '')
                if (digitsOnly.length === 0) {
                  setRequestIntervalInput('')
                  setRequestIntervalMs(0)
                  return
                }
                const parsed = Number.parseInt(digitsOnly, 10)
                const nextValue = Number.isFinite(parsed) ? Math.max(0, parsed) : 0
                setRequestIntervalMs(nextValue)
                setRequestIntervalInput(`${nextValue}ms`)
              }}
              onKeyDown={handleInputEnterSearch}
            />

            <div className="metadata-fetch-search-action">
              <button
                className="feature-action-btn main-icon-square-btn metadata-fetch-search-btn mpx-overlay-seamless-cell mpx-overlay-seamless-btn"
                type="button"
                aria-label={loading ? t('a11y.common.searching') : t('a11y.common.search')}
                data-tooltip-label={loading ? t('tip.common.searching') : t('tip.common.search')}
                disabled={!canSearch || loading}
                onClick={() => void runSearch()}
              >
                <MainUiIcon name="search" />
              </button>
            </div>
          </div>
          {currentRuntime.error ? <p className="settings-danger-text">{currentRuntime.error}</p> : null}

          <div className="metadata-fetch-results mpx-overlay-merged-bottom">
            {SOURCE_KEYS.map((source) => {
              const list = currentRuntime.sourceLists[source]
              const selectedIndex = currentRuntime.selectedIndexBySource[source] ?? 0
              const isActiveSource = selectedSource === source
              const debugCollapsed = currentRuntime.previewCollapseBySource[source].debug
              const requestCollapsed = currentRuntime.previewCollapseBySource[source].request
              const responseCollapsed = currentRuntime.previewCollapseBySource[source].response
              const rawCollapsed = currentRuntime.previewCollapseBySource[source].raw
              const parsedCollapsed = currentRuntime.previewCollapseBySource[source].parsed
              const canParse = Boolean(selectedItemBySource[source])
              const canSave = Boolean(currentRuntime.parsedBySource[source]) && !saving && !metadataPending

              return (
                <section
                  key={source}
                  className={`metadata-fetch-source-column ${isActiveSource ? 'is-active' : ''}`}
                  data-source={source}
                >
                  <header className="metadata-fetch-source-head">
                    <strong>{getSourceLabel(source)}</strong>
                    <span>{t('ui.metadata.fetchSourceResultCount', { count: list.length })}</span>
                    <div className="mpx-overlay-actions mpx-overlay-actions-inline-end mpx-overlay-inline-icon-actions">
                      <button
                        className="feature-action-btn main-icon-square-btn"
                        type="button"
                        aria-label={t('a11y.common.prevPage')}
                        data-tooltip-label={t('tip.common.prevPage')}
                        disabled={targets.length <= 1 || activeTargetIndex <= 0}
                        onClick={() => {
                          setActiveTargetIndex((previous) => Math.max(0, previous - 1))
                        }}
                      >
                        <MainUiIcon name="prev" />
                      </button>
                      <button
                        className="feature-action-btn main-icon-square-btn"
                        type="button"
                        aria-label={t('a11y.common.nextPage')}
                        data-tooltip-label={t('tip.common.nextPage')}
                        disabled={targets.length <= 1 || activeTargetIndex >= targets.length - 1}
                        onClick={() => {
                          setActiveTargetIndex((previous) => Math.min(targets.length - 1, previous + 1))
                        }}
                      >
                        <MainUiIcon name="next" />
                      </button>
                      <button
                        className="feature-action-btn main-icon-square-btn"
                        type="button"
                        aria-label={t('a11y.common.parse')}
                        data-tooltip-label={t('tip.common.parse')}
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
                        data-tooltip-label={saving && selectedSource === source ? t('tip.common.saving') : t('tip.common.save')}
                        disabled={!canSave}
                        onClick={() => {
                          setSelectedSource(source)
                          void runSave(source)
                        }}
                      >
                        <MainUiIcon name="save" />
                      </button>
                    </div>
                  </header>

                  <div className="metadata-fetch-source-body mpx-scroll-area">
                    <ul className="metadata-fetch-result-list mpx-overlay-result-list">
                      {list.map((item, index) => (
                        <li key={`${source}-${item.id}-${index}`}>
                          <button
                            type="button"
                            className={isActiveSource && index === selectedIndex ? 'is-active' : ''}
                            onClick={() => {
                              setSelectedSource(source)
                              if (!currentTarget) {
                                return
                              }
                              withTargetRuntime(currentTarget.packageId, (state) => ({
                                ...state,
                                selectedIndexBySource: {
                                  ...state.selectedIndexBySource,
                                  [source]: index,
                                },
                                parsedBySource: {
                                  ...state.parsedBySource,
                                  [source]: null,
                                },
                                previewCollapseBySource: {
                                  ...state.previewCollapseBySource,
                                  [source]: {
                                    debug: false,
                                    request: false,
                                    response: false,
                                    raw: false,
                                    parsed: true,
                                  },
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
                            if (!currentTarget) {
                              return
                            }
                            withTargetRuntime(currentTarget.packageId, (state) => ({
                              ...state,
                              previewCollapseBySource: {
                                ...state.previewCollapseBySource,
                                [source]: {
                                  ...state.previewCollapseBySource[source],
                                  parsed: !state.previewCollapseBySource[source].parsed,
                                },
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
                            <AutoSizeReadonlyTextarea id={`${source}-parsed`} ariaLabel={t('ui.metadata.fetchPreviewParsed')} value={previewParsedBySource[source]} />
                        ) : null}
                      </section>

                      <section className="metadata-fetch-preview-card">
                        <button
                          type="button"
                          className="metadata-fetch-preview-toggle"
                          onClick={() => {
                            if (!currentTarget) {
                              return
                            }
                            withTargetRuntime(currentTarget.packageId, (state) => ({
                              ...state,
                              previewCollapseBySource: {
                                ...state.previewCollapseBySource,
                                [source]: {
                                  ...state.previewCollapseBySource[source],
                                  raw: !state.previewCollapseBySource[source].raw,
                                },
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
                            <AutoSizeReadonlyTextarea id={`${source}-raw`} ariaLabel={t('ui.metadata.fetchPreviewRaw')} value={previewRawBySource[source]} />
                        ) : null}
                      </section>

                      <section className="metadata-fetch-preview-card">
                        <button
                          type="button"
                          className="metadata-fetch-preview-toggle"
                          onClick={() => {
                            if (!currentTarget) {
                              return
                            }
                            withTargetRuntime(currentTarget.packageId, (state) => ({
                              ...state,
                              previewCollapseBySource: {
                                ...state.previewCollapseBySource,
                                [source]: {
                                  ...state.previewCollapseBySource[source],
                                  debug: !state.previewCollapseBySource[source].debug,
                                },
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
                             ariaLabel={t('ui.metadata.fetchPreviewDebugTrace')}
                             value={previewDebugBySource[source]}
                          />
                        ) : null}
                      </section>

                      <section className="metadata-fetch-preview-card">
                        <button
                          type="button"
                          className="metadata-fetch-preview-toggle"
                          onClick={() => {
                            if (!currentTarget) {
                              return
                            }
                            withTargetRuntime(currentTarget.packageId, (state) => ({
                              ...state,
                              previewCollapseBySource: {
                                ...state.previewCollapseBySource,
                                [source]: {
                                  ...state.previewCollapseBySource[source],
                                  request: !state.previewCollapseBySource[source].request,
                                },
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
                              ariaLabel={t('ui.metadata.fetchPreviewRequestBody')}
                              value={currentRuntime.requestPreviewBySource[source]}
                           />
                        ) : null}
                      </section>

                      <section className="metadata-fetch-preview-card">
                        <button
                          type="button"
                          className="metadata-fetch-preview-toggle"
                          onClick={() => {
                            if (!currentTarget) {
                              return
                            }
                            withTargetRuntime(currentTarget.packageId, (state) => ({
                              ...state,
                              previewCollapseBySource: {
                                ...state.previewCollapseBySource,
                                [source]: {
                                  ...state.previewCollapseBySource[source],
                                  response: !state.previewCollapseBySource[source].response,
                                },
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
                              ariaLabel={t('ui.metadata.fetchPreviewResponseBody')}
                              value={currentRuntime.responsePreviewBySource[source]}
                           />
                        ) : null}
                      </section>
                    </div>
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}

export default MetadataFetchPanel
