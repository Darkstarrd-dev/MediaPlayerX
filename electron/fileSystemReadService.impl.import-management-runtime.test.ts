import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { createRequire } from "node:module";

import { afterEach, describe, expect, it } from "vitest";

import { DATABASE_RELATIVE_PATH } from "./mediaLibrarySchema";
import { FileSystemMediaReadService } from "./fileSystemReadService";
import {
  enqueueImportAndWait,
  waitForImportTaskDone,
  writeBinary,
  writeTinyPng,
} from "./fileSystemReadService.test.helpers";

const require = createRequire(process.execPath);
const { DatabaseSync } = require("node:sqlite") as {
  DatabaseSync: new (path: string) => {
    prepare: (sql: string) => {
      all: (...params: unknown[]) => unknown;
      get: (...params: unknown[]) => unknown;
    };
    close: () => void;
  };
};

describe("FileSystemMediaReadService", () => {
  const ioHeavyTestTimeoutMs = 30_000;
  const createdRoots: string[] = [];
  const createdServices: FileSystemMediaReadService[] = [];

  afterEach(async () => {
    for (const service of createdServices) {
      service.dispose();
    }
    createdServices.length = 0;

    await Promise.all(
      createdRoots.map(async (root) => {
        await fs.rm(root, { recursive: true, force: true });
      }),
    );
    createdRoots.length = 0;
  });

  it(
    "音乐导入仅支持音频文件，非音频任务会失败",
    async () => {
      const root = await fs.mkdtemp(
        path.join(os.tmpdir(), "mpx-import-music-reject-"),
      );
      const outsideRoot = await fs.mkdtemp(
        path.join(os.tmpdir(), "mpx-import-music-reject-source-"),
      );
      createdRoots.push(root);
      createdRoots.push(outsideRoot);

      const outsideImagePath = path.join(outsideRoot, "incoming", "cover.jpg");
      await writeBinary(outsideImagePath, [0xff, 0xd8, 0xff, 0xd9]);

      const service = new FileSystemMediaReadService(root);
      createdServices.push(service);

      const queued = await service.enqueueImportTask({
        source: "dialog-files-music",
        paths: [outsideImagePath],
      });
      const done = await waitForImportTaskDone(service, queued.task.task_id);
      expect(done.status).toBe("failed");

      const tasks = await service.readImportTasks();
      const finalTask = tasks.tasks.find(
        (task) => task.task_id === queued.task.task_id,
      );
      expect(finalTask).toBeTruthy();
      expect(finalTask?.error_detail).toContain(
        "音乐导入仅支持音频或 CUE 文件",
      );

      const snapshot = await service.readLibrarySnapshot();
      expect(snapshot.audios ?? []).toHaveLength(0);
    },
    ioHeavyTestTimeoutMs,
  );

  it(
    "音乐文件导入会写入 music_import_sources，并将孤立文件按专辑或 unknown artist 分组",
    async () => {
      const root = await fs.mkdtemp(
        path.join(os.tmpdir(), "mpx-import-music-file-"),
      );
      const outsideRoot = await fs.mkdtemp(
        path.join(os.tmpdir(), "mpx-import-music-file-source-"),
      );
      createdRoots.push(root);
      createdRoots.push(outsideRoot);

      const outsideAudioPath = path.join(
        outsideRoot,
        "incoming",
        "single-track.mp3",
      );
      await writeBinary(outsideAudioPath, [0x49, 0x44, 0x33, 0x03, 0x00, 0x00]);

      const service = new FileSystemMediaReadService(root);
      createdServices.push(service);

      await enqueueImportAndWait(service, "dialog-files-music", [
        outsideAudioPath,
      ]);

      const snapshot = await service.readLibrarySnapshot();
      const importedAudio = snapshot.audios?.find(
        (item) =>
          path.resolve(item.absolute_path) === path.resolve(outsideAudioPath),
      );
      expect(importedAudio).toBeTruthy();
      if (!importedAudio) {
        throw new Error("imported audio not found");
      }
      expect(importedAudio.tree_path).toEqual([
        "unknown artist",
        path.basename(outsideAudioPath),
      ]);

      const storedMusicSources = await service.readAppState({
        state_key: "music_import_sources_v1",
        fallback_json: JSON.stringify({ directories: [], files: [] }),
      });
      const parsedMusicSources = JSON.parse(storedMusicSources.state_json) as {
        directories?: string[];
        files?: string[];
      };
      const containsImportedAudio = (parsedMusicSources.files ?? []).some(
        (item) => path.resolve(item) === path.resolve(outsideAudioPath),
      );
      expect(containsImportedAudio).toBe(true);

      await service.writeAudioMetadata({
        audio_id: importedAudio.id,
        album: "Album Group A",
      });
      service.invalidateCache();

      const refreshedSnapshot = await service.readLibrarySnapshot();
      const refreshedAudio = refreshedSnapshot.audios?.find(
        (item) => item.id === importedAudio.id,
      );
      expect(refreshedAudio).toBeTruthy();
      expect(refreshedAudio?.tree_path).toEqual([
        "Album Group A",
        path.basename(outsideAudioPath),
      ]);
    },
    ioHeavyTestTimeoutMs,
  );

  it(
    "音乐文件夹含音频与图片时，图片目录统一归入 CD Booklet 树根",
    async () => {
      const root = await fs.mkdtemp(
        path.join(os.tmpdir(), "mpx-import-music-booklet-"),
      );
      createdRoots.push(root);

      const albumRoot = path.join(root, "albums", "sample-album");
      const trackPath = path.join(albumRoot, "track-01.mp3");
      const coverPath = path.join(albumRoot, "cover.png");
      const bookletPath = path.join(albumRoot, "booklet", "page-01.png");
      await writeBinary(trackPath, [0x49, 0x44, 0x33, 0x03, 0x00, 0x00]);
      await writeTinyPng(coverPath);
      await writeTinyPng(bookletPath);

      const service = new FileSystemMediaReadService(root);
      createdServices.push(service);

      await enqueueImportAndWait(service, "dialog-folders-music", [albumRoot]);
      const snapshot = await service.readLibrarySnapshot();

      const imageSourcesInAlbumRoot = snapshot.image_directories.filter(
        (source) =>
          path
            .resolve(source.absolute_path)
            .startsWith(path.resolve(albumRoot)),
      );
      expect(imageSourcesInAlbumRoot.length).toBeGreaterThan(0);
      expect(
        imageSourcesInAlbumRoot.every(
          (source) => source.tree_path[0] === "CD Booklet",
        ),
      ).toBe(true);

      const importedAudio = snapshot.audios?.find(
        (audio) =>
          path.resolve(audio.absolute_path) === path.resolve(trackPath),
      );
      expect(importedAudio).toBeTruthy();
    },
    ioHeavyTestTimeoutMs,
  );

  it(
    "磁盘文件缺失触发自动清理时会同步移除 music_import_sources",
    async () => {
      const root = await fs.mkdtemp(
        path.join(os.tmpdir(), "mpx-import-music-prune-"),
      );
      const outsideRoot = await fs.mkdtemp(
        path.join(os.tmpdir(), "mpx-import-music-prune-source-"),
      );
      createdRoots.push(root);
      createdRoots.push(outsideRoot);

      const outsideAudioPath = path.join(
        outsideRoot,
        "incoming",
        "to-prune.mp3",
      );
      await writeBinary(outsideAudioPath, [0x49, 0x44, 0x33, 0x03, 0x00, 0x00]);

      const service = new FileSystemMediaReadService(root);
      createdServices.push(service);
      await enqueueImportAndWait(service, "dialog-files-music", [
        outsideAudioPath,
      ]);

      await fs.rm(outsideAudioPath, { force: true });
      const snapshotAfterPrune = await service.readLibrarySnapshot();
      const stillHasAudio = (snapshotAfterPrune.audios ?? []).some(
        (item) =>
          path.resolve(item.absolute_path) === path.resolve(outsideAudioPath),
      );
      expect(stillHasAudio).toBe(false);

      const storedMusicSources = await service.readAppState({
        state_key: "music_import_sources_v1",
        fallback_json: JSON.stringify({ directories: [], files: [] }),
      });
      const parsedMusicSources = JSON.parse(storedMusicSources.state_json) as {
        directories?: string[];
        files?: string[];
      };
      const stillHasSourcePath = (parsedMusicSources.files ?? []).some(
        (item) => path.resolve(item) === path.resolve(outsideAudioPath),
      );
      expect(stillHasSourcePath).toBe(false);
    },
    ioHeavyTestTimeoutMs,
  );

  it("写入偏好指标 app_state 后会更新快照并广播变更", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-preference-metrics-write-"),
    );
    createdRoots.push(root);

    const imagePath = path.join(root, "gallery", "a.jpg");
    const videoPath = path.join(root, "video", "clip.mp4");
    await writeBinary(imagePath, [0xff, 0xd8, 0xff, 0xd9]);
    await writeBinary(videoPath, [0x00, 0x00, 0x00, 0x18]);

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-folders", [root]);

    const before = await service.readLibrarySnapshot();
    const source = before.image_directories.find(
      (item) =>
        path.resolve(item.absolute_path) ===
        path.resolve(path.dirname(imagePath)),
    );
    const video = before.videos.find(
      (item) => path.resolve(item.absolute_path) === path.resolve(videoPath),
    );
    expect(source).toBeTruthy();
    expect(video).toBeTruthy();
    if (!source || !video) {
      throw new Error("fixture import failed");
    }

    const changedEvents: Array<{ reason: string; updated_at_ms: number }> = [];
    const unsubscribe = service.onLibraryChanged((payload) => {
      changedEvents.push(payload);
    });

    await service.writeAppState({
      state_key: "xp_preference_metrics_v1",
      state_json: JSON.stringify({
        version: 1,
        image_by_source_id: {
          [source.id]: {
            event_count: 1,
            pages_read: 1,
            total_pages: source.images.length,
            completion_ratio:
              source.images.length > 0 ? 1 / source.images.length : 0,
            last_event_time_ms: 1_739_000_000_000,
          },
        },
        video_by_id: {
          [video.id]: {
            event_count: 2,
            watch_seconds: 22.5,
            total_seconds: Math.max(1, video.duration_sec),
            completion_ratio: 0.25,
            last_event_time_ms: 1_739_000_100_000,
          },
        },
      }),
    });

    const after = await service.readLibrarySnapshot();
    unsubscribe();

    const sourceAfter = after.image_directories.find(
      (item) => item.id === source.id,
    );
    const videoAfter = after.videos.find((item) => item.id === video.id);
    expect(sourceAfter?.preference_metrics).toMatchObject({
      event_count: 1,
      pages_read: 1,
      total_pages: source.images.length,
    });
    expect(videoAfter?.preference_metrics).toMatchObject({
      event_count: 2,
      watch_seconds: 22.5,
    });
    expect(
      changedEvents.some(
        (payload) => payload.reason === "write-preference-metrics",
      ),
    ).toBe(true);
  });

  it("视频短停留会话会入库并标记 is_noise", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-preference-noise-session-"),
    );
    createdRoots.push(root);

    const videoPath = path.join(root, "video", "clip.mp4");
    await writeBinary(videoPath, [0x00, 0x00, 0x00, 0x18]);

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-folders", [root]);

    const snapshot = await service.readLibrarySnapshot();
    const video = snapshot.videos.find(
      (item) => path.resolve(item.absolute_path) === path.resolve(videoPath),
    );
    expect(video).toBeTruthy();
    if (!video) {
      throw new Error("video fixture not found");
    }

    await service.writeAppState({
      state_key: "xp_preference_metrics_v1",
      state_json: JSON.stringify({
        version: 2,
        image_by_source_id: {},
        video_by_id: {},
        image_session_events: [],
        video_session_events: [
          {
            session_id: "vid-noise-1",
            video_id: video.id,
            started_at_ms: 1_739_000_000_000,
            ended_at_ms: 1_739_000_001_000,
            watch_seconds: 4.2,
            total_seconds: Math.max(1, video.duration_sec),
            completion_ratio: 0.042,
            had_fullscreen: false,
            is_noise: true,
            end_reason: "video-session-end",
          },
          {
            session_id: "vid-real-1",
            video_id: video.id,
            started_at_ms: 1_739_000_010_000,
            ended_at_ms: 1_739_000_020_000,
            watch_seconds: 15,
            total_seconds: Math.max(1, video.duration_sec),
            completion_ratio: 0.15,
            had_fullscreen: false,
            is_noise: false,
            end_reason: "video-session-end",
          },
        ],
      }),
    });

    const dbPath = path.join(root, DATABASE_RELATIVE_PATH);
    const db = new DatabaseSync(dbPath);
    try {
      const rows = db
        .prepare(
          `
            SELECT session_id, is_noise, watch_seconds
            FROM video_preference_sessions
            WHERE video_id = ?
            ORDER BY session_id ASC
          `,
        )
        .all(video.id) as Array<{
        session_id: string;
        is_noise: number;
        watch_seconds: number;
      }>;
      expect(rows).toEqual([
        {
          session_id: "vid-noise-1",
          is_noise: 1,
          watch_seconds: 4.2,
        },
        {
          session_id: "vid-real-1",
          is_noise: 0,
          watch_seconds: 15,
        },
      ]);
    } finally {
      db.close();
    }
  });

  it("runtime checkpoint 会先落入 runtime 表并在会话结束后清理", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-preference-runtime-checkpoint-"),
    );
    createdRoots.push(root);

    const imagePath = path.join(root, "gallery", "a.jpg");
    await writeBinary(imagePath, [0xff, 0xd8, 0xff, 0xd9]);

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-folders", [root]);

    const snapshot = await service.readLibrarySnapshot();
    const source = snapshot.image_directories.find(
      (item) =>
        path.resolve(item.absolute_path) ===
        path.resolve(path.dirname(imagePath)),
    );
    expect(source).toBeTruthy();
    if (!source) {
      throw new Error("image source fixture not found");
    }

    await service.writeAppState({
      state_key: "xp_preference_metrics_v1",
      state_json: JSON.stringify({
        version: 2,
        reason: "runtime-heartbeat",
        image_by_source_id: {},
        video_by_id: {},
        image_session_events: [],
        video_session_events: [],
        image_runtime_checkpoints: [
          {
            session_id: "img-runtime-flow-1",
            source_id: source.id,
            started_at_ms: 1_739_600_000_000,
            last_checkpoint_ms: 1_739_600_002_000,
            checkpoint_seq: 1,
            pages_read: 2,
            total_pages: Math.max(1, source.images.length),
            completion_ratio: 0.2,
            is_fullscreen: true,
          },
        ],
      }),
    });

    const dbPath = path.join(root, DATABASE_RELATIVE_PATH);
    const db = new DatabaseSync(dbPath);
    try {
      const runtimeBeforeFinalize = db
        .prepare(
          `
            SELECT COUNT(*) AS count
            FROM image_preference_runtime
            WHERE session_id = ?
          `,
        )
        .get("img-runtime-flow-1") as { count: number };
      expect(runtimeBeforeFinalize.count).toBe(1);

      await service.writeAppState({
        state_key: "xp_preference_metrics_v1",
        state_json: JSON.stringify({
          version: 2,
          reason: "image-session-end",
          image_by_source_id: {
            [source.id]: {
              event_count: 1,
              pages_read: 2,
              total_pages: Math.max(1, source.images.length),
              completion_ratio:
                source.images.length > 0 ? 2 / source.images.length : 0,
              last_event_time_ms: 1_739_600_003_000,
            },
          },
          video_by_id: {},
          image_session_events: [
            {
              session_id: "img-runtime-flow-1",
              source_id: source.id,
              started_at_ms: 1_739_600_000_000,
              ended_at_ms: 1_739_600_003_000,
              pages_read: 2,
              total_pages: Math.max(1, source.images.length),
              completion_ratio:
                source.images.length > 0 ? 2 / source.images.length : 0,
              is_fullscreen: true,
              end_reason: "image-session-end",
            },
          ],
          video_session_events: [],
        }),
      });

      const runtimeAfterFinalize = db
        .prepare(
          `
            SELECT COUNT(*) AS count
            FROM image_preference_runtime
            WHERE session_id = ?
          `,
        )
        .get("img-runtime-flow-1") as { count: number };
      expect(runtimeAfterFinalize.count).toBe(0);
    } finally {
      db.close();
    }
  });

  it("runtime-only 写入不会覆盖 app_state 中已存在的聚合缓存", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-preference-runtime-keep-metrics-"),
    );
    createdRoots.push(root);

    const imagePath = path.join(root, "gallery", "a.jpg");
    await writeBinary(imagePath, [0xff, 0xd8, 0xff, 0xd9]);

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-folders", [root]);

    const snapshot = await service.readLibrarySnapshot();
    const source = snapshot.image_directories.find(
      (item) =>
        path.resolve(item.absolute_path) ===
        path.resolve(path.dirname(imagePath)),
    );
    expect(source).toBeTruthy();
    if (!source) {
      throw new Error("image source fixture not found");
    }

    await service.writeAppState({
      state_key: "xp_preference_metrics_v1",
      state_json: JSON.stringify({
        version: 2,
        reason: "image-session-end",
        image_by_source_id: {
          [source.id]: {
            event_count: 1,
            pages_read: 1,
            total_pages: Math.max(1, source.images.length),
            completion_ratio:
              source.images.length > 0 ? 1 / source.images.length : 0,
            last_event_time_ms: 1_739_700_000_000,
          },
        },
        video_by_id: {},
        image_session_events: [],
        video_session_events: [],
      }),
    });

    await service.writeAppState({
      state_key: "xp_preference_metrics_v1",
      state_json: JSON.stringify({
        version: 2,
        reason: "runtime-heartbeat",
        image_by_source_id: {},
        video_by_id: {},
        image_session_events: [],
        video_session_events: [],
        image_runtime_checkpoints: [
          {
            session_id: "img-runtime-keep-1",
            source_id: source.id,
            started_at_ms: 1_739_700_001_000,
            last_checkpoint_ms: 1_739_700_002_000,
            checkpoint_seq: 1,
            pages_read: 1,
            total_pages: Math.max(1, source.images.length),
            completion_ratio:
              source.images.length > 0 ? 1 / source.images.length : 0,
            is_fullscreen: true,
          },
        ],
      }),
    });

    const appState = await service.readAppState({
      state_key: "xp_preference_metrics_v1",
      fallback_json: "{}",
    });
    const parsed = JSON.parse(appState.state_json) as {
      image_by_source_id?: Record<string, { event_count?: number }>;
    };
    expect(parsed.image_by_source_id?.[source.id]?.event_count).toBe(1);
  });

  it("连续写入偏好 app_state 时会保留图片与视频最近会话历史", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-preference-state-history-"),
    );
    createdRoots.push(root);

    const imagePath = path.join(root, "gallery", "a.jpg");
    const videoPath = path.join(root, "video", "clip.mp4");
    await writeBinary(imagePath, [0xff, 0xd8, 0xff, 0xd9]);
    await writeBinary(videoPath, [0x00, 0x00, 0x00, 0x18]);

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-folders", [root]);

    const snapshot = await service.readLibrarySnapshot();
    const source = snapshot.image_directories.find(
      (item) =>
        path.resolve(item.absolute_path) ===
        path.resolve(path.dirname(imagePath)),
    );
    const video = snapshot.videos.find(
      (item) => path.resolve(item.absolute_path) === path.resolve(videoPath),
    );
    expect(source).toBeTruthy();
    expect(video).toBeTruthy();
    if (!source || !video) {
      throw new Error("fixture import failed");
    }

    await service.writeAppState({
      state_key: "xp_preference_metrics_v1",
      state_json: JSON.stringify({
        version: 2,
        reason: "image-session-end",
        updated_at_ms: 1_739_100_000_000,
        image_by_source_id: {},
        video_by_id: {},
        image_session_events: [
          {
            session_id: "img-history-1",
            source_id: source.id,
            started_at_ms: 1_739_100_000_000,
            ended_at_ms: 1_739_100_002_000,
            pages_read: 3,
            total_pages: Math.max(1, source.images.length),
            completion_ratio: 0.3,
            is_fullscreen: true,
            end_reason: "image-session-end",
          },
        ],
        video_session_events: [],
      }),
    });

    await service.writeAppState({
      state_key: "xp_preference_metrics_v1",
      state_json: JSON.stringify({
        version: 2,
        reason: "video-session-end",
        updated_at_ms: 1_739_100_010_000,
        image_by_source_id: {},
        video_by_id: {},
        image_session_events: [],
        video_session_events: [
          {
            session_id: "vid-history-1",
            video_id: video.id,
            started_at_ms: 1_739_100_010_000,
            ended_at_ms: 1_739_100_020_000,
            watch_seconds: 12,
            total_seconds: Math.max(1, video.duration_sec),
            completion_ratio: 0.12,
            had_fullscreen: false,
            is_noise: false,
            end_reason: "video-session-end",
          },
        ],
      }),
    });

    await service.writeAppState({
      state_key: "xp_preference_metrics_v1",
      state_json: JSON.stringify({
        version: 2,
        reason: "video-session-end",
        updated_at_ms: 1_739_100_011_000,
        image_by_source_id: {},
        video_by_id: {},
        image_session_events: [],
        video_session_events: [
          {
            session_id: "vid-history-1",
            video_id: video.id,
            started_at_ms: 1_739_100_010_000,
            ended_at_ms: 1_739_100_020_000,
            watch_seconds: 12,
            total_seconds: Math.max(1, video.duration_sec),
            completion_ratio: 0.12,
            had_fullscreen: false,
            is_noise: false,
            end_reason: "video-session-end",
          },
        ],
      }),
    });

    const appState = await service.readAppState({
      state_key: "xp_preference_metrics_v1",
      fallback_json: "{}",
    });
    const parsedState = JSON.parse(appState.state_json) as {
      image_session_events?: Array<{ session_id?: string }>;
      video_session_events?: Array<{ session_id?: string }>;
    };
    const videoSessionIds = (parsedState.video_session_events ?? []).map(
      (item) => item.session_id,
    );
    const duplicateVideoSessionCount = videoSessionIds.filter(
      (sessionId) => sessionId === "vid-history-1",
    ).length;

    expect(
      parsedState.image_session_events?.map((item) => item.session_id),
    ).toContain("img-history-1");
    expect(
      parsedState.video_session_events?.map((item) => item.session_id),
    ).toContain("vid-history-1");
    expect(duplicateVideoSessionCount).toBe(1);
  });
});
