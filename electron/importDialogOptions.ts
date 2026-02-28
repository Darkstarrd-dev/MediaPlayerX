import type { OpenDialogOptions } from 'electron'

const AUDIO_FILE_FILTER_EXTENSIONS = ['mp3', 'flac', 'wav', 'ogg', 'm4a', 'opus', 'aac', 'ape', 'wv', 'tta', 'tak', 'shn', 'dsf', 'dff', 'iso', 'cue']
const GENERIC_MEDIA_FILE_FILTER_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'bmp',
  'mp4',
  'webm',
  'mkv',
  'mov',
  ...AUDIO_FILE_FILTER_EXTENSIONS,
  'zip',
  'rar',
  '7z',
]

export function buildImportPathsDialogOptions(mode: 'files' | 'folders', targetMode: 'image' | 'video' | 'music'): OpenDialogOptions {
  const fileExtensions = targetMode === 'music' ? AUDIO_FILE_FILTER_EXTENSIONS : GENERIC_MEDIA_FILE_FILTER_EXTENSIONS

  return {
    title: mode === 'folders' ? '选择要导入的文件夹' : '选择要导入的文件',
    properties:
      mode === 'folders' ? ['openDirectory', 'multiSelections', 'dontAddToRecent'] : ['openFile', 'multiSelections', 'dontAddToRecent'],
    filters:
      mode === 'folders'
        ? undefined
        : [
            {
              name: '媒体文件',
              extensions: fileExtensions,
            },
          ],
  }
}
