import { Profiler, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import type { MediaRepository } from '../features/backend/repository'
import { useResolvedMediaUrls } from '../features/backend/useResolvedMediaUrls'
import { benchEnd, benchMark, benchOnReactRender } from '../features/perf/benchRecorder'
import { getBenchSettings } from '../features/perf/benchSettings'
import type { FocusedImageRef, ImageItem, ImagePackage, MediaLocator } from '../types'
import ImageMainSection from '../components/ImageMainSection'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function resolveNumber(value: unknown, fallback: number, min = 1, max = 10_000): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.max(min, Math.min(max, Math.round(parsed)))
}

const ONE_PIXEL_DATA_URL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

function buildFakeRepository(params: { minDelayMs: number; maxDelayMs: number }): MediaRepository {
  const min = Math.max(0, params.minDelayMs)
  const max = Math.max(min, params.maxDelayMs)

  const resolveMediaResource = async () => {
    const delay = min + Math.floor(Math.random() * (max - min + 1))
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
    return {
      resource_url: ONE_PIXEL_DATA_URL,
      mime_type: 'image/gif',
      expires_at_ms: Date.now() + 60_000,
    }
  }

  // Bench only: we only use resolveMediaResource.
  return {
    getInitialLibrarySnapshot: () => null,
    readLibrarySnapshot: async () => {
      throw new Error('not_implemented')
    },
    readImageSidebarTree: async () => {
      throw new Error('not_implemented')
    },
    readImagePage: async () => {
      throw new Error('not_implemented')
    },
    readImageMetadata: async () => {
      throw new Error('not_implemented')
    },
    resolveMediaResource: resolveMediaResource as unknown as MediaRepository['resolveMediaResource'],
    writePackageGrade: async () => {
      throw new Error('not_implemented')
    },
    saveVideoCover: async () => {
      throw new Error('not_implemented')
    },
    readPlaylist: async () => {
      throw new Error('not_implemented')
    },
    writePlaylist: async () => {
      throw new Error('not_implemented')
    },
    pickImportPaths: undefined,
    readClipboardImportPaths: async () => {
      throw new Error('not_implemented')
    },
    enqueueImportTask: async () => {
      throw new Error('not_implemented')
    },
    readImportTasks: async () => {
      throw new Error('not_implemented')
    },
    retryImportTask: async () => {
      throw new Error('not_implemented')
    },
    readMediaAccessAudit: async () => {
      throw new Error('not_implemented')
    },
    readRuntimeCapabilities: async () => {
      throw new Error('not_implemented')
    },
    clearDatabase: async () => {
      throw new Error('not_implemented')
    },
  }
}

function buildLocator(index: number): MediaLocator {
  return {
    kind: 'filesystem',
    absolutePath: `C:/MediaPlayerXBench/fake-${index}.jpg`,
    extension: '.jpg',
    mediaType: 'image',
    mimeType: 'image/jpeg',
  }
}

function buildPackage(targetCount: number): ImagePackage {
  const images: ImageItem[] = []
  for (let index = 0; index < targetCount; index += 1) {
    images.push({
      id: `bench-img-${index}`,
      ordinal: index + 1,
      width: 1200,
      height: 1600,
      sizeKb: 0,
      cluster: 0,
      color: index % 2 === 0 ? '#4f86cf' : '#d58b45',
      mediaLocator: buildLocator(index),
    })
  }

  return {
    id: 'bench-package',
    packageName: 'bench',
    displayName: 'DOM Bench',
    absolutePath: 'C:/MediaPlayerXBench',
    treePath: ['DOM Bench'],
    workTitle: '',
    circle: '',
    author: '',
    tags: [],
    images,
  }
}

export interface DomBenchRunnerProps {
  config: Record<string, unknown>
}

function DomBenchRunner({ config }: DomBenchRunnerProps) {
  const domConfig = useMemo(() => {
    const raw = isRecord(config.dom) ? config.dom : config
    return {
      targetCount: resolveNumber(raw.targetCount ?? raw.target_count, 240, 20, 2000),
      minDelayMs: resolveNumber(raw.resolveDelayMinMs ?? raw.resolve_delay_min_ms, 5, 0, 1000),
      maxDelayMs: resolveNumber(raw.resolveDelayMaxMs ?? raw.resolve_delay_max_ms, 35, 0, 5000),
    }
  }, [config])

  const settings = getBenchSettings()
  const repository = useMemo(
    () => buildFakeRepository({ minDelayMs: domConfig.minDelayMs, maxDelayMs: domConfig.maxDelayMs }),
    [domConfig.maxDelayMs, domConfig.minDelayMs],
  )

  const pkg = useMemo(() => buildPackage(domConfig.targetCount), [domConfig.targetCount])
  const packageById = useMemo(() => new Map<string, ImagePackage>([[pkg.id, pkg]]), [pkg])

  const refsInPage = useMemo<FocusedImageRef[]>(() => {
    return pkg.images.map((_img, imageIndex) => ({ packageId: pkg.id, imageIndex }))
  }, [pkg.id, pkg.images])

  const targets = useMemo(() => {
    return pkg.images.map((image) => ({
      targetId: `image:${image.id}`,
      locator: image.mediaLocator,
      variant: 'thumbnail' as const,
      thumbnailMaxEdge: 320,
      thumbnailQuality: 82,
    }))
  }, [pkg.images])

  const resolved = useResolvedMediaUrls({
    repository,
    targets,
    options: settings.resolvedMedia,
  })

  const imageUrlById = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {}
    for (const [targetId, url] of Object.entries(resolved.urlByTargetId)) {
      if (!targetId.startsWith('image:')) {
        continue
      }
      next[targetId.slice('image:'.length)] = url
    }
    return next
  }, [resolved.urlByTargetId])

  const gridRef = useRef<HTMLDivElement>(null)
  const [finished, setFinished] = useState(false)
  const markedFirstResolvedRef = useRef(false)
  const markedAllResolvedRef = useRef(false)
  const finishingRef = useRef(false)

  useLayoutEffect(() => {
    benchMark('dom_placeholders_committed', {
      target_count: domConfig.targetCount,
      apply_mode: settings.resolvedMedia.applyMode ?? 'immediate',
      state_scope: settings.resolvedMedia.stateScope ?? 'accumulate',
      max_concurrent: settings.resolvedMedia.maxConcurrent ?? null,
    })
  }, [domConfig.targetCount, settings.resolvedMedia.applyMode, settings.resolvedMedia.maxConcurrent, settings.resolvedMedia.stateScope])

  useEffect(() => {
    const resolvedCount = Object.keys(imageUrlById).length
    if (resolvedCount > 0 && !markedFirstResolvedRef.current) {
      markedFirstResolvedRef.current = true
      benchMark('dom_first_thumbnail_url_applied', {
        resolved_count: resolvedCount,
      })
    }

    if (resolvedCount >= domConfig.targetCount && !markedAllResolvedRef.current) {
      markedAllResolvedRef.current = true
      benchMark('dom_all_thumbnail_urls_applied', {
        resolved_count: resolvedCount,
      })

      if (!finishingRef.current) {
        finishingRef.current = true
        setTimeout(() => {
          const baseReport = benchEnd()
          const report = {
            ...(baseReport ?? {}),
            dom: {
              target_count: domConfig.targetCount,
              resolved_count: resolvedCount,
              delay_ms: {
                min: domConfig.minDelayMs,
                max: domConfig.maxDelayMs,
              },
            },
          }
          const promise = window.mediaPlayerBench ? window.mediaPlayerBench.finish(report) : Promise.resolve(null)
          void promise.finally(() => {
            setFinished(true)
          })
        }, 600)
      }
    }
  }, [domConfig.maxDelayMs, domConfig.minDelayMs, domConfig.targetCount, imageUrlById])

  if (finished) {
    return (
      <div style={{ padding: 16, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
        <strong>DOM Bench 已完成</strong>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 12, borderBottom: '1px solid #ddd', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
        <div>{`DOM Bench | candidate=${settings.candidateId ?? '-'} | target=${domConfig.targetCount} | resolved=${Object.keys(imageUrlById).length}`}</div>
      </div>

      <div style={{ minHeight: 0, flex: 1, padding: 12 }}>
        <Profiler id="DomBench:ImageMainSection" onRender={benchOnReactRender}>
          <ImageMainSection
            vectorMode={false}
            showNamesOnly={false}
            loading={false}
            placeholderCount={domConfig.targetCount}
            enableLoadingSkeleton={false}
            activePackage={pkg}
            focusedRef={{ packageId: pkg.id, imageIndex: 0 }}
            focusedImageExists={true}
            visibleImageRefs={refsInPage}
            refsInPage={refsInPage}
            pageStart={0}
            actualCellWidth={220}
            actualMediaHeight={280}
            thumbnailColumns={10}
            thumbnailGap={8}
            vectorCandidates={[]}
            normalizedPageIndex={0}
            imageTotalPages={1}
            packageById={packageById}
            imageUrlById={imageUrlById}
            gridRef={gridRef}
            manageMode={false}
            checkedImageIds={new Set()}
            adReviewScopeImageIds={new Set()}
            adReviewLlmReviewedImageIds={new Set()}
            adReviewNonLlmReviewedImageIds={new Set()}
            onToggleImageChecked={() => undefined}
            onReplaceCheckedImages={() => undefined}
            onToggleShowNamesOnly={() => undefined}
            onEnterFullscreen={() => undefined}
            onSelectImage={() => undefined}
            onPrevPage={() => undefined}
            onNextPage={() => undefined}
          />
        </Profiler>
      </div>
    </div>
  )
}

export default DomBenchRunner
