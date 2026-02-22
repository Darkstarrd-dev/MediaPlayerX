import path from "node:path";

import {
  isPathInsideRoot,
  normalizeAllowlistKey,
} from "../../fileSystemServiceHelpers";

interface ImportPathRegistryLike {
  removeImportSourcePaths: (pathsToRemove: string[]) => boolean;
  getImportSources: () => { directories: string[]; files: string[] };
  hydrate: (sources: { directories: string[]; files: string[] }) => void;
}

interface DatabaseLike {
  readMusicImportSources: () => { directories: string[]; files: string[] };
  writeMusicImportSources: (sources: {
    directories: string[];
    files: string[];
  }) => void;
  writeImportSources: (sources: {
    directories: string[];
    files: string[];
  }) => void;
}

function dedupeResolvedPaths(values: string[]): string[] {
  const map = new Map<string, string>();
  for (const value of values) {
    const resolved = path.resolve(value);
    map.set(normalizeAllowlistKey(resolved), resolved);
  }
  return Array.from(map.values());
}

function toNormalizedKey(values: string[]): string {
  return values
    .map((value) => normalizeAllowlistKey(path.resolve(value)))
    .sort((left, right) => left.localeCompare(right, "en-US"))
    .join("|");
}

export async function removeImportSourcePathsWithMusicSync({
  pathsToRemove,
  ensureStateLoaded,
  importPathRegistry,
  database,
}: {
  pathsToRemove: string[];
  ensureStateLoaded: () => Promise<void>;
  importPathRegistry: ImportPathRegistryLike;
  database: DatabaseLike;
}): Promise<void> {
  await ensureStateLoaded();
  const didRemove = importPathRegistry.removeImportSourcePaths(pathsToRemove);

  const removeRoots = pathsToRemove.map((value) => path.resolve(value));
  const shouldRemovePath = (candidatePath: string): boolean => {
    const resolvedCandidatePath = path.resolve(candidatePath);
    return removeRoots.some(
      (rootPath) =>
        normalizeAllowlistKey(rootPath) ===
          normalizeAllowlistKey(resolvedCandidatePath) ||
        isPathInsideRoot(rootPath, resolvedCandidatePath),
    );
  };

  const currentMusicSources = database.readMusicImportSources();
  const nextMusicDirectories = currentMusicSources.directories
    .map((value) => path.resolve(value))
    .filter((value) => !shouldRemovePath(value));
  const nextMusicFiles = currentMusicSources.files
    .map((value) => path.resolve(value))
    .filter((value) => !shouldRemovePath(value));
  const didChangeMusicSources =
    nextMusicDirectories.length !== currentMusicSources.directories.length ||
    nextMusicFiles.length !== currentMusicSources.files.length;

  if (didRemove) {
    const nextSources = importPathRegistry.getImportSources();
    database.writeImportSources({
      directories: nextSources.directories,
      files: nextSources.files,
    });
  }

  if (didChangeMusicSources) {
    database.writeMusicImportSources({
      directories: nextMusicDirectories,
      files: nextMusicFiles,
    });
  }
}

export async function replaceImportSourcePathsWithMusicSync({
  mappings,
  ensureStateLoaded,
  importPathRegistry,
  database,
}: {
  mappings: Array<{ fromPath: string; toPath: string }>;
  ensureStateLoaded: () => Promise<void>;
  importPathRegistry: ImportPathRegistryLike;
  database: DatabaseLike;
}): Promise<void> {
  if (mappings.length === 0) {
    return;
  }

  await ensureStateLoaded();

  const mappingByFromKey = new Map<
    string,
    { fromPath: string; toPath: string; fromKey: string }
  >();
  for (const mapping of mappings) {
    const fromPath = path.resolve(mapping.fromPath);
    const toPath = path.resolve(mapping.toPath);
    const fromKey = normalizeAllowlistKey(fromPath);
    if (fromKey === normalizeAllowlistKey(toPath)) {
      continue;
    }
    mappingByFromKey.set(fromKey, {
      fromPath,
      toPath,
      fromKey,
    });
  }

  const normalizedMappings = Array.from(mappingByFromKey.values()).sort(
    (left, right) => right.fromPath.length - left.fromPath.length,
  );
  if (normalizedMappings.length === 0) {
    return;
  }

  const resolveMappedPath = (candidatePath: string): string => {
    const resolvedCandidate = path.resolve(candidatePath);
    const candidateKey = normalizeAllowlistKey(resolvedCandidate);

    for (const mapping of normalizedMappings) {
      if (mapping.fromKey === candidateKey) {
        return mapping.toPath;
      }
      if (isPathInsideRoot(mapping.fromPath, resolvedCandidate)) {
        const relativePath = path.relative(mapping.fromPath, resolvedCandidate);
        return path.resolve(mapping.toPath, relativePath);
      }
    }

    return resolvedCandidate;
  };

  const currentImportSources = importPathRegistry.getImportSources();
  const nextImportDirectories = dedupeResolvedPaths(
    currentImportSources.directories.map(resolveMappedPath),
  );
  const nextImportFiles = dedupeResolvedPaths(
    currentImportSources.files.map(resolveMappedPath),
  );
  const didChangeImportSources =
    toNormalizedKey(currentImportSources.directories) !==
      toNormalizedKey(nextImportDirectories) ||
    toNormalizedKey(currentImportSources.files) !==
      toNormalizedKey(nextImportFiles);

  if (didChangeImportSources) {
    importPathRegistry.hydrate({
      directories: nextImportDirectories,
      files: nextImportFiles,
    });
    database.writeImportSources({
      directories: nextImportDirectories,
      files: nextImportFiles,
    });
  }

  const currentMusicSources = database.readMusicImportSources();
  const nextMusicDirectories = dedupeResolvedPaths(
    currentMusicSources.directories.map(resolveMappedPath),
  );
  const nextMusicFiles = dedupeResolvedPaths(
    currentMusicSources.files.map(resolveMappedPath),
  );
  const didChangeMusicSources =
    toNormalizedKey(currentMusicSources.directories) !==
      toNormalizedKey(nextMusicDirectories) ||
    toNormalizedKey(currentMusicSources.files) !==
      toNormalizedKey(nextMusicFiles);

  if (didChangeMusicSources) {
    database.writeMusicImportSources({
      directories: nextMusicDirectories,
      files: nextMusicFiles,
    });
  }
}
