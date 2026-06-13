import type { LibrarySnapshotDto } from "../../../src/contracts/backend";
import type { MediaAccessGuardContext } from "../../fileSystemMediaAccessGuard";
import { MediaLibraryDatabase } from "../../mediaLibraryDatabase";

export interface ManagementRenameServiceDependencies {
  database: MediaLibraryDatabase;
  ensureStateLoaded: () => Promise<void>;
  ensureSnapshotLoaded: () => Promise<LibrarySnapshotDto>;
  syncSnapshotFromDatabase: () => LibrarySnapshotDto;
  refreshArchiveIndexesForPaths: (
    archivePaths: Iterable<string>,
  ) => Promise<void>;
  pruneArchiveIndexesByDeletedRoots: (deletedPaths: Iterable<string>) => void;
  replaceImportSourcePaths: (
    mappings: Array<{ fromPath: string; toPath: string }>,
  ) => Promise<void>;
  buildMediaAccessContext: () => MediaAccessGuardContext;
  emitLibraryChanged: (payload: {
    reason: string;
    updated_at_ms: number;
  }) => void;
  movePathWithFallback: (
    sourcePath: string,
    targetPath: string,
    directory: boolean,
  ) => Promise<void>;
  repackArchiveWithRenamedEntries: (
    archivePath: string,
    mappings: Array<{ fromEntryName: string; toEntryName: string }>,
  ) => Promise<void>;
}
