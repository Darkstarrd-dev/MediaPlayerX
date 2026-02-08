import type { Dispatch, MouseEvent as ReactMouseEvent, RefObject, SetStateAction } from 'react'

import type { AppSettings } from '../../contracts/settings'
import type { ImagePackage } from '../../types'

interface BuildSearchPanelPropsParams {
  mode: AppSettings['mode']
  vectorMode: boolean
  searchPanelCollapsed: boolean
  setSearchPanelCollapsed: Dispatch<SetStateAction<boolean>>
  vectorPanelHeight: number
  vectorPanelRef: RefObject<HTMLDivElement | null>
  vectorPanelContentRef: RefObject<HTMLDivElement | null>
  searchPanelMode: 'vector' | 'feature'
  setSearchPanelMode: (mode: 'vector' | 'feature') => void
  vectorSearchResultsCount: number
  featureResultCount: number
  focusedRef: { packageId: string; imageIndex: number } | null
  focusedImagePackage: ImagePackage | null
  focusedImageOrdinal: number | null
  runVectorSearch: () => void
  vectorThreshold: number
  updateSettings: (patch: Partial<AppSettings>) => void
  featureNameQuery: string
  setFeatureNameQuery: (value: string) => void
  featureWorkTitleQuery: string
  setFeatureWorkTitleQuery: (value: string) => void
  featureCircleQuery: string
  setFeatureCircleQuery: (value: string) => void
  featureAuthorQuery: string
  setFeatureAuthorQuery: (value: string) => void
  featureCircleOptions: string[]
  featureAuthorOptions: string[]
  featureTagOptions: string[]
  featureTagPickerOpen: boolean
  setFeatureTagPickerOpen: Dispatch<SetStateAction<boolean>>
  featureTags: string[]
  setFeatureTags: Dispatch<SetStateAction<string[]>>
  featureGradeFilter: number | null
  setFeatureGradeFilter: (value: number | null) => void
  onStartVectorPanelResize: (event: ReactMouseEvent<HTMLDivElement>) => void
  layoutLocked: boolean
}

export function buildSearchPanelProps(params: BuildSearchPanelPropsParams) {
  return {
    visible: params.mode === 'image' && params.vectorMode,
    collapsed: params.searchPanelCollapsed,
    panelHeight: params.vectorPanelHeight,
    panelRef: params.vectorPanelRef,
    panelContentRef: params.vectorPanelContentRef,
    searchPanelMode: params.searchPanelMode,
    onSearchPanelModeChange: params.setSearchPanelMode,
    vectorResultCount: params.vectorSearchResultsCount,
    featureResultCount: params.featureResultCount,
    focusedRef: params.focusedRef,
    focusedImagePackage: params.focusedImagePackage,
    focusedImageOrdinal: params.focusedImageOrdinal,
    onRunVectorSearch: params.runVectorSearch,
    vectorThreshold: params.vectorThreshold,
    onVectorThresholdChange: (value: number) => params.updateSettings({ vectorThreshold: value }),
    featureNameQuery: params.featureNameQuery,
    onFeatureNameQueryChange: params.setFeatureNameQuery,
    featureWorkTitleQuery: params.featureWorkTitleQuery,
    onFeatureWorkTitleQueryChange: params.setFeatureWorkTitleQuery,
    featureCircleQuery: params.featureCircleQuery,
    onFeatureCircleQueryChange: params.setFeatureCircleQuery,
    featureAuthorQuery: params.featureAuthorQuery,
    onFeatureAuthorQueryChange: params.setFeatureAuthorQuery,
    featureCircleOptions: params.featureCircleOptions,
    featureAuthorOptions: params.featureAuthorOptions,
    featureTagOptions: params.featureTagOptions,
    featureTagPickerOpen: params.featureTagPickerOpen,
    onToggleFeatureTagPicker: () => params.setFeatureTagPickerOpen((value) => !value),
    featureTags: params.featureTags,
    onClearFeatureTags: () => params.setFeatureTags([]),
    onToggleFeatureTag: (tag: string) => {
      params.setFeatureTags((previous) => {
        if (previous.includes(tag)) {
          return previous.filter((item) => item !== tag)
        }
        return [...previous, tag]
      })
    },
    featureGradeFilter: params.featureGradeFilter,
    onFeatureGradeFilterChange: params.setFeatureGradeFilter,
    onCollapse: () => params.setSearchPanelCollapsed(true),
    onExpand: () => params.setSearchPanelCollapsed(false),
    onStartResize: params.onStartVectorPanelResize,
    layoutLocked: params.layoutLocked,
  }
}
