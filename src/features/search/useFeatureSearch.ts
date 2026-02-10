import { useCallback, useEffect, useMemo, useState } from 'react'

import type { BrowserMode, ImagePackage, VideoItem } from '../../types'

type SearchPanelMode = 'vector' | 'feature'

interface QuickFeatureSearchPatch {
  workTitle?: string
  circle?: string
  author?: string
  tag?: string
}

interface UseFeatureSearchParams {
  mode: BrowserMode
  vectorMode: boolean
  imageSources: ImagePackage[]
  videos: VideoItem[]
}

export function useFeatureSearch({
  mode,
  vectorMode,
  imageSources,
  videos,
}: UseFeatureSearchParams) {
  const [searchPanelMode, setSearchPanelMode] = useState<SearchPanelMode>('vector')
  const [featureNameQuery, setFeatureNameQuery] = useState('')
  const [featureWorkTitleQuery, setFeatureWorkTitleQuery] = useState('')
  const [featureCircleQuery, setFeatureCircleQuery] = useState('')
  const [featureAuthorQuery, setFeatureAuthorQuery] = useState('')
  const [featureTags, setFeatureTags] = useState<string[]>([])
  const [featureGradeFilter, setFeatureGradeFilter] = useState<number | null>(null)
  const [featureTagPickerOpen, setFeatureTagPickerOpen] = useState(false)
  const [searchPanelCollapsed, setSearchPanelCollapsed] = useState(false)
  const [quickFeatureWorkTitleQuery, setQuickFeatureWorkTitleQuery] = useState('')
  const [quickFeatureCircleQuery, setQuickFeatureCircleQuery] = useState('')
  const [quickFeatureAuthorQuery, setQuickFeatureAuthorQuery] = useState('')
  const [quickFeatureTags, setQuickFeatureTags] = useState<string[]>([])

  useEffect(() => {
    if (!vectorMode || searchPanelMode !== 'feature') {
      setFeatureTagPickerOpen(false)
    }
  }, [searchPanelMode, vectorMode])

  useEffect(() => {
    if (!vectorMode && searchPanelCollapsed) {
      setSearchPanelCollapsed(false)
    }
  }, [searchPanelCollapsed, vectorMode])

  useEffect(() => {
    if (mode === 'video' && searchPanelMode === 'vector') {
      setSearchPanelMode('feature')
    }
  }, [mode, searchPanelMode])

  const featureSearchActive = vectorMode && searchPanelMode === 'feature'
  const quickFeatureSearchActive =
    quickFeatureWorkTitleQuery.length > 0 ||
    quickFeatureCircleQuery.length > 0 ||
    quickFeatureAuthorQuery.length > 0 ||
    quickFeatureTags.length > 0

  const clearQuickFeatureSearch = useCallback(() => {
    setQuickFeatureWorkTitleQuery('')
    setQuickFeatureCircleQuery('')
    setQuickFeatureAuthorQuery('')
    setQuickFeatureTags([])
  }, [])

  const applyQuickFeatureSearch = useCallback(
    (patch: QuickFeatureSearchPatch) => {
      const nextWorkTitle = patch.workTitle?.trim() ?? ''
      const nextCircle = patch.circle?.trim() ?? ''
      const nextAuthor = patch.author?.trim() ?? ''
      const nextTag = patch.tag?.trim() ?? ''
      const nextTags = nextTag.length > 0 ? [nextTag] : []

      const hasFilter =
        nextWorkTitle.length > 0 || nextCircle.length > 0 || nextAuthor.length > 0 || nextTags.length > 0
      if (!hasFilter) {
        clearQuickFeatureSearch()
        return
      }

      setQuickFeatureWorkTitleQuery(nextWorkTitle)
      setQuickFeatureCircleQuery(nextCircle)
      setQuickFeatureAuthorQuery(nextAuthor)
      setQuickFeatureTags(nextTags)
    },
    [clearQuickFeatureSearch],
  )

  const featureCircleOptions = useMemo(
    () =>
      Array.from(new Set((mode === 'image' ? imageSources.map((source) => source.circle) : videos.map((video) => video.circle))))
        .sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [imageSources, mode, videos],
  )

  const featureAuthorOptions = useMemo(
    () =>
      Array.from(new Set((mode === 'image' ? imageSources.map((source) => source.author) : videos.map((video) => video.author))))
        .sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [imageSources, mode, videos],
  )

  const featureTagOptions = useMemo(
    () =>
      Array.from(new Set(mode === 'image' ? imageSources.flatMap((source) => source.tags) : videos.flatMap((video) => video.tags)))
        .sort((a, b) => a.localeCompare(b, 'zh-CN')),
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
