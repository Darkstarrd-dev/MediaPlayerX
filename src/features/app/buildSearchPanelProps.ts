import type { Dispatch, MouseEvent as ReactMouseEvent, RefObject, SetStateAction } from 'react'

interface BuildSearchPanelPropsParams {
  vectorMode: boolean
  manageMode: boolean
  searchPanelCollapsed: boolean
  setSearchPanelCollapsed: Dispatch<SetStateAction<boolean>>
  workspaceBottomPanelHeight: number
  vectorPanelRef: RefObject<HTMLDivElement | null>
  vectorPanelContentRef: RefObject<HTMLDivElement | null>
  featureResultCount: number
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
  onStartWorkspaceBottomPanelResize: (event: ReactMouseEvent<HTMLDivElement>) => void
  layoutLocked: boolean
}

export function buildSearchPanelProps(params: BuildSearchPanelPropsParams) {
  return {
    visible: params.vectorMode && !params.manageMode,
    collapsed: params.searchPanelCollapsed,
    panelHeight: params.workspaceBottomPanelHeight,
    panelRef: params.vectorPanelRef,
    panelContentRef: params.vectorPanelContentRef,
    featureResultCount: params.featureResultCount,
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
    onStartResize: params.onStartWorkspaceBottomPanelResize,
    layoutLocked: params.layoutLocked,
  }
}
