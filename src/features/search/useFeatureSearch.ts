import { useEffect, useMemo, useState } from 'react'

import type { BrowserMode, ImagePackage } from '../../types'

type SearchPanelMode = 'vector' | 'feature'

interface UseFeatureSearchParams {
  mode: BrowserMode
  vectorMode: boolean
  imageSources: ImagePackage[]
  imagePackages: ImagePackage[]
  imageDirectories: ImagePackage[]
  gradeByPackage: Record<string, number | null>
}

interface FeatureFilters {
  nameQuery: string
  workTitleQuery: string
  circleQuery: string
  authorQuery: string
  selectedTags: string[]
  gradeFilter: number | null
}

function normalizeFeatureFilters(
  nameQuery: string,
  workTitleQuery: string,
  circleQuery: string,
  authorQuery: string,
  featureTags: string[],
  featureGradeFilter: number | null,
): FeatureFilters {
  return {
    nameQuery: nameQuery.trim().toLowerCase(),
    workTitleQuery: workTitleQuery.trim().toLowerCase(),
    circleQuery: circleQuery.trim().toLowerCase(),
    authorQuery: authorQuery.trim().toLowerCase(),
    selectedTags: featureTags.map((tag) => tag.toLowerCase()),
    gradeFilter: featureGradeFilter,
  }
}

function matchesFeatureFilters(
  source: ImagePackage,
  filters: FeatureFilters,
  gradeByPackage: Record<string, number | null>,
): boolean {
  if (filters.nameQuery) {
    const matchesName = [source.packageName, source.displayName].some((value) =>
      value.toLowerCase().includes(filters.nameQuery),
    )
    if (!matchesName) {
      return false
    }
  }

  if (filters.workTitleQuery && !source.workTitle.toLowerCase().includes(filters.workTitleQuery)) {
    return false
  }

  if (filters.circleQuery && !source.circle.toLowerCase().includes(filters.circleQuery)) {
    return false
  }

  if (filters.authorQuery && !source.author.toLowerCase().includes(filters.authorQuery)) {
    return false
  }

  if (filters.selectedTags.length > 0) {
    const lowerTags = source.tags.map((tag) => tag.toLowerCase())
    const allTagsMatched = filters.selectedTags.every((tag) => lowerTags.includes(tag))
    if (!allTagsMatched) {
      return false
    }
  }

  if (filters.gradeFilter !== null) {
    const grade = gradeByPackage[source.id] ?? 0
    if (grade !== filters.gradeFilter) {
      return false
    }
  }

  return true
}

export function useFeatureSearch({
  mode,
  vectorMode,
  imageSources,
  imagePackages,
  imageDirectories,
  gradeByPackage,
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

  const featureFilters = useMemo(
    () =>
      normalizeFeatureFilters(
        featureNameQuery,
        featureWorkTitleQuery,
        featureCircleQuery,
        featureAuthorQuery,
        featureTags,
        featureGradeFilter,
      ),
    [featureAuthorQuery, featureCircleQuery, featureGradeFilter, featureNameQuery, featureTags, featureWorkTitleQuery],
  )

  const scopedSearchPackages = useMemo(() => {
    if (!featureSearchActive) {
      return imagePackages
    }

    return imagePackages.filter((pkg) => matchesFeatureFilters(pkg, featureFilters, gradeByPackage))
  }, [featureFilters, featureSearchActive, gradeByPackage, imagePackages])

  const scopedSearchDirectories = useMemo(() => {
    if (!featureSearchActive) {
      return imageDirectories
    }

    return imageDirectories.filter((directory) => matchesFeatureFilters(directory, featureFilters, gradeByPackage))
  }, [featureFilters, featureSearchActive, gradeByPackage, imageDirectories])

  const scopedImageSources = useMemo(
    () => [...scopedSearchPackages, ...scopedSearchDirectories],
    [scopedSearchDirectories, scopedSearchPackages],
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
    scopedSearchPackages,
    scopedSearchDirectories,
    scopedImageSources,
  }
}
