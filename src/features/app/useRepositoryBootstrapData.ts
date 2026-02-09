import { useMemo } from 'react'

import {
  IMAGE_DIRECTORY_SOURCES,
  IMAGE_PACKAGES,
  VIDEO_ITEMS,
} from '../../mockData'
import {
  createMediaRepository,
  mapLibrarySnapshotDto,
} from '../backend'

export function useRepositoryBootstrapData() {
  const { repository: mediaRepository, mode: repositoryMode } = useMemo(() => createMediaRepository(), [])
  const bootstrapLibrarySnapshot = useMemo(() => {
    const snapshot = mediaRepository.getInitialLibrarySnapshot()
    return snapshot ? mapLibrarySnapshotDto(snapshot) : null
  }, [mediaRepository])
  const fallbackImagePackages = useMemo(() => (repositoryMode === 'real' ? [] : IMAGE_PACKAGES), [repositoryMode])
  const fallbackImageDirectories = useMemo(
    () => (repositoryMode === 'real' ? [] : IMAGE_DIRECTORY_SOURCES),
    [repositoryMode],
  )
  const fallbackVideos = useMemo(() => (repositoryMode === 'real' ? [] : VIDEO_ITEMS), [repositoryMode])
  const imageSources = useMemo(
    () =>
      bootstrapLibrarySnapshot
        ? [...bootstrapLibrarySnapshot.imagePackages, ...bootstrapLibrarySnapshot.imageDirectories]
        : [...fallbackImagePackages, ...fallbackImageDirectories],
    [bootstrapLibrarySnapshot, fallbackImageDirectories, fallbackImagePackages],
  )
  const bootstrapImagePackages = useMemo(
    () => bootstrapLibrarySnapshot?.imagePackages ?? fallbackImagePackages,
    [bootstrapLibrarySnapshot, fallbackImagePackages],
  )
  const bootstrapImageDirectories = useMemo(
    () => bootstrapLibrarySnapshot?.imageDirectories ?? fallbackImageDirectories,
    [bootstrapLibrarySnapshot, fallbackImageDirectories],
  )
  const bootstrapVideos = useMemo(
    () => bootstrapLibrarySnapshot?.videos ?? fallbackVideos,
    [bootstrapLibrarySnapshot, fallbackVideos],
  )

  return {
    mediaRepository,
    repositoryMode,
    bootstrapLibrarySnapshot,
    imageSources,
    bootstrapImagePackages,
    bootstrapImageDirectories,
    bootstrapVideos,
  }
}
