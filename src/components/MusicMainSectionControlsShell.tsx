import type { CSSProperties } from 'react'

import type { TranslateFn } from '../i18n/context'
import { clamp, formatSeconds } from '../utils/ui'
import { FullscreenMetaMarquee } from './fullscreen/FullscreenMetaMarquee'
import { resolveLoopModeIconName } from './musicMainSectionUtils'
import { MusicControlIcon } from './MusicControlIcon'
import type { MusicMainSectionProps, MusicPopoverKey } from './MusicMainSection.types'
import { SkeuoRunway } from './primitives/SkeuoRunway'

interface MusicMainSectionControlsShellProps {
  t: TranslateFn
  fullscreenActive: boolean
  focusedAudio: MusicMainSectionProps['focusedAudio']
  popoverDebugPinned: boolean
  openPopover: MusicPopoverKey | null
  onSetOpenPopover: (value: MusicPopoverKey | null) => void
  onClosePopover: () => void
  controlsMounted: boolean
  controlsVisible: boolean
  showFullscreenControls: () => void
  hideFullscreenControls: () => void
  displayAudioTime: number
  audioDurationSec: number
  audioProgressPercent: number
  onAudioSeekDraftChange: (nextTime: number) => void
  onCommitAudioSeekDraft: () => void
  shaderSelectTooltip: string
  selectedShaderLabel: string
  shaderOptionWidthStyle: CSSProperties
  shaderListTargetLayer: 'foreground' | 'background'
  onSetShaderListTargetLayer: (value: 'foreground' | 'background') => void
  effectiveForegroundLayerEnabled: boolean
  effectiveBackgroundLayerEnabled: boolean
  onToggleShaderLayerEnabled: (layer: 'foreground' | 'background') => void
  shaderListTargetShaderId: string
  musicVisualizerLayeredForegroundShaderId: string
  musicVisualizerLayeredBackgroundShaderId: string
  onMusicVisualizerLayerShaderIdChange: (layer: 'foreground' | 'background', value: string) => void
  renderLongEdgeDraft: string
  onRenderLongEdgeDraftChange: (value: string) => void
  onApplyRenderLongEdgeDraft: () => void
  foregroundRenderScaleCoeffValue: number
  foregroundRenderScaleCoeffStyle: CSSProperties
  onForegroundRenderScaleCoeffDraftChange: (value: number) => void
  onApplyForegroundRenderScaleCoeffDraft: () => void
  backgroundRenderScaleCoeffValue: number
  backgroundRenderScaleCoeffStyle: CSSProperties
  onBackgroundRenderScaleCoeffDraftChange: (value: number) => void
  onApplyBackgroundRenderScaleCoeffDraft: () => void
  musicVisualizerLayeredForegroundOffsetX: number
  musicVisualizerLayeredForegroundOffsetY: number
  musicVisualizerLayeredForegroundScale: number
  musicVisualizerShaderSettings: MusicMainSectionProps['musicVisualizerShaderSettings']
  toneMapExposureRangeStyle: CSSProperties
  toneMapStrengthRangeStyle: CSSProperties
  onMusicVisualizerShaderSettingsChange: MusicMainSectionProps['onMusicVisualizerShaderSettingsChange']
  onToggleFullscreen: () => void
  playTooltip: string
  canPrevAudio: boolean
  onPrevAudio: () => void
  audioPlaying: boolean
  onToggleAudioPlayback: () => void
  onStopAudioPlayback: () => void
  canNextAudio: boolean
  onNextAudio: () => void
  loopModeTooltip: string
  musicLoopModeLabel: string
  musicLoopMode: MusicMainSectionProps['musicLoopMode']
  onCycleMusicLoopMode: () => void
  volumeTooltip: string
  audioMuted: boolean
  onToggleAudioMuted: () => void
  audioVolume: number
  audioVolumePercent: number
  onAudioVolumeChange: (value: number) => void
  onOpenShaderSettingsPanel: () => void
}

export function MusicMainSectionControlsShell({
  t,
  fullscreenActive,
  focusedAudio,
  popoverDebugPinned,
  openPopover,
  onSetOpenPopover,
  onClosePopover,
  controlsMounted,
  controlsVisible,
  showFullscreenControls,
  hideFullscreenControls,
  displayAudioTime,
  audioDurationSec,
  audioProgressPercent,
  onAudioSeekDraftChange,
  onCommitAudioSeekDraft,
  selectedShaderLabel,
  onOpenShaderSettingsPanel,
  onToggleFullscreen,
  playTooltip,
  canPrevAudio,
  onPrevAudio,
  audioPlaying,
  onToggleAudioPlayback,
  onStopAudioPlayback,
  canNextAudio,
  onNextAudio,
  loopModeTooltip,
  musicLoopModeLabel,
  musicLoopMode,
  onCycleMusicLoopMode,
  volumeTooltip,
  audioMuted,
  onToggleAudioMuted,
  audioVolume,
  audioVolumePercent,
  onAudioVolumeChange,
}: MusicMainSectionControlsShellProps) {
  const effectiveFullscreenControlsMounted = popoverDebugPinned || controlsMounted
  const effectiveFullscreenControlsVisible = popoverDebugPinned || controlsVisible
  const focusedAudioDisplayPath = focusedAudio
    ? focusedAudio.mediaLocator.kind === 'filesystem'
      ? focusedAudio.mediaLocator.absolutePath
      : focusedAudio.absolutePath
    : ''

  return (
    <div
      className={`music-controls-shell${fullscreenActive ? ' is-fullscreen-floating fullscreen-controls-shell' : ''}${fullscreenActive && effectiveFullscreenControlsVisible ? ' is-visible' : ''}${fullscreenActive && !effectiveFullscreenControlsMounted ? ' is-hidden' : ''}`}
      data-slot="fg-main-content-music-controls"
      hidden={fullscreenActive ? !effectiveFullscreenControlsMounted : undefined}
      onMouseEnter={fullscreenActive ? showFullscreenControls : undefined}
      onMouseLeave={fullscreenActive ? hideFullscreenControls : onClosePopover}
    >
      {fullscreenActive && focusedAudio ? (
        <div className="fullscreen-meta-row is-single">
          <div className="fullscreen-meta-line">
            <div className="fullscreen-meta-line-segment">
              <FullscreenMetaMarquee text={`${focusedAudioDisplayPath} | ${formatSeconds(Math.max(0, focusedAudio.durationSec))} | ${Number(focusedAudio.sizeMb.toFixed(2))}MB`} />
            </div>
          </div>
        </div>
      ) : null}

      <div className="music-controls-progress" data-slot="fg-main-content-music-controls-progress">
        <span className="video-progress-time">{`${formatSeconds(displayAudioTime)} / ${formatSeconds(audioDurationSec)}`}</span>
        <SkeuoRunway
          ariaLabel={t('a11y.music.progress')}
          preset="progress"
          max={Math.max(0, audioDurationSec)}
          min={0}
          rangePercent={audioProgressPercent}
          step={0.1}
          value={displayAudioTime}
          onChange={(event) => {
            const nextTime = clamp(Number(event.target.value), 0, Math.max(0, audioDurationSec))
            onAudioSeekDraftChange(nextTime)
          }}
          onMouseUp={onCommitAudioSeekDraft}
          onTouchEnd={onCommitAudioSeekDraft}
          onBlur={onCommitAudioSeekDraft}
          onKeyUp={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              onCommitAudioSeekDraft()
            }
          }}
        />
      </div>

      <div className="music-controls-row">
        <div className="music-controls-group is-left mpx-soft-well" data-slot="fg-main-content-music-controls-left">
          <button
            aria-label={t('a11y.music.shaderSelected', { label: selectedShaderLabel })}
            className="video-action-btn"
            data-help-overlay-placement="top"
            data-tooltip-label={t('tip.music.shaderSettings')}
            type="button"
            onClick={onOpenShaderSettingsPanel}
          >
            <MusicControlIcon name="shaderParameter" />
          </button>

          <button
            aria-label={fullscreenActive ? t('a11y.media.exitFullscreen') : t('a11y.media.enterFullscreen')}
            className="video-action-btn"
            data-tooltip-label={t('tip.music.fullscreenToggle')}
            type="button"
            onClick={onToggleFullscreen}
          >
            <MusicControlIcon name={fullscreenActive ? 'fullscreenCompress' : 'fullscreenExpand'} />
          </button>
        </div>

        <div className="music-controls-group is-center" data-slot="fg-main-content-music-controls-center">
          <button aria-label={t('a11y.media.prev')} className="video-action-btn video-action-prev" data-tooltip-label={t('tip.music.prevTrack')} disabled={!canPrevAudio} type="button" onClick={onPrevAudio}>
            <MusicControlIcon name="prev" />
          </button>
          <button
            aria-label={audioPlaying ? t('a11y.media.pause') : t('a11y.media.play')}
            className="video-action-btn video-action-play"
            data-tooltip-label={playTooltip}
            type="button"
            onClick={onToggleAudioPlayback}
          >
            <MusicControlIcon name={audioPlaying ? 'pause' : 'play'} />
          </button>
          <button
            aria-label={t('a11y.media.stop')}
            className="video-action-btn video-action-stop"
            data-tooltip-label={t('tip.music.stopTrack')}
            type="button"
            onClick={onStopAudioPlayback}
          >
            <MusicControlIcon name="stop" />
          </button>
          <button aria-label={t('a11y.media.next')} className="video-action-btn video-action-next" data-tooltip-label={t('tip.music.nextTrack')} disabled={!canNextAudio} type="button" onClick={onNextAudio}>
            <MusicControlIcon name="next" />
          </button>
        </div>

        <div className="music-controls-group is-right mpx-soft-well" data-slot="fg-main-content-music-controls-right">
          <button
            aria-label={t('a11y.music.loopMode', { label: musicLoopModeLabel })}
            className="video-action-btn"
            data-tooltip-label={loopModeTooltip}
            type="button"
            onClick={onCycleMusicLoopMode}
          >
            <MusicControlIcon name={resolveLoopModeIconName(musicLoopMode)} />
          </button>

          <div
            className={`music-ctrl-popover ${popoverDebugPinned || openPopover === 'volume' ? 'is-open' : ''}`}
            onMouseEnter={() => onSetOpenPopover('volume')}
          >
            <button
              aria-controls="music-main-popover-volume"
              aria-expanded={popoverDebugPinned || openPopover === 'volume'}
              aria-pressed={popoverDebugPinned || openPopover === 'volume'}
              aria-haspopup="dialog"
              aria-label={audioMuted ? t('a11y.media.unmute') : t('a11y.media.mute')}
              className="video-action-btn"
              data-help-overlay-placement="top"
              data-tooltip-label={volumeTooltip}
              type="button"
              onClick={onToggleAudioMuted}
            >
              <MusicControlIcon name={audioMuted ? 'volumeMuted' : 'volume'} />
            </button>

            <div
              className="music-ctrl-panel is-volume"
              data-slot="fg-main-content-music-controls-volume-pop"
              hidden={!popoverDebugPinned && openPopover !== 'volume'}
              id="music-main-popover-volume"
              role="dialog"
              onMouseLeave={onClosePopover}
            >
              <div className="mpx-runway-axis is-vertical">
                <SkeuoRunway
                  ariaLabel={t('a11y.media.volumeSlider')}
                  orientation="vertical"
                  preset="control"
                  inputClassName="music-ctrl-volume-range"
                  max={100}
                  min={0}
                  rangePercent={audioVolumePercent}
                  step={1}
                  value={audioMuted ? 0 : audioVolume}
                  onChange={(event) => {
                    onAudioVolumeChange(clamp(Number(event.target.value), 0, 100))
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
