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
    subtitleOverlayStyle: {},
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
    popoverDebugPinned: false,
    updateSettings: vi.fn(),
    setVideoPlaying: vi.fn(),
    goPlaylist: vi.fn(),
    playlistIds: [],
    videoQueueSource: 'sidebar' as const,
    rootScopedVideoIds: ['video-a', 'video-b'],
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

    expect(params.goPlaylist).toHaveBeenCalledWith(1, params.rootScopedVideoIds, { preserveRate: true })
    expect(params.setVideoTime).not.toHaveBeenCalled()
    expect(params.setVideoPlaying).not.toHaveBeenCalled()
  })

  it('全屏上/下个视频按钮使用作用域视频队列', () => {
    const params = createParams()
    const props = buildFullscreenLayerProps(params)

    props.onPrevVideo()
    props.onNextVideo()

    expect(params.goPlaylist).toHaveBeenNthCalledWith(1, -1, params.rootScopedVideoIds)
    expect(params.goPlaylist).toHaveBeenNthCalledWith(2, 1, params.rootScopedVideoIds)
  })

  it('播放来源是播放列表时，全屏上/下个视频与ended不覆盖为sidebar队列', () => {
    const params = {
      ...createParams(),
      videoQueueSource: 'playlist' as const,
    }
    const props = buildFullscreenLayerProps(params)

    props.onPrevVideo()
    props.onNextVideo()
    props.onVideoEnded()

    expect(params.goPlaylist).toHaveBeenNthCalledWith(1, -1, undefined)
    expect(params.goPlaylist).toHaveBeenNthCalledWith(2, 1, undefined)
    expect(params.goPlaylist).toHaveBeenNthCalledWith(3, 1, undefined, { preserveRate: true })
  })

  it('duration 未就绪时全屏 onVideoTimeUpdate 不回退到 0', () => {
    const params = {
      ...createParams(),
      durationSec: 0,
      setVideoTime: vi.fn(),
    }
    const props = buildFullscreenLayerProps(params)

    props.onVideoTimeUpdate(42.5)

    expect(params.setVideoTime).toHaveBeenCalledWith(42.5)
  })
})
