import { watch, type FSWatcher } from "node:fs";
import path from "node:path";

import { normalizeAllowlistKey } from "../../fileSystemServiceHelpers";

interface WatchedPathState {
  watchPath: string;
  hasImportedDirectory: boolean;
  importedFileBaseNames: Set<string>;
}

export class ExternalSourceWatcherManager {
  private static readonly AUTO_SUBTITLE_SIDE_CAR_PATTERN =
    /\.auto-live(?:\.[a-z0-9-]+)?\.srt(?:\.tmp)?$/i;
  private static readonly UNKNOWN_EVENT_IGNORE_WINDOW_MS = 1_200;

  private readonly debounceMs: number;
  private readonly mediaExtensions: Set<string>;
  private readonly onDebouncedChange: () => void;
  private readonly watchImpl: typeof watch;

  private readonly watcherByPathKey = new Map<string, FSWatcher>();
  private readonly watchedPathStateByKey = new Map<string, WatchedPathState>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastIgnoredSubtitleEventAtMs = 0;
  private suppressionCount = 0;
  private suppressionTailUntilMs = 0;

  constructor(options: {
    debounceMs: number;
    mediaExtensions?: Iterable<string>;
    onDebouncedChange: () => void;
    watchImpl?: typeof watch;
  }) {
    this.debounceMs = options.debounceMs;
    this.mediaExtensions = new Set(
      Array.from(options.mediaExtensions ?? []).map((value) =>
        value.toLowerCase(),
      ),
    );
    this.onDebouncedChange = options.onDebouncedChange;
    this.watchImpl = options.watchImpl ?? watch;
  }

  refresh(options: {
    importDirectoryRoots: Iterable<string>;
    importFilePaths: Iterable<string>;
  }): void {
    const desiredWatchStateByKey = new Map<string, WatchedPathState>();

    const ensureWatchedPathState = (watchPath: string): WatchedPathState => {
      const pathKey = normalizeAllowlistKey(watchPath);
      const existing = desiredWatchStateByKey.get(pathKey);
      if (existing) {
        return existing;
      }
      const created: WatchedPathState = {
        watchPath,
        hasImportedDirectory: false,
        importedFileBaseNames: new Set<string>(),
      };
      desiredWatchStateByKey.set(pathKey, created);
      return created;
    };

    for (const rootPath of options.importDirectoryRoots) {
      const resolvedPath = path.resolve(rootPath);
      ensureWatchedPathState(resolvedPath).hasImportedDirectory = true;
    }
    for (const filePath of options.importFilePaths) {
      const resolvedFilePath = path.resolve(filePath);
      const parentPath = path.dirname(resolvedFilePath);
      const watchedPathState = ensureWatchedPathState(parentPath);
      watchedPathState.importedFileBaseNames.add(
        path.basename(resolvedFilePath).toLowerCase(),
      );
    }

    for (const [pathKey, watcher] of this.watcherByPathKey) {
      if (desiredWatchStateByKey.has(pathKey)) {
        continue;
      }
      watcher.close();
      this.watcherByPathKey.delete(pathKey);
      this.watchedPathStateByKey.delete(pathKey);
    }

    const recursiveWatchSupported =
      process.platform === "win32" || process.platform === "darwin";
    for (const [pathKey, watchedPathState] of desiredWatchStateByKey) {
      this.watchedPathStateByKey.set(pathKey, watchedPathState);
      if (this.watcherByPathKey.has(pathKey)) {
        continue;
      }
      try {
        const watcher = this.watchImpl(
          watchedPathState.watchPath,
          { recursive: recursiveWatchSupported },
          (_eventType, filename) => {
            if (this.shouldIgnoreWatchFilename(filename)) {
              this.lastIgnoredSubtitleEventAtMs = Date.now();
              return;
            }
            if (this.shouldIgnoreUnknownFollowUpEvent(filename)) {
              return;
            }
            const currentPathState = this.watchedPathStateByKey.get(pathKey);
            if (
              !currentPathState ||
              !this.shouldRefreshForWatchFilename(filename, currentPathState)
            ) {
              return;
            }
            this.scheduleDebouncedRefresh();
          },
        );
        watcher.on("error", () => {
          const existingWatcher = this.watcherByPathKey.get(pathKey);
          if (existingWatcher === watcher) {
            this.watcherByPathKey.delete(pathKey);
            this.watchedPathStateByKey.delete(pathKey);
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
    this.watchedPathStateByKey.clear();
  }

  /**
   * 进入事件抑制：应用自身的文件变更（删除/移动等管理操作）会触发 fs.watch 事件，
   * 抑制期间事件直接丢弃，并清掉已排队的 debounce，避免自我事件引发全量重扫。
   */
  beginEventSuppression(): void {
    this.suppressionCount += 1;
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * 退出事件抑制，并保留 tailMs 尾窗覆盖操作完成后迟到的 fs 事件。
   */
  endEventSuppression(tailMs: number): void {
    this.suppressionCount = Math.max(0, this.suppressionCount - 1);
    this.suppressionTailUntilMs = Math.max(
      this.suppressionTailUntilMs,
      Date.now() + Math.max(0, tailMs),
    );
  }

  private isEventSuppressed(): boolean {
    if (this.suppressionCount > 0) {
      return true;
    }
    return Date.now() < this.suppressionTailUntilMs;
  }

  private scheduleDebouncedRefresh(): void {
    if (this.isEventSuppressed()) {
      return;
    }
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.onDebouncedChange();
    }, this.debounceMs);
  }

  private shouldIgnoreWatchFilename(filename: string | Buffer | null): boolean {
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

  private shouldRefreshForWatchFilename(
    filename: string | Buffer | null,
    watchedPathState: WatchedPathState,
  ): boolean {
    if (filename === null) {
      return watchedPathState.hasImportedDirectory;
    }

    const normalized =
      typeof filename === "string"
        ? filename.trim()
        : filename.toString("utf8").trim();
    if (!normalized) {
      return watchedPathState.hasImportedDirectory;
    }

    const normalizedBaseName = path.basename(normalized).toLowerCase();
    if (watchedPathState.importedFileBaseNames.has(normalizedBaseName)) {
      return true;
    }

    if (!watchedPathState.hasImportedDirectory) {
      return false;
    }

    const extension = path.extname(normalized).toLowerCase();
    if (extension && this.mediaExtensions.has(extension)) {
      return true;
    }

    // 目录导入场景：非空 filename 无媒体扩展名时（目录增/删/改名等），
    // 仍应触发刷新，避免目录级文件系统变更被静默忽略。
    return watchedPathState.hasImportedDirectory;
  }
}
