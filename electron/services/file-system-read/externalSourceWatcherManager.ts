import { watch, type FSWatcher } from "node:fs";
import path from "node:path";

import { normalizeAllowlistKey } from "../../fileSystemServiceHelpers";

export class ExternalSourceWatcherManager {
  private static readonly AUTO_SUBTITLE_SIDE_CAR_PATTERN =
    /\.auto-live(?:\.[a-z0-9-]+)?\.srt(?:\.tmp)?$/i;
  private static readonly UNKNOWN_EVENT_IGNORE_WINDOW_MS = 1_200;

  private readonly debounceMs: number;
  private readonly onDebouncedChange: () => void;
  private readonly watchImpl: typeof watch;

  private readonly watcherByPathKey = new Map<string, FSWatcher>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastIgnoredSubtitleEventAtMs = 0;

  constructor(options: {
    debounceMs: number;
    onDebouncedChange: () => void;
    watchImpl?: typeof watch;
  }) {
    this.debounceMs = options.debounceMs;
    this.onDebouncedChange = options.onDebouncedChange;
    this.watchImpl = options.watchImpl ?? watch;
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
        const watcher = this.watchImpl(
          watchPath,
          { recursive: recursiveWatchSupported },
          (_eventType, filename) => {
            if (this.shouldIgnoreWatchFilename(filename)) {
              this.lastIgnoredSubtitleEventAtMs = Date.now();
              return;
            }
            if (this.shouldIgnoreUnknownFollowUpEvent(filename)) {
              return;
            }
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

  private shouldIgnoreWatchFilename(
    filename: string | Buffer | null,
  ): boolean {
    if (typeof filename === "string") {
      const normalized = filename.trim();
      if (!normalized) {
        return false;
      }
      return ExternalSourceWatcherManager.AUTO_SUBTITLE_SIDE_CAR_PATTERN.test(
        normalized,
      );
    }

    if (filename instanceof Buffer) {
      const normalized = filename.toString("utf8").trim();
      if (!normalized) {
        return false;
      }
      return ExternalSourceWatcherManager.AUTO_SUBTITLE_SIDE_CAR_PATTERN.test(
        normalized,
      );
    }

    return false;
  }

  private shouldIgnoreUnknownFollowUpEvent(
    filename: string | Buffer | null,
  ): boolean {
    let isUnknown = false;
    if (filename === null) {
      isUnknown = true;
    } else if (typeof filename === "string") {
      isUnknown = filename.trim().length === 0;
    } else if (filename instanceof Buffer) {
      isUnknown = filename.toString("utf8").trim().length === 0;
    }

    if (!isUnknown || this.lastIgnoredSubtitleEventAtMs <= 0) {
      return false;
    }

    return (
      Date.now() - this.lastIgnoredSubtitleEventAtMs <=
      ExternalSourceWatcherManager.UNKNOWN_EVENT_IGNORE_WINDOW_MS
    );
  }
}
