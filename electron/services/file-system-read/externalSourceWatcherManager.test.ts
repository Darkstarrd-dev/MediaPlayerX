import type { FSWatcher } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ExternalSourceWatcherManager } from "./externalSourceWatcherManager";

type WatchCallback = (eventType: string, filename: string | Buffer | null) => void;

const MEDIA_EXTENSIONS = new Set([".jpg", ".png", ".mp4", ".zip", ".mp3"]);

describe("ExternalSourceWatcherManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("忽略自动字幕 sidecar 文件变更，避免触发刷新", () => {
    const registrations: Array<{ callback: WatchCallback; watcher: FSWatcher }> = [];
    const watchImpl: typeof import("node:fs").watch =
      ((...args: unknown[]) => {
        const callback = args[2] as WatchCallback;
        const watcher = {
          close: vi.fn(),
          on: vi.fn().mockReturnThis(),
        } as unknown as FSWatcher;
        registrations.push({ callback, watcher });
        return watcher;
      }) as typeof import("node:fs").watch;

    const onDebouncedChange = vi.fn();
    const manager = new ExternalSourceWatcherManager({
      debounceMs: 600,
      mediaExtensions: MEDIA_EXTENSIONS,
      onDebouncedChange,
      watchImpl,
    });

    manager.refresh({
      importDirectoryRoots: ["Z:/Playground/Media"],
      importFilePaths: [],
    });

    expect(registrations).toHaveLength(1);
    const callback = registrations[0].callback;

    callback("rename", "demo.auto-live.zh-CN.srt");
    vi.advanceTimersByTime(650);
    expect(onDebouncedChange).not.toHaveBeenCalled();

    callback("change", Buffer.from("demo.auto-live.srt.tmp", "utf8"));
    vi.advanceTimersByTime(650);
    expect(onDebouncedChange).not.toHaveBeenCalled();

    callback("change", null);
    vi.advanceTimersByTime(650);
    expect(onDebouncedChange).not.toHaveBeenCalled();

    callback("change", "demo.mp4");
    vi.advanceTimersByTime(650);
    expect(onDebouncedChange).toHaveBeenCalledTimes(1);

    manager.stop();
  });

  it("无法识别具体文件名时仍触发刷新", () => {
    const registrations: Array<{ callback: WatchCallback; watcher: FSWatcher }> = [];
    const watchImpl: typeof import("node:fs").watch =
      ((...args: unknown[]) => {
        const callback = args[2] as WatchCallback;
        const watcher = {
          close: vi.fn(),
          on: vi.fn().mockReturnThis(),
        } as unknown as FSWatcher;
        registrations.push({ callback, watcher });
        return watcher;
      }) as typeof import("node:fs").watch;

    const onDebouncedChange = vi.fn();
    const manager = new ExternalSourceWatcherManager({
      debounceMs: 600,
      mediaExtensions: MEDIA_EXTENSIONS,
      onDebouncedChange,
      watchImpl,
    });

    manager.refresh({
      importDirectoryRoots: ["Z:/Playground/Media"],
      importFilePaths: [],
    });

    expect(registrations).toHaveLength(1);
    registrations[0].callback("change", null);
    vi.advanceTimersByTime(650);

    expect(onDebouncedChange).toHaveBeenCalledTimes(1);
    manager.stop();
  });

  it("非媒体文件事件不会触发刷新", () => {
    const registrations: Array<{ callback: WatchCallback; watcher: FSWatcher }> = [];
    const watchImpl: typeof import("node:fs").watch =
      ((...args: unknown[]) => {
        const callback = args[2] as WatchCallback;
        const watcher = {
          close: vi.fn(),
          on: vi.fn().mockReturnThis(),
        } as unknown as FSWatcher;
        registrations.push({ callback, watcher });
        return watcher;
      }) as typeof import("node:fs").watch;

    const onDebouncedChange = vi.fn();
    const manager = new ExternalSourceWatcherManager({
      debounceMs: 600,
      mediaExtensions: MEDIA_EXTENSIONS,
      onDebouncedChange,
      watchImpl,
    });

    manager.refresh({
      importDirectoryRoots: [],
      importFilePaths: ["Z:/Playground/desktop.ini"],
    });

    expect(registrations).toHaveLength(1);
    registrations[0].callback("change", "Thumbs.db");
    vi.advanceTimersByTime(650);

    expect(onDebouncedChange).not.toHaveBeenCalled();
    manager.stop();
  });

  it("媒体文件事件会触发刷新", () => {
    const registrations: Array<{ callback: WatchCallback; watcher: FSWatcher }> = [];
    const watchImpl: typeof import("node:fs").watch =
      ((...args: unknown[]) => {
        const callback = args[2] as WatchCallback;
        const watcher = {
          close: vi.fn(),
          on: vi.fn().mockReturnThis(),
        } as unknown as FSWatcher;
        registrations.push({ callback, watcher });
        return watcher;
      }) as typeof import("node:fs").watch;

    const onDebouncedChange = vi.fn();
    const manager = new ExternalSourceWatcherManager({
      debounceMs: 600,
      mediaExtensions: MEDIA_EXTENSIONS,
      onDebouncedChange,
      watchImpl,
    });

    manager.refresh({
      importDirectoryRoots: [],
      importFilePaths: ["Z:/Playground/imported.zip"],
    });

    expect(registrations).toHaveLength(1);
    registrations[0].callback("rename", "newvideo.mp4");
    vi.advanceTimersByTime(650);

    expect(onDebouncedChange).toHaveBeenCalledTimes(1);
    manager.stop();
  });

  it("已知导入文件删除或重命名会触发刷新", () => {
    const registrations: Array<{ callback: WatchCallback; watcher: FSWatcher }> = [];
    const watchImpl: typeof import("node:fs").watch =
      ((...args: unknown[]) => {
        const callback = args[2] as WatchCallback;
        const watcher = {
          close: vi.fn(),
          on: vi.fn().mockReturnThis(),
        } as unknown as FSWatcher;
        registrations.push({ callback, watcher });
        return watcher;
      }) as typeof import("node:fs").watch;

    const onDebouncedChange = vi.fn();
    const manager = new ExternalSourceWatcherManager({
      debounceMs: 600,
      mediaExtensions: MEDIA_EXTENSIONS,
      onDebouncedChange,
      watchImpl,
    });

    manager.refresh({
      importDirectoryRoots: [],
      importFilePaths: ["Z:/Playground/Imported.ZIP"],
    });

    expect(registrations).toHaveLength(1);
    registrations[0].callback("rename", "folder/IMPORTED.zip");
    vi.advanceTimersByTime(650);

    expect(onDebouncedChange).toHaveBeenCalledTimes(1);
    manager.stop();
  });

  it("单文件父目录 watcher 遇到未知文件名时不会触发刷新", () => {
    const registrations: Array<{ callback: WatchCallback; watcher: FSWatcher }> = [];
    const watchImpl: typeof import("node:fs").watch =
      ((...args: unknown[]) => {
        const callback = args[2] as WatchCallback;
        const watcher = {
          close: vi.fn(),
          on: vi.fn().mockReturnThis(),
        } as unknown as FSWatcher;
        registrations.push({ callback, watcher });
        return watcher;
      }) as typeof import("node:fs").watch;

    const onDebouncedChange = vi.fn();
    const manager = new ExternalSourceWatcherManager({
      debounceMs: 600,
      mediaExtensions: MEDIA_EXTENSIONS,
      onDebouncedChange,
      watchImpl,
    });

    manager.refresh({
      importDirectoryRoots: [],
      importFilePaths: ["Z:/Playground/imported.zip"],
    });

    expect(registrations).toHaveLength(1);
    registrations[0].callback("change", null);
    vi.advanceTimersByTime(650);

    expect(onDebouncedChange).not.toHaveBeenCalled();
    manager.stop();
  });
});
