import { MediaLibraryDatabase } from "../mediaLibraryDatabase";
import { MediaTokenService } from "../services/file-system-read/mediaTokenService";
import { ImportPathRegistry } from "../services/file-system-read/importPathRegistry";
import { ArchiveNormalizationService } from "../services/file-system-read/archiveNormalizationService";
import { ImportTaskService } from "../services/file-system-read/importTaskService";
import { LibraryReadWriteService } from "../services/file-system-read/libraryReadWriteService";
import { LibrarySnapshotService } from "../services/file-system-read/librarySnapshotService";
import { ManagementMutationService } from "../services/file-system-read/managementMutationService";
import { ManageAdReviewService } from "../services/file-system-read/manageAdReviewService";
import { ManageCoverReviewService } from "../services/file-system-read/manageCoverReviewService";
import { MediaResourceService } from "../services/file-system-read/mediaResourceService";
import { RuntimeDependencyService } from "../services/file-system-read/runtimeDependencyService";
import { SubtitleModelService } from "../services/file-system-read/subtitleModelService";
import { ServiceEventBus } from "../services/file-system-read/serviceEventBus";
import { LibraryChangedEventPayload } from "../services/file-system-read/fileSystemReadFacadeEvents";
import type {
  ClearDatabaseResponseDto,
  LibrarySnapshotDto,
} from "../../src/contracts/backend";

export interface FileSystemFacadeContext {
  rootDir: string;
  coverOutputRootDir: string;
  thumbnailCacheRootDir: string;
  normalizedArchiveRootDir: string;
  database: MediaLibraryDatabase;
  mediaTokenService: MediaTokenService;
  importPathRegistry: ImportPathRegistry;
  archiveNormalizationService: ArchiveNormalizationService;
  importTaskService: ImportTaskService;
  libraryReadWriteService: LibraryReadWriteService;
  librarySnapshotService: LibrarySnapshotService;
  managementMutationService: ManagementMutationService;
  manageAdReviewService: ManageAdReviewService;
  manageCoverReviewService: ManageCoverReviewService;
  mediaResourceService: MediaResourceService;
  runtimeDependencyService: RuntimeDependencyService;
  subtitleModelService: SubtitleModelService;
  eventBus: ServiceEventBus;

  ensureStateLoaded: () => Promise<void>;
  ensureSnapshotLoaded: () => Promise<LibrarySnapshotDto>;
  invalidateCache: () => void;
  emitLibraryChanged: (payload: LibraryChangedEventPayload) => void;
  markInteractiveRead: () => void;
  clearDatabase: () => Promise<ClearDatabaseResponseDto>;
  requestExternalSourceFolderRefresh: (pathKey: string) => Promise<{
    matched_directory_root: string | null;
    pruned_source_count: number;
    pruned_video_count: number;
    pruned_audio_count: number;
    removed_import_source_count: number;
    updated_at_ms: number;
  }>;
  setExternalSourceWatcherEnabled: (enabled: boolean) => {
    enabled: boolean;
    updated_at_ms: number;
  };
}
