import type { MusicControlIconName } from './MusicControlIcon'
import type { AudioItem, MusicLoopMode } from '../types'

interface MusicToolbarSummaryLabels {
  list: string
  unknownAlbum: string
  unknownAuthor: string
}

export function resolveLoopModeIconName(mode: MusicLoopMode): Extract<
  MusicControlIconName,
  'repeatOne' | 'repeatFolder' | 'repeatAlbum' | 'repeatLibrary'
> {
  if (mode === 'single') {
    return 'repeatOne'
  }
  if (mode === 'folder') {
    return 'repeatFolder'
  }
  if (mode === 'album') {
    return 'repeatAlbum'
  }
  return 'repeatLibrary'
}

export function resolveMusicToolbarSummary(focusedAudio: AudioItem | null, labels: MusicToolbarSummaryLabels): string {
  if (!focusedAudio) {
    return labels.list
  }

  const album = focusedAudio.album.trim()
  const author = focusedAudio.author.trim()
  return [
    album || labels.unknownAlbum,
    author || labels.unknownAuthor,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' / ')
}
