import type { FSWatcher } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ExternalSourceWatcherManager } from "./externalSourceWatcherManager";

type WatchCallback = (eventType: string, filename: string | Buffer | null) => void;

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
});
