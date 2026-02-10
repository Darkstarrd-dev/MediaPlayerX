import { describe, expect, it, vi } from 'vitest'

import type { ImagePackage } from '../../types'
import { buildSearchPanelProps } from './buildSearchPanelProps'

const IMAGE_PACKAGE_FIXTURE: ImagePackage = {
  id: 'pkg-1',
  packageName: 'pkg-1.zip',
  displayName: 'pkg-1',
  absolutePath: 'D:/pkg-1.zip',
  treePath: ['pkg-1.zip'],
  workTitle: 'pkg-1',
  circle: '未知',
  author: '未知',
  tags: [],
  mockGrade: 0,
  images: [],
}

describe('buildSearchPanelProps', () => {
  it('可见性与筛选更新回调符合当前模式约束', () => {
    const updateSettings = vi.fn()
    const setSearchPanelCollapsed = vi.fn()
    const setFeatureTagPickerOpen = vi.fn()

    const props = buildSearchPanelProps({
      mode: 'image',
      vectorMode: true,
      manageMode: false,
      searchPanelCollapsed: false,
      setSearchPanelCollapsed,
      vectorPanelHeight: 240,
      vectorPanelRef: { current: null },
      vectorPanelContentRef: { current: null },
      searchPanelMode: 'feature',
      setSearchPanelMode: vi.fn(),
      vectorSearchResultsCount: 3,
      featureResultCount: 2,
      focusedRef: { packageId: 'pkg-1', imageIndex: 0 },
      focusedImagePackage: IMAGE_PACKAGE_FIXTURE,
      focusedImageOrdinal: 1,
      runVectorSearch: vi.fn(),
      vectorThreshold: 0.42,
      updateSettings,
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
      setFeatureTagPickerOpen,
      featureTags: ['tag-1'],
      setFeatureTags: vi.fn(),
      featureGradeFilter: null,
      setFeatureGradeFilter: vi.fn(),
      onStartVectorPanelResize: vi.fn(),
      layoutLocked: false,
    })

    expect(props.visible).toBe(true)
    expect(props.showVectorSearch).toBe(true)
    props.onVectorThresholdChange(0.9)
    expect(updateSettings).toHaveBeenCalledWith({ vectorThreshold: 0.9 })

    props.onCollapse()
    props.onExpand()
    expect(setSearchPanelCollapsed).toHaveBeenNthCalledWith(1, true)
    expect(setSearchPanelCollapsed).toHaveBeenNthCalledWith(2, false)

    props.onToggleFeatureTagPicker()
    const pickerUpdater = setFeatureTagPickerOpen.mock.calls[0]?.[0] as
      | ((value: boolean) => boolean)
      | undefined
    expect(pickerUpdater?.(false)).toBe(true)
  })

  it('tag 切换逻辑支持添加与移除，clear 会写空数组', () => {
    const setFeatureTags = vi.fn()

    const props = buildSearchPanelProps({
      mode: 'video',
      vectorMode: true,
      manageMode: false,
      searchPanelCollapsed: true,
      setSearchPanelCollapsed: vi.fn(),
      vectorPanelHeight: 240,
      vectorPanelRef: { current: null },
      vectorPanelContentRef: { current: null },
      searchPanelMode: 'feature',
      setSearchPanelMode: vi.fn(),
      vectorSearchResultsCount: 0,
      featureResultCount: 0,
      focusedRef: null,
      focusedImagePackage: null,
      focusedImageOrdinal: null,
      runVectorSearch: vi.fn(),
      vectorThreshold: 0.5,
      updateSettings: vi.fn(),
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

    expect(props.visible).toBe(true)
    expect(props.showVectorSearch).toBe(false)

    props.onToggleFeatureTag('tag-a')
    const tagUpdater = setFeatureTags.mock.calls[0]?.[0] as ((value: string[]) => string[]) | undefined
    expect(tagUpdater?.([])).toEqual(['tag-a'])
    expect(tagUpdater?.(['tag-a', 'tag-b'])).toEqual(['tag-b'])

    props.onClearFeatureTags()
    expect(setFeatureTags).toHaveBeenNthCalledWith(2, [])
  })
})
