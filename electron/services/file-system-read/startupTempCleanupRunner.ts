import path from "node:path";

import { cleanupStartupTempArtifacts } from "./startupTempCleanup";

interface SnapshotLike {
  image_packages: Array<{ absolute_path: string }>;
}

interface ImportSourcesLike {
  files: string[];
}

export async function runStartupTempCleanup({
  thumbnailCacheRootDir,
  normalizedArchiveRootDir,
  snapshot,
  importSources,
  isRar7zPath,
  withArchiveWriteLock,
}: {
  thumbnailCacheRootDir: string;
  normalizedArchiveRootDir: string;
  snapshot: SnapshotLike;
  importSources: ImportSourcesLike;
  isRar7zPath: (filePath: string) => boolean;
  withArchiveWriteLock: <T>(
    archivePath: string,
    task: () => Promise<T>,
  ) => Promise<T>;
}): Promise<void> {
  const knownArchivePaths = Array.from(
    new Set([
      ...snapshot.image_packages.map((item) =>
        path.resolve(item.absolute_path),
      ),
      ...importSources.files
        .map((item) => path.resolve(item))
        .filter(
          (item) =>
            isRar7zPath(item) || path.extname(item).toLowerCase() === ".zip",
        ),
    ]),
  );

  const cleanupResult = await cleanupStartupTempArtifacts({
    thumbnailCacheRootDir,
    normalizedArchiveRootDir,
    knownArchivePaths,
    withArchiveWriteLock,
  });

  if (cleanupResult.removedCount > 0) {
    console.info("startup temp cleanup finished", {
      removedCount: cleanupResult.removedCount,
    });
  }
}
