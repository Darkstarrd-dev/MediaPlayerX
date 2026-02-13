import { useCallback, useEffect, useMemo, useState } from 'react'

import type { AudioItem, BrowserMode, ImagePackage, VideoItem } from '../../types'

type SearchPanelMode = 'vector' | 'feature'

interface QuickFeatureSearchPatch {
  workTitle?: string
  seriesId?: string
  circle?: string
  author?: string
  tag?: string
}

interface UseFeatureSearchParams {
  mode: BrowserMode
  vectorMode: boolean
  imageSources: ImagePackage[]
  videos: VideoItem[]
  audios: AudioItem[]
}

function normalizeTagsFromValues(values: string[]): string[] {
  return values
    .flatMap((value) => value.split(/[\n,，;；|/]+/g))
    .map((value) => value.trim())
    .filter(Boolean)
}

export function useFeatureSearch({
  mode,
  vectorMode,
  imageSources,
  videos,
  audios,
}: UseFeatureSearchParams) {
  const [searchPanelMode, setSearchPanelMode] = useState<SearchPanelMode>('feature')
  const [featureNameQuery, setFeatureNameQuery] = useState('')
  const [featureWorkTitleQuery, setFeatureWorkTitleQuery] = useState('')
  const [featureCircleQuery, setFeatureCircleQuery] = useState('')
  const [featureAuthorQuery, setFeatureAuthorQuery] = useState('')
  const [featureTags, setFeatureTags] = useState<string[]>([])
  const [featureGradeFilter, setFeatureGradeFilter] = useState<number | null>(null)
  const [featureTagPickerOpen, setFeatureTagPickerOpen] = useState(false)
  const [searchPanelCollapsed, setSearchPanelCollapsed] = useState(false)
  const [quickFeatureWorkTitleQuery, setQuickFeatureWorkTitleQuery] = useState('')
  const [quickFeatureSeriesIdQuery, setQuickFeatureSeriesIdQuery] = useState('')
  const [quickFeatureCircleQuery, setQuickFeatureCircleQuery] = useState('')
  const [quickFeatureAuthorQuery, setQuickFeatureAuthorQuery] = useState('')
  const [quickFeatureTags, setQuickFeatureTags] = useState<string[]>([])

  useEffect(() => {
    if (!vectorMode || searchPanelMode !== 'feature') {
      setFeatureTagPickerOpen(false)
    }
  }, [searchPanelMode, vectorMode])

  useEffect(() => {
    if (searchPanelMode !== 'feature') {
      setSearchPanelMode('feature')
    }
  }, [searchPanelMode])

  useEffect(() => {
    if (!vectorMode && searchPanelCollapsed) {
      setSearchPanelCollapsed(false)
    }
  }, [searchPanelCollapsed, vectorMode])

  const featureSearchActive = vectorMode && searchPanelMode === 'feature'
  const quickFeatureSearchActive =
    quickFeatureWorkTitleQuery.length > 0 ||
    quickFeatureSeriesIdQuery.length > 0 ||
    quickFeatureCircleQuery.length > 0 ||
    quickFeatureAuthorQuery.length > 0 ||
    quickFeatureTags.length > 0

  const clearQuickFeatureSearch = useCallback(() => {
    setQuickFeatureWorkTitleQuery('')
    setQuickFeatureSeriesIdQuery('')
    setQuickFeatureCircleQuery('')
    setQuickFeatureAuthorQuery('')
    setQuickFeatureTags([])
  }, [])

  const applyQuickFeatureSearch = useCallback(
    (patch: QuickFeatureSearchPatch) => {
      const nextWorkTitle = patch.workTitle?.trim() ?? ''
      const nextSeriesId = patch.seriesId?.trim() ?? ''
      const nextCircle = patch.circle?.trim() ?? ''
      const nextAuthor = patch.author?.trim() ?? ''
      const nextTag = patch.tag?.trim() ?? ''
      const nextTags = nextTag.length > 0 ? [nextTag] : []

      const hasFilter =
        nextWorkTitle.length > 0 ||
        nextSeriesId.length > 0 ||
        nextCircle.length > 0 ||
        nextAuthor.length > 0 ||
        nextTags.length > 0
      if (!hasFilter) {
        clearQuickFeatureSearch()
        return
      }

      setQuickFeatureWorkTitleQuery(nextWorkTitle)
      setQuickFeatureSeriesIdQuery(nextSeriesId)
      setQuickFeatureCircleQuery(nextCircle)
      setQuickFeatureAuthorQuery(nextAuthor)
      setQuickFeatureTags(nextTags)
    },
    [clearQuickFeatureSearch],
  )

  const featureCircleOptions = useMemo(
    () =>
      Array.from(
        new Set(
          mode === 'image'
            ? imageSources.flatMap((source) => [source.circle, source.externalMetadata?.groupName ?? '', source.externalMetadata?.groupNameJpn ?? ''])
            : mode === 'video'
              ? videos.map((video) => video.circle)
              : audios.map((audio) => audio.album),
        ),
      )
        .filter((value) => value.trim().length > 0)
        .sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [audios, imageSources, mode, videos],
  )

  const featureAuthorOptions = useMemo(
    () =>
      Array.from(
        new Set(
          mode === 'image'
            ? imageSources.flatMap((source) => [source.author, source.externalMetadata?.artist ?? '', source.externalMetadata?.artistJpn ?? ''])
            : mode === 'video'
              ? videos.map((video) => video.author)
              : audios.map((audio) => audio.author),
        ),
      )
        .filter((value) => value.trim().length > 0)
        .sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [audios, imageSources, mode, videos],
  )

  const featureTagOptions = useMemo(
    () =>
      Array.from(
        new Set(
          normalizeTagsFromValues([
            ...(mode === 'image' ? imageSources.flatMap((source) => source.tags) : mode === 'video' ? videos.flatMap((video) => video.tags) : []),
            ...(mode === 'image'
              ? imageSources.flatMap((source) =>
                  Object.entries(source.externalMetadata?.tags ?? {}).flatMap(([namespace, raw]) =>
                    raw
                      .split(',')
                      .map((value) => value.trim())
                      .filter(Boolean)
                      .flatMap((value) => [value, `${namespace}:${value}`]),
                  ),
                )
              : []),
          ]),
        ),
      ).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [imageSources, mode, videos],
  )

  return {
    searchPanelMode,
    setSearchPanelMode,
    searchPanelCollapsed,
    setSearchPanelCollapsed,
    featureSearchActive,
    quickFeatureSearchActive,
    quickFeatureWorkTitleQuery,
    quickFeatureSeriesIdQuery,
    quickFeatureCircleQuery,
    quickFeatureAuthorQuery,
    quickFeatureTags,
    applyQuickFeatureSearch,
    clearQuickFeatureSearch,
    featureNameQuery,
    setFeatureNameQuery,
    featureWorkTitleQuery,
    setFeatureWorkTitleQuery,
    featureCircleQuery,
    setFeatureCircleQuery,
    featureAuthorQuery,
    setFeatureAuthorQuery,
    featureTags,
    setFeatureTags,
    featureGradeFilter,
    setFeatureGradeFilter,
    featureTagPickerOpen,
    setFeatureTagPickerOpen,
    featureCircleOptions,
    featureAuthorOptions,
    featureTagOptions,
  }
}
