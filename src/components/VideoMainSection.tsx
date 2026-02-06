import type { VideoItem } from '../types'
import { formatSeconds } from '../utils/ui'

interface VideoMainSectionProps {
  focusedVideo: VideoItem | null
  videoTime: number
  videoPlaying: boolean
  onTogglePlay: () => void
  onPrevVideo: () => void
  onNextVideo: () => void
  onSaveCover: () => void
  onEnterFullscreen: () => void
}

function VideoMainSection({
  focusedVideo,
  videoTime,
  videoPlaying,
  onTogglePlay,
  onPrevVideo,
  onNextVideo,
  onSaveCover,
  onEnterFullscreen,
}: VideoMainSectionProps) {
  return (
    <>
      <div className="main-toolbar">
        <strong>{focusedVideo?.fileName ?? '无视频'}</strong>
        <div className="toolbar-actions">
          <button type="button" onClick={onEnterFullscreen}>
            F11 全屏
          </button>
        </div>
      </div>

      <div className="video-preview">
        <div className="video-screen">
          <span>{`虚拟视频时钟 ${formatSeconds(videoTime)} / ${formatSeconds(focusedVideo?.durationSec ?? 0)}`}</span>
        </div>
        <div className="video-controls">
          <button type="button" onClick={onTogglePlay}>
            {videoPlaying ? '暂停' : '播放'}
          </button>
          <button type="button" onClick={onPrevVideo}>
            上一个
          </button>
          <button type="button" onClick={onNextVideo}>
            下一个
          </button>
          <button type="button" onClick={onSaveCover}>
            Save as cover
          </button>
        </div>
      </div>
    </>
  )
}

export default VideoMainSection
