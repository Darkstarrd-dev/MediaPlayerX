import type { MusicControlIconName } from './MusicControlIcon'
import type { AudioItem, MusicLoopMode } from '../types'

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

export function resolveMusicToolbarSummary(focusedAudio: AudioItem | null): string {
  if (!focusedAudio) {
    return '音乐列表'
  }

  const album = focusedAudio.album.trim()
  const author = focusedAudio.author.trim()
  return [
    album || '未知专辑',
    author || '未知作者',
  ]
    .filter((value): value is string => Boolean(value))
    .join(' / ')
}
