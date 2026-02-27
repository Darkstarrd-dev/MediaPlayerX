import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { AudioItem, ImageItem, ImagePackage, VideoItem } from '../../types'
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

const sampleAudio: AudioItem = {
  id: 'audio-1',
  fileName: 'audio-1.mp3',
  absolutePath: 'C:/media/audio-1.mp3',
  treePath: ['audio-1.mp3'],
  durationSec: 123,
  sizeMb: 8,
  album: 'album',
  author: 'author',
  trackTitle: 'track',
  mediaLocator: {
    kind: 'filesystem',
    absolutePath: 'C:/media/audio-1.mp3',
    extension: '.mp3',
    mediaType: 'audio',
    mimeType: 'audio/mpeg',
  },
}

const sampleVideo: VideoItem = {
  id: 'video-1',
  fileName: 'video-1.mp4',
  absolutePath: 'C:/media/video-1.mp4',
  treePath: ['video-1.mp4'],
  durationSec: 123,
  width: 1920,
  height: 1080,
  sizeMb: 80,
  coverColor: '#000',
  workTitle: 'video-1',
  circle: 'circle',
  author: 'author',
  tags: [],
  grade: null,
  mediaLocator: {
    kind: 'filesystem',
    absolutePath: 'C:/media/video-1.mp4',
    extension: '.mp4',
    mediaType: 'video',
    mimeType: 'video/mp4',
  },
}

describe('buildMainFooter', () => {
  const t = (key: string) => {
    if (key === 'a11y.common.prevPage' || key === 'tip.common.prevPage') {
      return '上一页'
    }
    if (key === 'a11y.common.nextPage' || key === 'tip.common.nextPage') {
      return '下一页'
    }
    if (key === 'ui.footer.pageSummary') {
      return '第 2 / 3 页'
    }
    return key
  }

  it('图片模式分页时在 Footer 右侧渲染翻页控件', () => {
    const node = buildMainFooter({
      t,
      mode: 'image',
      focusedImage: sampleImage,
      focusedImagePackage: samplePackage,
      focusedVideo: null,
      focusedAudio: null,
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

  it('节点浏览模式且多页时渲染分页控件', () => {
    const onPrevPage = vi.fn()
    const onNextPage = vi.fn()
    const node = buildMainFooter({
      t,
      mode: 'image',
      focusedImage: sampleImage,
      focusedImagePackage: samplePackage,
      focusedVideo: null,
      focusedAudio: null,
      sidebarFocusedPath: null,
      nodeBrowseMode: true,
      normalizedPageIndex: 1,
      imageTotalPages: 3,
      onPrevPage,
      onNextPage,
    })

    render(<div className="main-footer">{node}</div>)
    expect(document.querySelector('.main-footer-pagination')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '上一页' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '下一页' })).toBeInTheDocument()

    screen.getByRole('button', { name: '上一页' }).click()
    screen.getByRole('button', { name: '下一页' }).click()
    expect(onPrevPage).toHaveBeenCalledTimes(1)
    expect(onNextPage).toHaveBeenCalledTimes(1)
  })

  it('节点浏览模式单页时不渲染分页控件', () => {
    const node = buildMainFooter({
      t,
      mode: 'image',
      focusedImage: sampleImage,
      focusedImagePackage: samplePackage,
      focusedVideo: null,
      focusedAudio: null,
      sidebarFocusedPath: null,
      nodeBrowseMode: true,
      normalizedPageIndex: 0,
      imageTotalPages: 1,
      onPrevPage: vi.fn(),
      onNextPage: vi.fn(),
    })

    render(<div className="main-footer">{node}</div>)
    expect(document.querySelector('.main-footer-pagination')).toBeNull()
    expect(screen.queryByRole('button', { name: '上一页' })).toBeNull()
    expect(screen.queryByRole('button', { name: '下一页' })).toBeNull()
  })

  it('音乐模式显示当前音频绝对路径', () => {
    const node = buildMainFooter({
      t,
      mode: 'music',
      focusedImage: null,
      focusedImagePackage: null,
      focusedVideo: null,
      focusedAudio: sampleAudio,
      sidebarFocusedPath: 'fallback-path',
      nodeBrowseMode: false,
      normalizedPageIndex: 0,
      imageTotalPages: 1,
      onPrevPage: vi.fn(),
      onNextPage: vi.fn(),
    })

    render(<div className="main-footer">{node}</div>)
    const footerMetaSpans = document.querySelectorAll('.main-footer-meta > span')
    expect(footerMetaSpans[0]?.textContent ?? '').toBe('C:/media/audio-1.mp3')
    expect(document.querySelector('.main-footer-pagination')).toBeNull()
  })

  it('视频节点浏览模式多页时渲染分页控件', () => {
    const node = buildMainFooter({
      t,
      mode: 'video',
      focusedImage: null,
      focusedImagePackage: null,
      focusedVideo: sampleVideo,
      focusedAudio: null,
      sidebarFocusedPath: null,
      nodeBrowseMode: true,
      normalizedPageIndex: 1,
      imageTotalPages: 3,
      onPrevPage: vi.fn(),
      onNextPage: vi.fn(),
    })

    render(<div className="main-footer">{node}</div>)
    expect(document.querySelector('.main-footer-pagination')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '上一页' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '下一页' })).toBeInTheDocument()
  })
})
