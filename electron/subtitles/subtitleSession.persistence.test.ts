import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { SubtitleSessionManager } from "./subtitleSession";

interface ManagerWithSessions {
  sessions: Map<
    number,
    {
      sessionId: string;
      provider: "sherpa-sense-voice";
      workerClient: {
        request: (...args: unknown[]) => Promise<unknown>;
        terminate: () => Promise<void>;
      };
      persistence: unknown;
    }
  >;
}

function createManagerWithSession(
  webContentsId: number,
): SubtitleSessionManager {
  const manager = new SubtitleSessionManager();
  const managerWithSessions = manager as unknown as ManagerWithSessions;
  managerWithSessions.sessions.set(webContentsId, {
    sessionId: "test-session",
    provider: "sherpa-sense-voice",
    workerClient: {
      request: async () => ({}),
      terminate: async () => undefined,
    },
    persistence: null,
  });
  return manager;
}

describe("SubtitleSessionManager persistence overlap guards", () => {
  const tempRoots: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempRoots
        .splice(0)
        .map((root) => rm(root, { recursive: true, force: true })),
    );
  });

  it("blocks overlap rewrites in valid ranges by default", async () => {
    const webContentsId = 1001;
    const manager = createManagerWithSession(webContentsId);
    const tempRoot = await mkdtemp(
      path.join(os.tmpdir(), "mpx-subtitle-guard-"),
    );
    tempRoots.push(tempRoot);
    const videoPath = path.join(tempRoot, "sample.mp4");

    const start = await manager.startPersistence(webContentsId, {
      video_path: videoPath,
      language: "ja",
      reset_existing: true,
      valid_playback_rate_threshold: 1,
    });
    expect(start.enabled).toBe(true);

    const firstAppend = await manager.appendPersistence(webContentsId, {
      cues: [
        {
          id: "cue-1",
          start_sec: 2.0,
          end_sec: 3.0,
          text: "first line",
          lang: "ja",
          speaker: null,
          line: "A",
          speaker_changed: false,
          speaker_similarity: 1,
        },
      ],
      session_epoch: 1,
      chunk_seq: 0,
      batch_start_sec: 2.0,
      batch_end_sec: 3.0,
      playback_rate: 1,
      enforce_valid_range_guard: false,
      allow_first_overlap_replace_once: false,
      seek_anchor_sec: null,
      current_valid_range: { start_sec: 0, end_sec: 10 },
    });
    expect(firstAppend.accepted).toBe(true);
    expect(firstAppend.replaced_cue_count).toBe(0);

    const blockedRewrite = await manager.appendPersistence(webContentsId, {
      cues: [
        {
          id: "cue-2",
          start_sec: 2.1,
          end_sec: 3.1,
          text: "rewrite line",
          lang: "ja",
          speaker: null,
          line: "A",
          speaker_changed: false,
          speaker_similarity: 1,
        },
      ],
      session_epoch: 1,
      chunk_seq: 1,
      batch_start_sec: 2.1,
      batch_end_sec: 3.1,
      playback_rate: 1,
      enforce_valid_range_guard: false,
      allow_first_overlap_replace_once: false,
      seek_anchor_sec: null,
      current_valid_range: { start_sec: 0, end_sec: 10 },
    });
    expect(blockedRewrite.accepted).toBe(false);

    const window = await manager.readPersistenceWindow(webContentsId, {
      timeline_sec: 2.2,
      backtrack_sec: 2,
      lookahead_sec: 3,
      limit: 10,
      prefer_persisted_file: true,
    });
    expect(window.cues).toHaveLength(1);
    expect(window.cues[0]?.text).toBe("first line");
  });

  it("allows one-shot overlap replace after seek, then restores blocking", async () => {
    const webContentsId = 1002;
    const manager = createManagerWithSession(webContentsId);
    const tempRoot = await mkdtemp(
      path.join(os.tmpdir(), "mpx-subtitle-oneshot-"),
    );
    tempRoots.push(tempRoot);
    const videoPath = path.join(tempRoot, "sample.mp4");

    await manager.startPersistence(webContentsId, {
      video_path: videoPath,
      language: "ja",
      reset_existing: true,
      valid_playback_rate_threshold: 1,
    });

    await manager.appendPersistence(webContentsId, {
      cues: [
        {
          id: "seed",
          start_sec: 2,
          end_sec: 3,
          text: "seed line",
          lang: "ja",
          speaker: null,
          line: "A",
          speaker_changed: false,
          speaker_similarity: 1,
        },
      ],
      session_epoch: 5,
      chunk_seq: 0,
      batch_start_sec: 2,
      batch_end_sec: 3,
      playback_rate: 1,
      enforce_valid_range_guard: false,
      allow_first_overlap_replace_once: false,
      seek_anchor_sec: null,
      current_valid_range: { start_sec: 0, end_sec: 20 },
    });

    const oneShotReplace = await manager.appendPersistence(webContentsId, {
      cues: [
        {
          id: "oneshot",
          start_sec: 2.05,
          end_sec: 3.05,
          text: "oneshot replace",
          lang: "ja",
          speaker: null,
          line: "A",
          speaker_changed: false,
          speaker_similarity: 1,
        },
      ],
      session_epoch: 5,
      chunk_seq: 1,
      batch_start_sec: 2.05,
      batch_end_sec: 3.05,
      playback_rate: 1,
      enforce_valid_range_guard: false,
      allow_first_overlap_replace_once: true,
      seek_anchor_sec: 2.1,
      current_valid_range: { start_sec: 0, end_sec: 20 },
    });
    expect(oneShotReplace.accepted).toBe(true);
    expect(oneShotReplace.replaced_cue_count).toBe(1);

    const blockedSecondRewrite = await manager.appendPersistence(
      webContentsId,
      {
        cues: [
          {
            id: "blocked",
            start_sec: 2.08,
            end_sec: 3.08,
            text: "should be blocked",
            lang: "ja",
            speaker: null,
            line: "A",
            speaker_changed: false,
            speaker_similarity: 1,
          },
        ],
        session_epoch: 5,
        chunk_seq: 2,
        batch_start_sec: 2.08,
        batch_end_sec: 3.08,
        playback_rate: 1,
        enforce_valid_range_guard: false,
        allow_first_overlap_replace_once: false,
        seek_anchor_sec: null,
        current_valid_range: { start_sec: 0, end_sec: 20 },
      },
    );
    expect(blockedSecondRewrite.accepted).toBe(false);

    const window = await manager.readPersistenceWindow(webContentsId, {
      timeline_sec: 2.3,
      backtrack_sec: 2,
      lookahead_sec: 3,
      limit: 10,
      prefer_persisted_file: true,
    });
    expect(window.cues).toHaveLength(1);
    expect(window.cues[0]?.text).toBe("oneshot replace");
  });
});
