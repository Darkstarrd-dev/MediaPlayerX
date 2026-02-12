import { MediaLibraryDatabase } from '../mediaLibraryDatabase'
import { MediaTokenService } from '../services/file-system-read/mediaTokenService'
import { ImportPathRegistry } from '../services/file-system-read/importPathRegistry'
import { ArchiveNormalizationService } from '../services/file-system-read/archiveNormalizationService'
import { ImportTaskService } from '../services/file-system-read/importTaskService'
import { LibraryReadWriteService } from '../services/file-system-read/libraryReadWriteService'
import { LibrarySnapshotService } from '../services/file-system-read/librarySnapshotService'
import { ManagementMutationService } from '../services/file-system-read/managementMutationService'
import { ManageAdReviewService } from '../services/file-system-read/manageAdReviewService'
import { MediaResourceService } from '../services/file-system-read/mediaResourceService'
import { RuntimeDependencyService } from '../services/file-system-read/runtimeDependencyService'
import { ServiceEventBus } from '../services/file-system-read/serviceEventBus'
import { LibraryChangedEventPayload } from '../services/file-system-read/fileSystemReadFacadeEvents'
import type { ClearDatabaseResponseDto, LibrarySnapshotDto } from '../../src/contracts/backend'

export interface FileSystemFacadeContext {
  rootDir: string
  coverOutputRootDir: string
  thumbnailCacheRootDir: string
  normalizedArchiveRootDir: string
  database: MediaLibraryDatabase
  mediaTokenService: MediaTokenService
  importPathRegistry: ImportPathRegistry
  archiveNormalizationService: ArchiveNormalizationService
  importTaskService: ImportTaskService
  libraryReadWriteService: LibraryReadWriteService
  librarySnapshotService: LibrarySnapshotService
  managementMutationService: ManagementMutationService
  manageAdReviewService: ManageAdReviewService
  mediaResourceService: MediaResourceService
  runtimeDependencyService: RuntimeDependencyService
  eventBus: ServiceEventBus

  ensureStateLoaded: () => Promise<void>
  ensureSnapshotLoaded: () => Promise<LibrarySnapshotDto>
  invalidateCache: () => void
  emitLibraryChanged: (payload: LibraryChangedEventPayload) => void
  markInteractiveRead: () => void
  clearDatabase: () => Promise<ClearDatabaseResponseDto>
}
