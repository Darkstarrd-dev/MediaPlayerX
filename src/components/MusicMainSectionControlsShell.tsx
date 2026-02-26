import type { CSSProperties } from 'react'

import type { TranslateFn } from '../i18n/context'
import { clamp, formatSeconds } from '../utils/ui'
import { MUSIC_VISUALIZER_SHADERS } from '../features/music-visualizer/shaderRegistry'
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
  shaderSelectTooltip,
  selectedShaderLabel,
  shaderOptionWidthStyle,
  shaderListTargetLayer,
  onSetShaderListTargetLayer,
  effectiveForegroundLayerEnabled,
  effectiveBackgroundLayerEnabled,
  onToggleShaderLayerEnabled,
  shaderListTargetShaderId,
  musicVisualizerLayeredForegroundShaderId,
  musicVisualizerLayeredBackgroundShaderId,
  onMusicVisualizerLayerShaderIdChange,
  renderLongEdgeDraft,
  onRenderLongEdgeDraftChange,
  onApplyRenderLongEdgeDraft,
  foregroundRenderScaleCoeffValue,
  foregroundRenderScaleCoeffStyle,
  onForegroundRenderScaleCoeffDraftChange,
  onApplyForegroundRenderScaleCoeffDraft,
  backgroundRenderScaleCoeffValue,
  backgroundRenderScaleCoeffStyle,
  onBackgroundRenderScaleCoeffDraftChange,
  onApplyBackgroundRenderScaleCoeffDraft,
  musicVisualizerLayeredForegroundOffsetX,
  musicVisualizerLayeredForegroundOffsetY,
  musicVisualizerLayeredForegroundScale,
  musicVisualizerShaderSettings,
  toneMapExposureRangeStyle,
  toneMapStrengthRangeStyle,
  onMusicVisualizerShaderSettingsChange,
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
              <FullscreenMetaMarquee text={`${focusedAudio.absolutePath} | ${formatSeconds(Math.max(0, focusedAudio.durationSec))} | ${Number(focusedAudio.sizeMb.toFixed(2))}MB`} />
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
        <div className="music-controls-group is-left mpx-skeuo-well" data-slot="fg-main-content-music-controls-left">
          <div
            className={`music-ctrl-popover ${popoverDebugPinned || openPopover === 'shader' ? 'is-open' : ''}`}
            onMouseEnter={() => onSetOpenPopover('shader')}
            onMouseLeave={onClosePopover}
          >
            <button
              aria-controls="music-main-popover-shader"
              aria-expanded={popoverDebugPinned || openPopover === 'shader'}
              aria-haspopup="dialog"
              aria-label={t('a11y.music.shaderSelected', { label: selectedShaderLabel })}
              className="video-action-btn"
              data-tooltip-label={shaderSelectTooltip}
              type="button"
            >
              <MusicControlIcon name="shaderList" />
            </button>
            <div className="music-ctrl-panel is-shader" data-slot="fg-main-content-music-controls-shader-pop" hidden={!popoverDebugPinned && openPopover !== 'shader'} id="music-main-popover-shader" role="dialog" style={shaderOptionWidthStyle}>
              <div className="music-ctrl-shader-toolbar">
                <div className="music-ctrl-shader-layer-toggle">
                  <button
                    aria-label={t('a11y.music.shaderToggleLayer')}
                    aria-pressed={shaderListTargetLayer === 'foreground'}
                    className={`music-ctrl-shader-toolbar-btn is-layer ${shaderListTargetLayer === 'foreground' ? 'is-on' : 'is-off'}`}
                    data-tooltip-label={t('a11y.music.shaderToggleLayer')}
                    type="button"
                    onClick={() => onSetShaderListTargetLayer('foreground')}
                  >
                    F
                  </button>
                  <button
                    aria-label={t('a11y.music.shaderToggleEnabled')}
                    aria-pressed={effectiveForegroundLayerEnabled}
                    className={`music-ctrl-shader-toolbar-btn is-power ${effectiveForegroundLayerEnabled ? 'is-on' : 'is-off'}`}
                    data-tooltip-label={t('a11y.music.shaderToggleEnabled')}
                    type="button"
                    onClick={() => onToggleShaderLayerEnabled('foreground')}
                  >
                    {effectiveForegroundLayerEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="music-ctrl-shader-layer-toggle">
                  <button
                    aria-label={t('a11y.music.shaderToggleLayer')}
                    aria-pressed={shaderListTargetLayer === 'background'}
                    className={`music-ctrl-shader-toolbar-btn is-layer ${shaderListTargetLayer === 'background' ? 'is-on' : 'is-off'}`}
                    data-tooltip-label={t('a11y.music.shaderToggleLayer')}
                    type="button"
                    onClick={() => onSetShaderListTargetLayer('background')}
                  >
                    B
                  </button>
                  <button
                    aria-label={t('a11y.music.shaderToggleEnabled')}
                    aria-pressed={effectiveBackgroundLayerEnabled}
                    className={`music-ctrl-shader-toolbar-btn is-power ${effectiveBackgroundLayerEnabled ? 'is-on' : 'is-off'}`}
                    data-tooltip-label={t('a11y.music.shaderToggleEnabled')}
                    type="button"
                    onClick={() => onToggleShaderLayerEnabled('background')}
                  >
                    {effectiveBackgroundLayerEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
              <div className="music-ctrl-panel-options">
                {MUSIC_VISUALIZER_SHADERS.length > 0 ? (
                  MUSIC_VISUALIZER_SHADERS.map((shader) => (
                    <button
                      aria-pressed={shaderListTargetShaderId === shader.id}
                      className={`music-ctrl-panel-option ${shaderListTargetShaderId === shader.id ? 'is-active' : ''}${musicVisualizerLayeredForegroundShaderId === shader.id ? ' is-foreground-selected' : ''}${musicVisualizerLayeredBackgroundShaderId === shader.id ? ' is-background-selected' : ''}`}
                      key={shader.id}
                      type="button"
                      onClick={() => {
                        const isSelected = shaderListTargetShaderId === shader.id
                        onMusicVisualizerLayerShaderIdChange(shaderListTargetLayer, isSelected ? '' : shader.id)
                        onClosePopover()
                      }}
                    >
                      <span className="music-ctrl-option-label">{shader.label}</span>
                    </button>
                  ))
                ) : (
                  <span className="music-ctrl-panel-note">{t('ui.music.noShaders')}</span>
                )}
              </div>
            </div>
          </div>

          <div
            className={`music-ctrl-popover is-dock-left ${popoverDebugPinned || openPopover === 'shaderSettings' ? 'is-open' : ''}`}
            onMouseEnter={() => onSetOpenPopover('shaderSettings')}
            onMouseLeave={onClosePopover}
          >
            <button
              aria-controls="music-main-popover-shader-settings"
              aria-expanded={popoverDebugPinned || openPopover === 'shaderSettings'}
              aria-haspopup="dialog"
              aria-label={t('a11y.music.shaderSettings')}
              className="video-action-btn"
              data-help-overlay-placement="top"
              data-tooltip-label={t('tip.music.shaderSettings')}
              type="button"
            >
              <MusicControlIcon name="shaderParameter" />
            </button>
            <div
              className="music-ctrl-panel is-shader is-shader-settings"
              data-slot="fg-main-content-music-controls-shader-settings-pop"
              hidden={!popoverDebugPinned && openPopover !== 'shaderSettings'}
              id="music-main-popover-shader-settings"
              role="dialog"
            >
              <span className="music-ctrl-panel-title">{t('ui.music.shaderSettingsTitle')}</span>
              <div className="music-ctrl-panel-options music-ctrl-shader-settings-form">
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">{t('ui.music.renderLongEdge')}</span>
                  <input
                    className="music-ctrl-shader-input"
                    type="number"
                    value={renderLongEdgeDraft}
                    onChange={(event) => {
                      onRenderLongEdgeDraftChange(event.target.value)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        onApplyRenderLongEdgeDraft()
                      }
                    }}
                  />
                </label>
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">{t('ui.music.foregroundResolutionScale', { value: foregroundRenderScaleCoeffValue.toFixed(2) })}</span>
                  <input
                    className="music-ctrl-shader-range"
                    max={5}
                    min={1}
                    step={0.01}
                    style={foregroundRenderScaleCoeffStyle}
                    type="range"
                    value={foregroundRenderScaleCoeffValue}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      if (!Number.isFinite(value)) {
                        return
                      }
                      onForegroundRenderScaleCoeffDraftChange(Math.max(1, Math.min(5, value)))
                    }}
                    onMouseUp={onApplyForegroundRenderScaleCoeffDraft}
                    onTouchEnd={onApplyForegroundRenderScaleCoeffDraft}
                    onBlur={onApplyForegroundRenderScaleCoeffDraft}
                    onKeyUp={(event) => {
                      if (event.key === 'Enter') {
                        onApplyForegroundRenderScaleCoeffDraft()
                      }
                    }}
                  />
                </label>
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">{t('ui.music.backgroundResolutionScale', { value: backgroundRenderScaleCoeffValue.toFixed(2) })}</span>
                  <input
                    className="music-ctrl-shader-range"
                    max={5}
                    min={1}
                    step={0.01}
                    style={backgroundRenderScaleCoeffStyle}
                    type="range"
                    value={backgroundRenderScaleCoeffValue}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      if (!Number.isFinite(value)) {
                        return
                      }
                      onBackgroundRenderScaleCoeffDraftChange(Math.max(1, Math.min(5, value)))
                    }}
                    onMouseUp={onApplyBackgroundRenderScaleCoeffDraft}
                    onTouchEnd={onApplyBackgroundRenderScaleCoeffDraft}
                    onBlur={onApplyBackgroundRenderScaleCoeffDraft}
                    onKeyUp={(event) => {
                      if (event.key === 'Enter') {
                        onApplyBackgroundRenderScaleCoeffDraft()
                      }
                    }}
                  />
                </label>
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">{t('ui.music.foregroundOffsetX', { value: musicVisualizerLayeredForegroundOffsetX.toFixed(2) })}</span>
                  <input
                    className="music-ctrl-shader-range"
                    max={1}
                    min={-1}
                    step={0.01}
                    type="range"
                    value={musicVisualizerLayeredForegroundOffsetX}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      if (!Number.isFinite(value)) {
                        return
                      }
                      onMusicVisualizerShaderSettingsChange({ layeredForegroundOffsetX: Math.max(-1, Math.min(1, value)) })
                    }}
                  />
                </label>
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">{t('ui.music.foregroundOffsetY', { value: musicVisualizerLayeredForegroundOffsetY.toFixed(2) })}</span>
                  <input
                    className="music-ctrl-shader-range"
                    max={1}
                    min={-1}
                    step={0.01}
                    type="range"
                    value={musicVisualizerLayeredForegroundOffsetY}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      if (!Number.isFinite(value)) {
                        return
                      }
                      onMusicVisualizerShaderSettingsChange({ layeredForegroundOffsetY: Math.max(-1, Math.min(1, value)) })
                    }}
                  />
                </label>
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">{t('ui.music.foregroundScale', { value: musicVisualizerLayeredForegroundScale.toFixed(2) })}</span>
                  <input
                    className="music-ctrl-shader-range"
                    max={3}
                    min={0.25}
                    step={0.01}
                    type="range"
                    value={musicVisualizerLayeredForegroundScale}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      if (!Number.isFinite(value)) {
                        return
                      }
                      onMusicVisualizerShaderSettingsChange({ layeredForegroundScale: Math.max(0.25, Math.min(3, value)) })
                    }}
                  />
                </label>
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">{t('ui.music.fpsCap')}</span>
                  <select
                    className="music-ctrl-shader-input"
                    value={musicVisualizerShaderSettings.fpsCap}
                    onChange={(event) =>
                      onMusicVisualizerShaderSettingsChange({
                        fpsCap: Number(event.target.value) as 30 | 60 | 120,
                      })
                    }
                  >
                    <option value={30}>{t('ui.music.fpsCapOption30')}</option>
                    <option value={60}>{t('ui.music.fpsCapOption60')}</option>
                    <option value={120}>{t('ui.music.fpsCapOption120')}</option>
                  </select>
                </label>
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">{t('ui.music.toneMapping')}</span>
                  <select
                    className="music-ctrl-shader-input"
                    value={musicVisualizerShaderSettings.toneMapMode}
                    onChange={(event) =>
                      onMusicVisualizerShaderSettingsChange({
                        toneMapMode: event.target.value as 'off' | 'reinhard' | 'aces' | 'filmic' | 'agx' | 'khronos',
                      })
                    }
                  >
                    <option value="off">{t('ui.music.disabled')}</option>
                    <option value="aces">{t('ui.music.toneMapModeAces')}</option>
                    <option value="reinhard">{t('ui.music.toneMapModeReinhard')}</option>
                    <option value="filmic">{t('ui.music.toneMapModeFilmic')}</option>
                    <option value="agx">{t('ui.music.toneMapModeAgx')}</option>
                    <option value="khronos">{t('ui.music.toneMapModeKhronos')}</option>
                  </select>
                </label>
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">{t('ui.music.toneMapExposure', { value: musicVisualizerShaderSettings.toneMapExposure.toFixed(2) })}</span>
                  <input
                    className="music-ctrl-shader-range"
                    max={2}
                    min={0.5}
                    step={0.01}
                    style={toneMapExposureRangeStyle}
                    type="range"
                    value={musicVisualizerShaderSettings.toneMapExposure}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      if (!Number.isFinite(value)) {
                        return
                      }
                      onMusicVisualizerShaderSettingsChange({
                        toneMapExposure: Math.max(0.5, Math.min(2, value)),
                      })
                    }}
                  />
                </label>
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">{t('ui.music.toneMapStrength', { value: (musicVisualizerShaderSettings.toneMapStrength * 100).toFixed(0) })}</span>
                  <input
                    className="music-ctrl-shader-range"
                    max={1}
                    min={0}
                    step={0.01}
                    style={toneMapStrengthRangeStyle}
                    type="range"
                    value={musicVisualizerShaderSettings.toneMapStrength}
                    onChange={(event) =>
                      onMusicVisualizerShaderSettingsChange({
                        toneMapStrength: Math.max(0, Math.min(1, Number(event.target.value))),
                      })
                    }
                  />
                </label>
                <label className="music-ctrl-shader-toggle">
                  <span className="music-ctrl-shader-label">{t('ui.music.showFpsDebug')}</span>
                  <input
                    type="checkbox"
                    checked={musicVisualizerShaderSettings.showFps}
                    onChange={(event) => onMusicVisualizerShaderSettingsChange({ showFps: event.target.checked })}
                  />
                </label>
                <label className="music-ctrl-shader-field">
                  <span className="music-ctrl-shader-label">{t('ui.music.renderBackend')}</span>
                  <select
                    className="music-ctrl-shader-input"
                    value={musicVisualizerShaderSettings.renderer}
                    onChange={(event) =>
                      onMusicVisualizerShaderSettingsChange({
                        renderer: event.target.value as 'gpu' | 'cpu',
                      })
                    }
                  >
                    <option value="gpu">{t('ui.music.rendererGpu')}</option>
                    <option value="cpu">{t('ui.music.rendererCpu')}</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

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

        <div className="music-controls-group is-right mpx-skeuo-well" data-slot="fg-main-content-music-controls-right">
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
