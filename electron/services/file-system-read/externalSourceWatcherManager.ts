import { watch, type FSWatcher } from "node:fs";
import path from "node:path";

import { normalizeAllowlistKey } from "../../fileSystemServiceHelpers";

export class ExternalSourceWatcherManager {
  private readonly debounceMs: number;
  private readonly onDebouncedChange: () => void;

  private readonly watcherByPathKey = new Map<string, FSWatcher>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: { debounceMs: number; onDebouncedChange: () => void }) {
    this.debounceMs = options.debounceMs;
    this.onDebouncedChange = options.onDebouncedChange;
  }

  refresh(options: {
    importDirectoryRoots: Iterable<string>;
    importFilePaths: Iterable<string>;
  }): void {
    const desiredWatchPathByKey = new Map<string, string>();
    for (const rootPath of options.importDirectoryRoots) {
      const resolvedPath = path.resolve(rootPath);
      desiredWatchPathByKey.set(
        normalizeAllowlistKey(resolvedPath),
        resolvedPath,
      );
    }
    for (const filePath of options.importFilePaths) {
      const parentPath = path.dirname(path.resolve(filePath));
      desiredWatchPathByKey.set(normalizeAllowlistKey(parentPath), parentPath);
    }

    for (const [pathKey, watcher] of this.watcherByPathKey) {
      if (desiredWatchPathByKey.has(pathKey)) {
        continue;
      }
      watcher.close();
      this.watcherByPathKey.delete(pathKey);
    }

    const recursiveWatchSupported =
      process.platform === "win32" || process.platform === "darwin";
    for (const [pathKey, watchPath] of desiredWatchPathByKey) {
      if (this.watcherByPathKey.has(pathKey)) {
        continue;
      }
      try {
        const watcher = watch(
          watchPath,
          { recursive: recursiveWatchSupported },
          () => {
            this.scheduleDebouncedRefresh();
          },
        );
        watcher.on("error", () => {
          const existingWatcher = this.watcherByPathKey.get(pathKey);
          if (existingWatcher === watcher) {
            this.watcherByPathKey.delete(pathKey);
          }
          watcher.close();
          this.scheduleDebouncedRefresh();
        });
        this.watcherByPathKey.set(pathKey, watcher);
      } catch {
        continue;
      }
    }
  }

  stop(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    for (const watcher of this.watcherByPathKey.values()) {
      watcher.close();
    }
    this.watcherByPathKey.clear();
  }

  private scheduleDebouncedRefresh(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.onDebouncedChange();
    }, this.debounceMs);
  }
}
