import { useEffect, useMemo, useState } from 'react'

import type { BrowserMode, ImagePackage } from '../../types'

type SearchPanelMode = 'vector' | 'feature'

interface UseFeatureSearchParams {
  mode: BrowserMode
  vectorMode: boolean
  imageSources: ImagePackage[]
}

export function useFeatureSearch({
  mode,
  vectorMode,
  imageSources,
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

  const featureSearchActive = mode === 'image' && vectorMode && searchPanelMode === 'feature'

  const featureCircleOptions = useMemo(
    () => Array.from(new Set(imageSources.map((source) => source.circle))).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [imageSources],
  )

  const featureAuthorOptions = useMemo(
    () => Array.from(new Set(imageSources.map((source) => source.author))).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [imageSources],
  )

  const featureTagOptions = useMemo(
    () => Array.from(new Set(imageSources.flatMap((source) => source.tags))).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [imageSources],
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
