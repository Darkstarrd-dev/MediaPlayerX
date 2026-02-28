import path from "node:path";

import type { FileRecord } from "../../fileSystemFileCollector";

export interface ClassifiedSnapshotFiles {
  directoryImageMap: Map<string, FileRecord[]>;
  archives: FileRecord[];
  videos: FileRecord[];
  audios: FileRecord[];
  cues: FileRecord[];
}

export function classifySnapshotFiles(
  files: FileRecord[],
  options: {
    imageExtensions: ReadonlySet<string>;
    archiveExtensions: ReadonlySet<string>;
    videoExtensions: ReadonlySet<string>;
    audioExtensions: ReadonlySet<string>;
    cueExtensions: ReadonlySet<string>;
  },
): ClassifiedSnapshotFiles {
  const directoryImageMap = new Map<string, FileRecord[]>();
  const archives: FileRecord[] = [];
  const videos: FileRecord[] = [];
  const audios: FileRecord[] = [];
  const cues: FileRecord[] = [];

  for (const file of files) {
    if (options.imageExtensions.has(file.extension)) {
      const directoryPath = path.dirname(file.absolutePath);
      const list = directoryImageMap.get(directoryPath) ?? [];
      list.push(file);
      directoryImageMap.set(directoryPath, list);
      continue;
    }

    if (options.archiveExtensions.has(file.extension)) {
      archives.push(file);
      continue;
    }

    if (options.videoExtensions.has(file.extension)) {
      videos.push(file);
      continue;
    }

    if (options.audioExtensions.has(file.extension)) {
      audios.push(file);
      continue;
    }

    if (options.cueExtensions.has(file.extension)) {
      cues.push(file);
    }
  }

  return {
    directoryImageMap,
    archives,
    videos,
    audios,
    cues,
  };
}

export function resolveBookletRootPaths(
  files: FileRecord[],
  musicImportDirectoryRoots: string[],
  options: {
    audioExtensions: ReadonlySet<string>;
    imageExtensions: ReadonlySet<string>;
    isPathInsideRoot: (rootPath: string, targetPath: string) => boolean;
  },
): string[] {
  const musicRootMediaFlags = new Map<
    string,
    { hasAudio: boolean; hasImage: boolean }
  >();
  for (const rootPath of musicImportDirectoryRoots) {
    musicRootMediaFlags.set(rootPath, { hasAudio: false, hasImage: false });
  }

  for (const file of files) {
    for (const rootPath of musicImportDirectoryRoots) {
      if (!options.isPathInsideRoot(rootPath, file.absolutePath)) {
        continue;
      }

      const flags = musicRootMediaFlags.get(rootPath);
      if (!flags) {
        continue;
      }
      if (options.audioExtensions.has(file.extension)) {
        flags.hasAudio = true;
      }
      if (options.imageExtensions.has(file.extension)) {
        flags.hasImage = true;
      }
    }
  }

  return Array.from(musicRootMediaFlags.entries())
    .filter(([, flags]) => flags.hasAudio && flags.hasImage)
    .map(([rootPath]) => rootPath)
    .sort((left, right) => right.length - left.length);
}
