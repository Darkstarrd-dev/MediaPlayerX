import { useArchiveLoadStatus } from './useArchiveLoadStatus'
import { useAppSettingsStore } from './useAppSettingsStore'
import { useRepositoryBootstrapData } from './useRepositoryBootstrapData'
import { useAppSessionState } from './useAppSessionState'
import { useImportPipeline } from '../import/useImportPipeline'
import { useMediaState } from '../media/useMediaState'
import { usePlaylistPersistence } from '../media/usePlaylistPersistence'
import { getBenchSettings } from '../perf/benchSettings'

export function useAppRuntimeSources() {
  const benchSettings = getBenchSettings()
  const appSettings = useAppSettingsStore()
  const { mode, sidebarRatio } = appSettings

  const repositoryBootstrap = useRepositoryBootstrapData()
  const { mediaRepository, imageSources, bootstrapVideos } = repositoryBootstrap

  const sessionState = useAppSessionState({
    imageSources,
    mode,
    sidebarRatio,
  })

  const mediaState = useMediaState({
    initialVideoId: bootstrapVideos[0]?.id ?? '',
    initialPlaylistIds: bootstrapVideos.slice(0, 3).map((item) => item.id),
    videos: bootstrapVideos,
  })

  const playlistPersistence = usePlaylistPersistence({
    repository: mediaRepository,
    videos: bootstrapVideos,
    playlistIds: mediaState.playlistIds,
    setPlaylistIds: mediaState.setPlaylistIds,
  })

  const importState = useImportPipeline({ repository: mediaRepository })
  const archiveLoadStatus = useArchiveLoadStatus({ repository: mediaRepository })

  return {
    benchSettings,
    appSettings,
    repositoryBootstrap,
    sessionState,
    mediaState,
    playlistPersistence,
    importState,
    archiveLoadStatus,
  }
}
