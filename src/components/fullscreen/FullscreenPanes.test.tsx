import { createRef } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FullscreenVideoPane } from './FullscreenPanes'
import { DEFAULT_PANE_TRANSFORM, type MediaGeometry } from './paneMath'

function createVideoGeometry(): MediaGeometry {
  return {
    width: 1280,
    height: 720,
    diffX: 0,
    diffY: 0,
    maxOffsetX: 0,
    maxOffsetY: 0,
  }
}

describe('FullscreenVideoPane', () => {
  it('同一视频播放中收到新源地址时先保持旧 src，仅在异常后切到新 src 并恢复播放位置', () => {
    const onVideoTimeUpdate = vi.fn()
    const onVideoDurationDetected = vi.fn()

    const paneRef = createRef<HTMLElement>()
    const videoRef = createRef<HTMLVideoElement>()

    const { rerender, container } = render(
      <FullscreenVideoPane
        paneRef={paneRef}
        videoRef={videoRef}
        className="fullscreen-pane fullscreen-video"
        flex={1}
        fullscreenDisplay="video-only"
        singlePane="video"
        draggingPane={null}
        videoGeometry={createVideoGeometry()}
        videoTransform={DEFAULT_PANE_TRANSFORM}
        focusedVideoId="video-1"
        videoPlaying
        videoTime={281}
        focusedVideoSrc="mpx://resource/old"
        focusedVideoCoverImageSrc={null}
        focusedVideoCoverColor="#000"
        subtitleTrackUrl={null}
        autoSubtitleActive={false}
        subtitleVisible={false}
        liveSubtitleText={null}
        subtitleOverlayStyle={{}}
        bindVideoElement={() => undefined}
        videoFitMode="contain"
        videoLoopMode="list"
        videoControlsVisible={false}
        videoControlsAtTop={false}
        videoControlsTop={0}
        videoControlsLeft={0}
        videoControlsWidth={640}
        controlsRows={null}
        overlayContent={null}
        onSetVideoFocus={() => undefined}
        onWheel={() => undefined}
        onMouseDown={() => undefined}
        onShowControls={() => undefined}
        onHideControls={() => undefined}
        onVideoTimeUpdate={onVideoTimeUpdate}
        onVideoDurationDetected={onVideoDurationDetected}
        onVideoEnded={() => undefined}
      />,
    )

    const video = container.querySelector('video')
    expect(video).not.toBeNull()
    if (!video) {
      return
    }

    Object.defineProperty(video, 'currentTime', {
      configurable: true,
      writable: true,
      value: 281,
    })
    fireEvent.timeUpdate(video)
    expect(onVideoTimeUpdate).toHaveBeenLastCalledWith(281)
    expect(video.getAttribute('src')).toBe('mpx://resource/old')

    rerender(
      <FullscreenVideoPane
        paneRef={paneRef}
        videoRef={videoRef}
        className="fullscreen-pane fullscreen-video"
        flex={1}
        fullscreenDisplay="video-only"
        singlePane="video"
        draggingPane={null}
        videoGeometry={createVideoGeometry()}
        videoTransform={DEFAULT_PANE_TRANSFORM}
        focusedVideoId="video-1"
        videoPlaying
        videoTime={281}
        focusedVideoSrc="mpx://resource/new"
        focusedVideoCoverImageSrc={null}
        focusedVideoCoverColor="#000"
        subtitleTrackUrl={null}
        autoSubtitleActive={false}
        subtitleVisible={false}
        liveSubtitleText={null}
        subtitleOverlayStyle={{}}
        bindVideoElement={() => undefined}
        videoFitMode="contain"
        videoLoopMode="list"
        videoControlsVisible={false}
        videoControlsAtTop={false}
        videoControlsTop={0}
        videoControlsLeft={0}
        videoControlsWidth={640}
        controlsRows={null}
        overlayContent={null}
        onSetVideoFocus={() => undefined}
        onWheel={() => undefined}
        onMouseDown={() => undefined}
        onShowControls={() => undefined}
        onHideControls={() => undefined}
        onVideoTimeUpdate={onVideoTimeUpdate}
        onVideoDurationDetected={onVideoDurationDetected}
        onVideoEnded={() => undefined}
      />,
    )

    expect(video.getAttribute('src')).toBe('mpx://resource/old')

    video.currentTime = 0
    fireEvent.timeUpdate(video)
    expect(onVideoTimeUpdate).not.toHaveBeenLastCalledWith(0)

    fireEvent.error(video)
    expect(video.getAttribute('src')).toBe('mpx://resource/new')

    Object.defineProperty(video, 'duration', {
      configurable: true,
      writable: true,
      value: 600,
    })
    fireEvent.loadedMetadata(video)

    expect(onVideoDurationDetected).toHaveBeenCalledWith(600)
    expect(video.currentTime).toBe(281)
  })

  it('切换到下一条视频时不会继承上一条视频的恢复锚点', () => {
    const onVideoTimeUpdate = vi.fn()

    const paneRef = createRef<HTMLElement>()
    const videoRef = createRef<HTMLVideoElement>()

    const { rerender, container } = render(
      <FullscreenVideoPane
        paneRef={paneRef}
        videoRef={videoRef}
        className="fullscreen-pane fullscreen-video"
        flex={1}
        fullscreenDisplay="video-only"
        singlePane="video"
        draggingPane={null}
        videoGeometry={createVideoGeometry()}
        videoTransform={DEFAULT_PANE_TRANSFORM}
        focusedVideoId="video-1"
        videoPlaying
        videoTime={281}
        focusedVideoSrc="mpx://resource/video-1"
        focusedVideoCoverImageSrc={null}
        focusedVideoCoverColor="#000"
        subtitleTrackUrl={null}
        autoSubtitleActive={false}
        subtitleVisible={false}
        liveSubtitleText={null}
        subtitleOverlayStyle={{}}
        bindVideoElement={() => undefined}
        videoFitMode="contain"
        videoLoopMode="list"
        videoControlsVisible={false}
        videoControlsAtTop={false}
        videoControlsTop={0}
        videoControlsLeft={0}
        videoControlsWidth={640}
        controlsRows={null}
        overlayContent={null}
        onSetVideoFocus={() => undefined}
        onWheel={() => undefined}
        onMouseDown={() => undefined}
        onShowControls={() => undefined}
        onHideControls={() => undefined}
        onVideoTimeUpdate={onVideoTimeUpdate}
        onVideoDurationDetected={() => undefined}
        onVideoEnded={() => undefined}
      />,
    )

    const video = container.querySelector('video')
    expect(video).not.toBeNull()
    if (!video) {
      return
    }

    Object.defineProperty(video, 'currentTime', {
      configurable: true,
      writable: true,
      value: 281,
    })
    fireEvent.timeUpdate(video)

    rerender(
      <FullscreenVideoPane
        paneRef={paneRef}
        videoRef={videoRef}
        className="fullscreen-pane fullscreen-video"
        flex={1}
        fullscreenDisplay="video-only"
        singlePane="video"
        draggingPane={null}
        videoGeometry={createVideoGeometry()}
        videoTransform={DEFAULT_PANE_TRANSFORM}
        focusedVideoId="video-2"
        videoPlaying
        videoTime={0}
        focusedVideoSrc="mpx://resource/video-2"
        focusedVideoCoverImageSrc={null}
        focusedVideoCoverColor="#000"
        subtitleTrackUrl={null}
        autoSubtitleActive={false}
        subtitleVisible={false}
        liveSubtitleText={null}
        subtitleOverlayStyle={{}}
        bindVideoElement={() => undefined}
        videoFitMode="contain"
        videoLoopMode="list"
        videoControlsVisible={false}
        videoControlsAtTop={false}
        videoControlsTop={0}
        videoControlsLeft={0}
        videoControlsWidth={640}
        controlsRows={null}
        overlayContent={null}
        onSetVideoFocus={() => undefined}
        onWheel={() => undefined}
        onMouseDown={() => undefined}
        onShowControls={() => undefined}
        onHideControls={() => undefined}
        onVideoTimeUpdate={onVideoTimeUpdate}
        onVideoDurationDetected={() => undefined}
        onVideoEnded={() => undefined}
      />,
    )

    expect(video.getAttribute('src')).toBe('mpx://resource/video-2')

    video.currentTime = 0
    Object.defineProperty(video, 'duration', {
      configurable: true,
      writable: true,
      value: 120,
    })
    fireEvent.loadedMetadata(video)

    expect(video.currentTime).toBe(0)
  })

  it('切换到下一条视频时即使新 src 晚一拍到达，也不会继续显示上一条视频', () => {
    const paneRef = createRef<HTMLElement>()
    const videoRef = createRef<HTMLVideoElement>()

    const { rerender, container } = render(
      <FullscreenVideoPane
        paneRef={paneRef}
        videoRef={videoRef}
        className="fullscreen-pane fullscreen-video"
        flex={1}
        fullscreenDisplay="video-only"
        singlePane="video"
        draggingPane={null}
        videoGeometry={createVideoGeometry()}
        videoTransform={DEFAULT_PANE_TRANSFORM}
        focusedVideoId="video-1"
        videoPlaying
        videoTime={12}
        focusedVideoSrc="mpx://resource/video-1"
        focusedVideoCoverImageSrc={null}
        focusedVideoCoverColor="#000"
        subtitleTrackUrl={null}
        autoSubtitleActive={false}
        subtitleVisible={false}
        liveSubtitleText={null}
        subtitleOverlayStyle={{}}
        bindVideoElement={() => undefined}
        videoFitMode="contain"
        videoLoopMode="list"
        videoControlsVisible={false}
        videoControlsAtTop={false}
        videoControlsTop={0}
        videoControlsLeft={0}
        videoControlsWidth={640}
        controlsRows={null}
        overlayContent={null}
        onSetVideoFocus={() => undefined}
        onWheel={() => undefined}
        onMouseDown={() => undefined}
        onShowControls={() => undefined}
        onHideControls={() => undefined}
        onVideoTimeUpdate={() => undefined}
        onVideoDurationDetected={() => undefined}
        onVideoEnded={() => undefined}
      />,
    )

    const firstVideo = container.querySelector('video')
    expect(firstVideo?.getAttribute('src')).toBe('mpx://resource/video-1')

    rerender(
      <FullscreenVideoPane
        paneRef={paneRef}
        videoRef={videoRef}
        className="fullscreen-pane fullscreen-video"
        flex={1}
        fullscreenDisplay="video-only"
        singlePane="video"
        draggingPane={null}
        videoGeometry={createVideoGeometry()}
        videoTransform={DEFAULT_PANE_TRANSFORM}
        focusedVideoId="video-2"
        videoPlaying
        videoTime={0}
        focusedVideoSrc={null}
        focusedVideoCoverImageSrc={null}
        focusedVideoCoverColor="#000"
        subtitleTrackUrl={null}
        autoSubtitleActive={false}
        subtitleVisible={false}
        liveSubtitleText={null}
        subtitleOverlayStyle={{}}
        bindVideoElement={() => undefined}
        videoFitMode="contain"
        videoLoopMode="list"
        videoControlsVisible={false}
        videoControlsAtTop={false}
        videoControlsTop={0}
        videoControlsLeft={0}
        videoControlsWidth={640}
        controlsRows={null}
        overlayContent={null}
        onSetVideoFocus={() => undefined}
        onWheel={() => undefined}
        onMouseDown={() => undefined}
        onShowControls={() => undefined}
        onHideControls={() => undefined}
        onVideoTimeUpdate={() => undefined}
        onVideoDurationDetected={() => undefined}
        onVideoEnded={() => undefined}
      />,
    )

    expect(container.querySelector('video')).toBeNull()

    rerender(
      <FullscreenVideoPane
        paneRef={paneRef}
        videoRef={videoRef}
        className="fullscreen-pane fullscreen-video"
        flex={1}
        fullscreenDisplay="video-only"
        singlePane="video"
        draggingPane={null}
        videoGeometry={createVideoGeometry()}
        videoTransform={DEFAULT_PANE_TRANSFORM}
        focusedVideoId="video-2"
        videoPlaying
        videoTime={0}
        focusedVideoSrc="mpx://resource/video-2"
        focusedVideoCoverImageSrc={null}
        focusedVideoCoverColor="#000"
        subtitleTrackUrl={null}
        autoSubtitleActive={false}
        subtitleVisible={false}
        liveSubtitleText={null}
        subtitleOverlayStyle={{}}
        bindVideoElement={() => undefined}
        videoFitMode="contain"
        videoLoopMode="list"
        videoControlsVisible={false}
        videoControlsAtTop={false}
        videoControlsTop={0}
        videoControlsLeft={0}
        videoControlsWidth={640}
        controlsRows={null}
        overlayContent={null}
        onSetVideoFocus={() => undefined}
        onWheel={() => undefined}
        onMouseDown={() => undefined}
        onShowControls={() => undefined}
        onHideControls={() => undefined}
        onVideoTimeUpdate={() => undefined}
        onVideoDurationDetected={() => undefined}
        onVideoEnded={() => undefined}
      />,
    )

    expect(container.querySelector('video')?.getAttribute('src')).toBe(
      'mpx://resource/video-2',
    )
  })
})
