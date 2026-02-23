import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { MediaRepository } from "../backend/repository";
import { usePreferenceMetricsBuffer } from "./usePreferenceMetricsBuffer";

function createVideo(id: string, durationSec = 100) {
  return {
    id,
    fileName: `${id}.mp4`,
    absolutePath: `D:/videos/${id}.mp4`,
    treePath: ["D:", "videos", `${id}.mp4`],
    durationSec,
    width: 1920,
    height: 1080,
    sizeMb: 42,
    coverColor: "#222222",
    coverImagePath: null,
    workTitle: id,
    circle: "circle",
    author: "author",
    tags: [],
    grade: null,
    mediaLocator: {
      kind: "filesystem" as const,
      absolutePath: `D:/videos/${id}.mp4`,
      extension: ".mp4",
      mediaType: "video" as const,
      mimeType: "video/mp4",
    },
    preferenceMetrics: null,
  };
}

function createPackage(id: string, imageCount: number) {
  return {
    id,
    packageName: `${id}.zip`,
    displayName: id,
    absolutePath: `D:/images/${id}.zip`,
    treePath: ["D:", "images", `${id}.zip`],
    workTitle: id,
    circle: "circle",
    author: "author",
    tags: [],
    preferenceMetrics: null,
    images: Array.from({ length: imageCount }, (_, index) => ({
      id: `${id}-${index + 1}`,
      ordinal: index + 1,
      width: 100,
      height: 100,
      sizeKb: 1,
      cluster: 0,
      color: "#000000",
      mediaLocator: {
        kind: "filesystem" as const,
        absolutePath: `D:/images/${id}/${index + 1}.jpg`,
        extension: ".jpg",
        mediaType: "image" as const,
        mimeType: "image/jpeg",
      },
    })),
  };
}

describe("usePreferenceMetricsBuffer", () => {
  it("图片仅在全屏会话结束时写入偏好记录", async () => {
    const writeAppState = vi
      .fn()
      .mockResolvedValue({ updated_at_ms: Date.now() });
    const repository = { writeAppState } as unknown as MediaRepository;
    const imagePackage = createPackage("pkg-a", 10);
    const packageById = new Map([[imagePackage.id, imagePackage]]);

    const { rerender } = renderHook(
      (props: {
        mode: "image" | "video" | "music";
        fullscreenActive: boolean;
        focusedImageRef: { packageId: string; imageIndex: number } | null;
      }) =>
        usePreferenceMetricsBuffer({
          repository,
          mode: props.mode,
          fullscreenActive: props.fullscreenActive,
          focusedImageRef: props.focusedImageRef,
          packageById,
          videos: [],
          selectedVideoId: "",
          videoPlaying: false,
          videoTime: 0,
        }),
      {
        initialProps: {
          mode: "image",
          fullscreenActive: false,
          focusedImageRef: null,
        },
      },
    );

    rerender({
      mode: "image",
      fullscreenActive: true,
      focusedImageRef: { packageId: "pkg-a", imageIndex: 0 },
    });
    rerender({
      mode: "image",
      fullscreenActive: true,
      focusedImageRef: { packageId: "pkg-a", imageIndex: 5 },
    });
    rerender({
      mode: "image",
      fullscreenActive: false,
      focusedImageRef: { packageId: "pkg-a", imageIndex: 5 },
    });

    await waitFor(() => {
      expect(writeAppState).toHaveBeenCalled();
      const reasons = writeAppState.mock.calls.map((call) => {
        const payload = JSON.parse(call[0].state_json) as { reason?: string };
        return payload.reason;
      });
      expect(reasons).toContain("image-session-end");
    });
    const endPayload = writeAppState.mock.calls
      .map((call) => JSON.parse(call[0].state_json) as { reason?: string })
      .find((payload) => payload.reason === "image-session-end");
    expect(endPayload).toBeTruthy();
    const payload = endPayload as {
      image_by_source_id: Record<
        string,
        { event_count: number; pages_read: number }
      >;
    };
    expect(payload.image_by_source_id["pkg-a"]?.event_count).toBe(1);
    expect(payload.image_by_source_id["pkg-a"]?.pages_read).toBe(6);
  });

  it("视频非全屏播放不足10秒视为噪音不写入，超过10秒在停止时写入", async () => {
    const writeAppState = vi
      .fn()
      .mockResolvedValue({ updated_at_ms: Date.now() });
    const repository = { writeAppState } as unknown as MediaRepository;
    const video = createVideo("video-a", 120);

    const { rerender } = renderHook(
      (props: { videoPlaying: boolean; videoTime: number }) =>
        usePreferenceMetricsBuffer({
          repository,
          mode: "video",
          fullscreenActive: false,
          focusedImageRef: null,
          packageById: new Map(),
          videos: [video],
          selectedVideoId: video.id,
          videoPlaying: props.videoPlaying,
          videoTime: props.videoTime,
        }),
      {
        initialProps: {
          videoPlaying: true,
          videoTime: 0,
        },
      },
    );

    rerender({ videoPlaying: true, videoTime: 5 });
    rerender({ videoPlaying: false, videoTime: 5 });

    await waitFor(() => {
      expect(writeAppState).toHaveBeenCalled();
    });
    const noisePayload = writeAppState.mock.calls
      .map(
        (call) =>
          JSON.parse(call[0].state_json) as {
            video_session_events?: Array<{ is_noise?: boolean }>;
          },
      )
      .find((payload) =>
        (payload.video_session_events ?? []).some((event) => event.is_noise),
      );
    expect(noisePayload).toBeTruthy();

    rerender({ videoPlaying: true, videoTime: 0 });
    rerender({ videoPlaying: true, videoTime: 12 });
    rerender({ videoPlaying: false, videoTime: 12 });

    await waitFor(() => {
      const hasEffectiveMetricWrite = writeAppState.mock.calls.some((call) => {
        const payload = JSON.parse(call[0].state_json) as {
          video_by_id?: Record<string, { event_count?: number }>;
        };
        return (payload.video_by_id?.["video-a"]?.event_count ?? 0) >= 1;
      });
      expect(hasEffectiveMetricWrite).toBe(true);
    });
    const payload = writeAppState.mock.calls
      .map(
        (call) =>
          JSON.parse(call[0].state_json) as {
            video_by_id: Record<
              string,
              { event_count: number; watch_seconds: number }
            >;
          },
      )
      .find((candidate) => (candidate.video_by_id["video-a"]?.event_count ?? 0) >= 1);
    expect(payload).toBeTruthy();
    const effectivePayload = payload as {
      video_by_id: Record<
        string,
        { event_count: number; watch_seconds: number }
      >;
    };
    expect(effectivePayload.video_by_id["video-a"]?.event_count).toBe(1);
    expect(
      effectivePayload.video_by_id["video-a"]?.watch_seconds,
    ).toBeGreaterThanOrEqual(12);
  });

  it("图片全屏内切换图包会先提交上一图包会话并写入", async () => {
    const writeAppState = vi
      .fn()
      .mockResolvedValue({ updated_at_ms: Date.now() });
    const repository = { writeAppState } as unknown as MediaRepository;
    const packageA = createPackage("pkg-a", 8);
    const packageB = createPackage("pkg-b", 5);
    const packageById = new Map([
      [packageA.id, packageA],
      [packageB.id, packageB],
    ]);

    const { rerender } = renderHook(
      (props: { focusedImageRef: { packageId: string; imageIndex: number } }) =>
        usePreferenceMetricsBuffer({
          repository,
          mode: "image",
          fullscreenActive: true,
          focusedImageRef: props.focusedImageRef,
          packageById,
          videos: [],
          selectedVideoId: "",
          videoPlaying: false,
          videoTime: 0,
        }),
      {
        initialProps: {
          focusedImageRef: { packageId: "pkg-a", imageIndex: 1 },
        },
      },
    );

    rerender({ focusedImageRef: { packageId: "pkg-a", imageIndex: 4 } });
    rerender({ focusedImageRef: { packageId: "pkg-b", imageIndex: 0 } });

    await waitFor(() => {
      expect(writeAppState).toHaveBeenCalled();
      const reasons = writeAppState.mock.calls.map((call) => {
        const payload = JSON.parse(call[0].state_json) as { reason?: string };
        return payload.reason;
      });
      expect(reasons).toContain("image-switch-node");
    });
    const payload = writeAppState.mock.calls
      .map(
        (call) =>
          JSON.parse(call[0].state_json) as {
            reason?: string;
            image_by_source_id: Record<
              string,
              { event_count: number; pages_read: number }
            >;
          },
      )
      .find((candidate) => candidate.reason === "image-switch-node");
    expect(payload).toBeTruthy();
    const switchPayload = payload as {
      image_by_source_id: Record<string, { event_count: number; pages_read: number }>;
    };
    expect(switchPayload.image_by_source_id["pkg-a"]?.event_count).toBe(1);
    expect(switchPayload.image_by_source_id["pkg-a"]?.pages_read).toBe(5);
  });

  it("写入 appState 时保持 repository 方法上下文", async () => {
    class RepositoryWithContext {
      marker = "alive";
      writeCalls: Array<{ state_key: string; state_json: string }> = [];

      async writeAppState(request: { state_key: string; state_json: string }) {
        if (this.marker !== "alive") {
          throw new Error("repository context lost");
        }
        this.writeCalls.push(request);
        return { updated_at_ms: Date.now() };
      }
    }

    const repository =
      new RepositoryWithContext() as unknown as MediaRepository;
    const imagePackage = createPackage("pkg-context", 3);
    const packageById = new Map([[imagePackage.id, imagePackage]]);

    const { rerender } = renderHook(
      (props: {
        mode: "image" | "video" | "music";
        fullscreenActive: boolean;
        focusedImageRef: { packageId: string; imageIndex: number } | null;
      }) =>
        usePreferenceMetricsBuffer({
          repository,
          mode: props.mode,
          fullscreenActive: props.fullscreenActive,
          focusedImageRef: props.focusedImageRef,
          packageById,
          videos: [],
          selectedVideoId: "",
          videoPlaying: false,
          videoTime: 0,
        }),
      {
        initialProps: {
          mode: "image",
          fullscreenActive: false,
          focusedImageRef: null,
        },
      },
    );

    rerender({
      mode: "image",
      fullscreenActive: true,
      focusedImageRef: { packageId: "pkg-context", imageIndex: 0 },
    });
    rerender({
      mode: "image",
      fullscreenActive: false,
      focusedImageRef: { packageId: "pkg-context", imageIndex: 0 },
    });

    await waitFor(() => {
      expect(
        (repository as unknown as RepositoryWithContext).writeCalls.length,
      ).toBeGreaterThanOrEqual(1);
    });
  });
});
