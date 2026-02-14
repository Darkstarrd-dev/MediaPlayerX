export type MusicPlaybackControlAction = 'toggle-playback' | 'stop'

interface MusicPlaybackStateDetail {
  playing: boolean
}

interface MusicPlaybackControlDetail {
  action: MusicPlaybackControlAction
}

const MUSIC_PLAYBACK_STATE_EVENT = 'mpx:music-playback-state'
const MUSIC_PLAYBACK_CONTROL_EVENT = 'mpx:music-playback-control'

function isWindowAvailable(): boolean {
  return typeof window !== 'undefined'
}

export function emitMusicPlaybackState(detail: MusicPlaybackStateDetail): void {
  if (!isWindowAvailable()) {
    return
  }
  window.dispatchEvent(new CustomEvent<MusicPlaybackStateDetail>(MUSIC_PLAYBACK_STATE_EVENT, { detail }))
}

export function onMusicPlaybackState(listener: (detail: MusicPlaybackStateDetail) => void): () => void {
  if (!isWindowAvailable()) {
    return () => undefined
  }

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<MusicPlaybackStateDetail>).detail
    if (!detail || typeof detail.playing !== 'boolean') {
      return
    }
    listener(detail)
  }

  window.addEventListener(MUSIC_PLAYBACK_STATE_EVENT, handler)
  return () => {
    window.removeEventListener(MUSIC_PLAYBACK_STATE_EVENT, handler)
  }
}

export function dispatchMusicPlaybackControl(action: MusicPlaybackControlAction): void {
  if (!isWindowAvailable()) {
    return
  }
  window.dispatchEvent(new CustomEvent<MusicPlaybackControlDetail>(MUSIC_PLAYBACK_CONTROL_EVENT, { detail: { action } }))
}

export function onMusicPlaybackControl(listener: (action: MusicPlaybackControlAction) => void): () => void {
  if (!isWindowAvailable()) {
    return () => undefined
  }

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<MusicPlaybackControlDetail>).detail
    if (!detail || (detail.action !== 'toggle-playback' && detail.action !== 'stop')) {
      return
    }
    listener(detail.action)
  }

  window.addEventListener(MUSIC_PLAYBACK_CONTROL_EVENT, handler)
  return () => {
    window.removeEventListener(MUSIC_PLAYBACK_CONTROL_EVENT, handler)
  }
}
