import { describe, expect, it, vi } from 'vitest'

import { buildSearchPanelProps } from './buildSearchPanelProps'

describe('buildSearchPanelProps', () => {
  it('可见性与折叠行为符合检索容器规则', () => {
    const setSearchPanelCollapsed = vi.fn()

    const props = buildSearchPanelProps({
      vectorMode: true,
      manageMode: false,
      searchPanelCollapsed: false,
      setSearchPanelCollapsed,
      vectorPanelHeight: 240,
      vectorPanelRef: { current: null },
      vectorPanelContentRef: { current: null },
      featureResultCount: 2,
      featureNameQuery: '',
      setFeatureNameQuery: vi.fn(),
      featureWorkTitleQuery: '',
      setFeatureWorkTitleQuery: vi.fn(),
      featureCircleQuery: '',
      setFeatureCircleQuery: vi.fn(),
      featureAuthorQuery: '',
      setFeatureAuthorQuery: vi.fn(),
      featureCircleOptions: ['A'],
      featureAuthorOptions: ['B'],
      featureTagOptions: ['tag-1'],
      featureTagPickerOpen: false,
      setFeatureTagPickerOpen: vi.fn(),
      featureTags: ['tag-1'],
      setFeatureTags: vi.fn(),
      featureGradeFilter: null,
      setFeatureGradeFilter: vi.fn(),
      onStartVectorPanelResize: vi.fn(),
      layoutLocked: false,
    })

    expect(props.visible).toBe(true)
    props.onCollapse()
    props.onExpand()
    expect(setSearchPanelCollapsed).toHaveBeenNthCalledWith(1, true)
    expect(setSearchPanelCollapsed).toHaveBeenNthCalledWith(2, false)
  })

  it('tag 切换逻辑支持添加与移除，clear 会写空数组', () => {
    const setFeatureTags = vi.fn()

    const props = buildSearchPanelProps({
      vectorMode: true,
      manageMode: false,
      searchPanelCollapsed: true,
      setSearchPanelCollapsed: vi.fn(),
      vectorPanelHeight: 240,
      vectorPanelRef: { current: null },
      vectorPanelContentRef: { current: null },
      featureResultCount: 0,
      featureNameQuery: '',
      setFeatureNameQuery: vi.fn(),
      featureWorkTitleQuery: '',
      setFeatureWorkTitleQuery: vi.fn(),
      featureCircleQuery: '',
      setFeatureCircleQuery: vi.fn(),
      featureAuthorQuery: '',
      setFeatureAuthorQuery: vi.fn(),
      featureCircleOptions: [],
      featureAuthorOptions: [],
      featureTagOptions: [],
      featureTagPickerOpen: false,
      setFeatureTagPickerOpen: vi.fn(),
      featureTags: [],
      setFeatureTags,
      featureGradeFilter: null,
      setFeatureGradeFilter: vi.fn(),
      onStartVectorPanelResize: vi.fn(),
      layoutLocked: true,
    })

    props.onToggleFeatureTag('tag-a')
    const tagUpdater = setFeatureTags.mock.calls[0]?.[0] as ((value: string[]) => string[]) | undefined
    expect(tagUpdater?.([])).toEqual(['tag-a'])
    expect(tagUpdater?.(['tag-a', 'tag-b'])).toEqual(['tag-b'])

    props.onClearFeatureTags()
    expect(setFeatureTags).toHaveBeenNthCalledWith(2, [])
  })
})
