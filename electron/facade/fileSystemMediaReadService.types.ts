import type { ReadArchiveLoadStatusResponseDto } from "../../src/contracts/backend";
import type { ArchiveLoadStatusListener, LibraryChangedEventPayload, LibraryChangedListener } from "../services/file-system-read/fileSystemReadFacadeEvents";
import type { TaskResourceGovernor } from "../services/file-system-read/taskResourceGovernor";

export interface FileSystemMediaReadServiceOptions {
  rootDir: string;
  databaseFilePath?: string;
  thumbnailCacheRootDir?: string;
  taskResourceGovernor?: TaskResourceGovernor;
  onLibraryChanged?: LibraryChangedListener;
  onArchiveLoadStatusChanged?: ArchiveLoadStatusListener;
}

export type FileSystemEventMap = {
  libraryChanged: LibraryChangedEventPayload;
  archiveLoadStatusChanged: ReadArchiveLoadStatusResponseDto;
} & Record<string, unknown>;
