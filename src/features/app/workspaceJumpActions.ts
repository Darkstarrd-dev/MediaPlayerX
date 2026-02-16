import { MUSIC_BOOKLET_AUTO_VALUE, MUSIC_BOOKLET_NONE_VALUE } from './workspaceMusicBooklet'
import type { BrowserMode } from '../../types'

interface CreateWorkspaceJumpActionsParams {
  applyQuickFeatureSearch: (patch: { seriesId?: string }) => void
  updateSettings: (patch: { mode?: BrowserMode; imageRootNodeId?: string | null }) => void
  setMetadataTab: (tab: 'info' | 'playlist') => void
  setSelectedPackageId: (id: string) => void
  setSelectedAudioId: (id: string) => void
  selectVideoFromBrowser: (videoId: string) => void
  jumpTargetVideoId: string | null
  jumpTargetImageId: string | null
  jumpTargetAudioFromImageId: string | null
  jumpTargetAudioFromVideoId: string | null
  jumpTargetImageFromAudioId: string | null
  jumpTargetVideoFromAudioId: string | null
  returnMusicAudioId: string | null
  imageSeriesId: string | null
  videoSeriesId: string | null
  audioSeriesId: string | null
  openMusicCoverSourceId: string | null
  openMusicBookletSourceId: string | null
  musicBookletPreviewRootNodeId: string | null
}

export function createWorkspaceJumpActions(params: CreateWorkspaceJumpActionsParams) {
  const jumpToAnimation = () => {
    if (!params.jumpTargetVideoId || !params.imageSeriesId) {
      return
    }
    params.applyQuickFeatureSearch({ seriesId: params.imageSeriesId })
    params.updateSettings({ mode: 'video' })
    params.selectVideoFromBrowser(params.jumpTargetVideoId)
    params.setMetadataTab('info')
  }

  const jumpToManga = () => {
    if (!params.jumpTargetImageId || !params.videoSeriesId) {
      return
    }
    params.applyQuickFeatureSearch({ seriesId: params.videoSeriesId })
    params.updateSettings({ mode: 'image' })
    params.setSelectedPackageId(params.jumpTargetImageId)
  }

  const jumpImageToMusic = () => {
    if (!params.jumpTargetAudioFromImageId || !params.imageSeriesId) {
      return
    }
    params.applyQuickFeatureSearch({ seriesId: params.imageSeriesId })
    params.updateSettings({ mode: 'music' })
    params.setSelectedAudioId(params.jumpTargetAudioFromImageId)
    params.setMetadataTab('info')
  }

  const jumpImageBookletToMusic = () => {
    if (!params.returnMusicAudioId) {
      return
    }

    params.applyQuickFeatureSearch({})
    params.updateSettings({ mode: 'music' })
    params.setSelectedAudioId(params.returnMusicAudioId)
    params.setMetadataTab('info')
  }

  const jumpVideoToMusic = () => {
    if (!params.jumpTargetAudioFromVideoId || !params.videoSeriesId) {
      return
    }
    params.applyQuickFeatureSearch({ seriesId: params.videoSeriesId })
    params.updateSettings({ mode: 'music' })
    params.setSelectedAudioId(params.jumpTargetAudioFromVideoId)
    params.setMetadataTab('info')
  }

  const jumpMusicToManga = () => {
    if (!params.jumpTargetImageFromAudioId || !params.audioSeriesId) {
      return
    }
    params.applyQuickFeatureSearch({ seriesId: params.audioSeriesId })
    params.updateSettings({ mode: 'image' })
    params.setSelectedPackageId(params.jumpTargetImageFromAudioId)
    params.setMetadataTab('info')
  }

  const jumpMusicToAnimation = () => {
    if (!params.jumpTargetVideoFromAudioId || !params.audioSeriesId) {
      return
    }
    params.applyQuickFeatureSearch({ seriesId: params.audioSeriesId })
    params.updateSettings({ mode: 'video' })
    params.selectVideoFromBrowser(params.jumpTargetVideoFromAudioId)
    params.setMetadataTab('info')
  }

  const jumpMusicToCover = () => {
    if (!params.openMusicCoverSourceId) {
      return
    }

    params.applyQuickFeatureSearch({})
    params.updateSettings({ mode: 'image', imageRootNodeId: params.musicBookletPreviewRootNodeId })
    params.setSelectedPackageId(params.openMusicCoverSourceId)
    params.setMetadataTab('info')
  }

  const jumpMusicToBooklet = () => {
    if (!params.openMusicBookletSourceId) {
      return
    }

    params.applyQuickFeatureSearch({})
    params.updateSettings({ mode: 'image', imageRootNodeId: params.musicBookletPreviewRootNodeId })
    params.setSelectedPackageId(params.openMusicBookletSourceId)
    params.setMetadataTab('info')
  }

  return {
    jumpToAnimation,
    jumpToManga,
    jumpImageToMusic,
    jumpImageBookletToMusic,
    jumpVideoToMusic,
    jumpMusicToManga,
    jumpMusicToAnimation,
    jumpMusicToCover,
    jumpMusicToBooklet,
  }
}

interface BindingRecord {
  coverSourceId?: string | null
  bookletSourceId?: string | null
}

interface CreateMusicBookletBindingActionsParams {
  albumRootPath: string | null
  bindingsByAlbumRoot: Record<string, BindingRecord | undefined>
  resetBindingOverride: (albumRootPath: string) => void
  setBindingOverride: (albumRootPath: string, patch: { coverSourceId?: string | null; bookletSourceId?: string | null }) => void
}

export function createMusicBookletBindingActions(params: CreateMusicBookletBindingActionsParams) {
  const updateMusicCoverBinding = (bindingValue: string) => {
    const albumRootPath = params.albumRootPath
    if (!albumRootPath) {
      return
    }

    if (bindingValue === MUSIC_BOOKLET_AUTO_VALUE) {
      const current = params.bindingsByAlbumRoot[albumRootPath]
      if (!current) {
        return
      }
      if (typeof current.bookletSourceId === 'undefined') {
        params.resetBindingOverride(albumRootPath)
        return
      }
      params.setBindingOverride(albumRootPath, { coverSourceId: undefined })
      return
    }

    if (bindingValue === MUSIC_BOOKLET_NONE_VALUE) {
      params.setBindingOverride(albumRootPath, { coverSourceId: null })
      return
    }

    params.setBindingOverride(albumRootPath, { coverSourceId: bindingValue })
  }

  const updateMusicBookletBinding = (bindingValue: string) => {
    const albumRootPath = params.albumRootPath
    if (!albumRootPath) {
      return
    }

    if (bindingValue === MUSIC_BOOKLET_AUTO_VALUE) {
      const current = params.bindingsByAlbumRoot[albumRootPath]
      if (!current) {
        return
      }
      if (typeof current.coverSourceId === 'undefined') {
        params.resetBindingOverride(albumRootPath)
        return
      }
      params.setBindingOverride(albumRootPath, { bookletSourceId: undefined })
      return
    }

    if (bindingValue === MUSIC_BOOKLET_NONE_VALUE) {
      params.setBindingOverride(albumRootPath, { bookletSourceId: null })
      return
    }

    params.setBindingOverride(albumRootPath, { bookletSourceId: bindingValue })
  }

  return {
    updateMusicCoverBinding,
    updateMusicBookletBinding,
  }
}
