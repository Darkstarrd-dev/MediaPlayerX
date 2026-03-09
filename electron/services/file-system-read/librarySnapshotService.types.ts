import type { MediaLibraryDatabase } from "../../mediaLibraryDatabase";
import type { PersistedVideoMetadataRecord } from "../../fileSystemMetadataWriters";
import type { RuntimeDependencySnapshot } from "./runtimeDependencyService";
import type { ImportPathRegistry } from "./importPathRegistry";

export interface ArchiveNormalizationResult {
  normalizedArchivePath: string;
  strategy: "zip-repack-webp90-store";
}

export interface NormalizedArchiveCacheRecord {
  sourcePath: string;
  sourceMtimeMs: number;
  sourceSizeBytes: number;
  normalizedArchivePath: string;
  strategy: ArchiveNormalizationResult["strategy"];
}

export interface PersistedVideoCoverRecord {
  coverColor: string;
  coverImagePath: string | null;
  updatedAtMs: number;
}

export interface PersistedAudioMetadataRecord {
  album: string;
  author: string;
  trackTitle: string;
  seriesId: string;
  updatedAtMs: number;
}

export interface LibrarySnapshotServiceOptions {
  rootDir: string;
  normalizedArchiveRootDir: string;
  legacyImportsDirName: string;
  database: MediaLibraryDatabase;
  importPathRegistry: ImportPathRegistry;
  imageExtensions: ReadonlySet<string>;
  videoExtensions: ReadonlySet<string>;
  audioExtensions: ReadonlySet<string>;
  cueExtensions: ReadonlySet<string>;
  archiveExtensions: ReadonlySet<string>;
  colorPalette: readonly string[];
  imageExtensionsForWebpConvert: ReadonlySet<string>;
  directoryScanConcurrency: number;
  archiveScanConcurrency: number;
  ffprobeConcurrency: number;
  ffmpegBin: string;
  ffprobeBin: string;
  zipGeneralPurposeFlagEncrypted: number;
  zipCompressionStore: number;
  zipCompressionDeflate: number;
  ensureRuntimeDependencies: () => Promise<RuntimeDependencySnapshot>;
  queueRar7zNormalization: (
    sourceArchivePath: string,
    priority?: "low" | "high",
  ) => void;
  getPackageGradeOverridesBySourceId: () => Map<string, number | null>;
  getVideoCoverOverridesByVideoId: () => Map<string, PersistedVideoCoverRecord>;
  getVideoMetadataOverridesByVideoId: () => Map<
    string,
    PersistedVideoMetadataRecord
  >;
  getAudioMetadataOverridesByAudioId: () => Map<
    string,
    PersistedAudioMetadataRecord
  >;
  getMusicImportSources: () => { directories: string[]; files: string[] };
  upsertAudioMetadataFromScan: (
    audioId: string,
    payload: {
      album: string;
      author: string;
      trackTitle: string;
      seriesId: string;
    },
  ) => void;
  withArchiveReadLock?: <T>(
    archivePath: string,
    task: () => Promise<T>,
  ) => Promise<T>;
  isInteractiveReadHot?: () => boolean;
}

export interface SnapshotRefreshProgress {
  stage: "collecting" | "building" | "persisting";
  scanned_file_count: number;
  discovered_container_count?: number;
  unit_kind?: "container";
  unit_processed_count?: number;
  unit_total_count?: number;
  message: string;
}

export interface SnapshotRefreshOptions {
  onProgress?: (payload: SnapshotRefreshProgress) => void;
  force?: boolean;
  reason?: string;
}
