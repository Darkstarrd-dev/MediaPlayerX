import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ImageItem, ImagePackage } from '../../types'
import { buildMainFooter } from './buildMainFooter'

const sampleImage: ImageItem = {
  id: 'img-1',
  ordinal: 1,
  width: 1920,
  height: 1080,
  sizeKb: 512,
  cluster: 0,
  color: '#000',
  mediaLocator: {
    kind: 'filesystem',
    absolutePath: 'C:/media/a.jpg',
    extension: 'jpg',
    mediaType: 'image',
    mimeType: 'image/jpeg',
  },
}

const samplePackage: ImagePackage = {
  id: 'pkg-1',
  packageName: 'pkg-1.zip',
  displayName: 'pkg-1',
  absolutePath: 'C:/media/pkg-1.zip',
  treePath: ['pkg-1'],
  workTitle: 'work',
  circle: 'circle',
  author: 'author',
  tags: [],
  images: [sampleImage],
}

describe('buildMainFooter', () => {
  it('图片模式分页时在 Footer 右侧渲染翻页控件', () => {
    const node = buildMainFooter({
      mode: 'image',
      focusedImage: sampleImage,
      focusedImagePackage: samplePackage,
      focusedVideo: null,
      sidebarFocusedPath: null,
      nodeBrowseMode: false,
      normalizedPageIndex: 1,
      imageTotalPages: 3,
      onPrevPage: vi.fn(),
      onNextPage: vi.fn(),
    })

    render(<div className="main-footer">{node}</div>)
    expect(document.querySelector('.main-footer-pagination')).toBeInTheDocument()
    const footerMetaSpans = document.querySelectorAll('.main-footer-meta > span')
    expect(footerMetaSpans).toHaveLength(1)
    expect(footerMetaSpans[0]?.textContent ?? '').toBe('C:/media/pkg-1.zip')
    expect(screen.getByRole('button', { name: '上一页' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '下一页' })).toBeInTheDocument()
    expect(screen.getByText('第 2 / 3 页')).toBeInTheDocument()
  })

  it('节点浏览模式不渲染分页控件', () => {
    const node = buildMainFooter({
      mode: 'image',
      focusedImage: sampleImage,
      focusedImagePackage: samplePackage,
      focusedVideo: null,
      sidebarFocusedPath: null,
      nodeBrowseMode: true,
      normalizedPageIndex: 1,
      imageTotalPages: 3,
      onPrevPage: vi.fn(),
      onNextPage: vi.fn(),
    })

    render(<div className="main-footer">{node}</div>)
    expect(document.querySelector('.main-footer-pagination')).toBeNull()
    expect(screen.queryByRole('button', { name: '上一页' })).toBeNull()
    expect(screen.queryByRole('button', { name: '下一页' })).toBeNull()
  })
})
