import { describe, expect, it, vi } from 'vitest'

import { buildFullscreenLayerProps } from './buildFullscreenLayerProps'

function createParams() {
  return {
    mode: 'image' as const,
    fullscreenActive: true,
    showFullscreenFooter: true,
    fullscreenDisplay: 'image-only' as const,
    fullscreenEntryDisplay: 'image-only' as const,
    fullscreenAlignRequest: null,
    fullscreenSwapped: false,
    fullscreenVideoFocus: false,
    fullscreenSplit: 0.5,
    focusedImage: null,
    focusedImageSrc: null,
    focusedVideo: null,
    focusedVideoSrc: null,
    subtitleTrackUrl: null,
    subtitleVisible: false,
    subtitleLoading: false,
    subtitleMessage: null,
    subtitleOptions: [],
    selectedSubtitleId: null,
    autoSubtitleActive: false,
    liveSubtitleText: null,
    bindFullscreenVideoElement: vi.fn(),
    focusedVideoCoverImageSrc: null,
    durationSec: 120,
    focusedVideoCoverColor: '#000000',
    videoTime: 0,
    videoPlaying: false,
    videoRate: 1,
    videoVolume: 100,
    videoMuted: false,
    videoFitMode: 'contain' as const,
    videoLoopMode: 'list' as const,
    fullscreenVideoControlsMaxWidth: 960,
    autoPlayEnabled: false,
    autoPlayInterval: 3,
    updateSettings: vi.fn(),
    setVideoPlaying: vi.fn(),
    goPlaylist: vi.fn(),
    playlistIds: [],
    selectedVideoId: '',
    videoById: new Map(),
    selectVideoFromBrowser: vi.fn(),
    setVideoTime: vi.fn(),
    focusedVideoId: null,
    setVideoDurationById: vi.fn(),
    setVideoMuted: vi.fn(),
    setVideoVolume: vi.fn(),
    setVideoRate: vi.fn(),
    setVideoFitMode: vi.fn(),
    cycleVideoLoopMode: vi.fn(),
    cycleVideoFitMode: vi.fn(),
    setSubtitleVisible: vi.fn(),
    selectSubtitleById: vi.fn(async () => undefined),
    saveVideoCover: vi.fn(async () => undefined),
    setFullscreenActiveWithAutoStop: vi.fn(),
    setShowFullscreenFooter: vi.fn(),
    setFullscreenDisplay: vi.fn(),
    setFullscreenSwapped: vi.fn(),
    setFullscreenVideoFocus: vi.fn(),
    setFullscreenSplit: vi.fn(),
    moveImage: vi.fn(),
    goPackage: vi.fn(),
  }
}

describe('buildFullscreenLayerProps', () => {
  it('自动播放间隔调整仅更新 interval，不会强制启用 autoplay', () => {
    const params = createParams()
    const props = buildFullscreenLayerProps(params)

    props.onSetAutoplayInterval(7)

    expect(params.updateSettings).toHaveBeenCalledTimes(1)
    expect(params.updateSettings).toHaveBeenCalledWith({ autoPlayInterval: 7 })
    expect(params.updateSettings).not.toHaveBeenCalledWith(
      expect.objectContaining({ autoPlayEnabled: true }),
    )
  })

  it('自动播放开关按钮仅切换 autoPlayEnabled', () => {
    const params = createParams()
    const props = buildFullscreenLayerProps(params)

    props.onToggleAutoplay()

    expect(params.updateSettings).toHaveBeenCalledWith({ autoPlayEnabled: true })
  })

  it('视频结束时，单视频循环会重置进度并继续播放当前视频', () => {
    const params = {
      ...createParams(),
      videoLoopMode: 'single' as const,
    }
    const props = buildFullscreenLayerProps(params)

    props.onVideoEnded()

    expect(params.setVideoTime).toHaveBeenCalledWith(0)
    expect(params.setVideoPlaying).toHaveBeenCalledWith(true)
    expect(params.goPlaylist).not.toHaveBeenCalled()
  })

  it('视频结束时，文件列表循环会跳转到下一个视频', () => {
    const params = createParams()
    const props = buildFullscreenLayerProps(params)

    props.onVideoEnded()

    expect(params.goPlaylist).toHaveBeenCalledWith(1)
    expect(params.setVideoTime).not.toHaveBeenCalled()
    expect(params.setVideoPlaying).not.toHaveBeenCalled()
  })
})
