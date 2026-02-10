import { useEffect, useMemo, useState } from 'react'

import type { BrowserMode, ImagePackage, VideoItem } from '../../types'

type SearchPanelMode = 'vector' | 'feature'

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
