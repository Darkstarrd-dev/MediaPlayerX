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
    const writeAppState = vi.fn().mockResolvedValue({ updated_at_ms: Date.now() });
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
      expect(writeAppState).toHaveBeenCalledTimes(1);
    });
    const payload = JSON.parse(writeAppState.mock.calls[0][0].state_json) as {
      image_by_source_id: Record<string, { event_count: number; pages_read: number }>;
    };
    expect(payload.image_by_source_id["pkg-a"]?.event_count).toBe(1);
    expect(payload.image_by_source_id["pkg-a"]?.pages_read).toBe(6);
  });

  it("视频非全屏播放不足10秒视为噪音不写入，超过10秒在停止时写入", async () => {
    const writeAppState = vi.fn().mockResolvedValue({ updated_at_ms: Date.now() });
    const repository = { writeAppState } as unknown as MediaRepository;
    const video = createVideo("video-a", 120);

    const { rerender } = renderHook(
      (props: {
        videoPlaying: boolean;
        videoTime: number;
      }) =>
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

    await new Promise((resolve) => window.setTimeout(resolve, 10));
    expect(writeAppState).toHaveBeenCalledTimes(0);

    rerender({ videoPlaying: true, videoTime: 0 });
    rerender({ videoPlaying: true, videoTime: 12 });
    rerender({ videoPlaying: false, videoTime: 12 });

    await waitFor(() => {
      expect(writeAppState).toHaveBeenCalledTimes(1);
    });
    const payload = JSON.parse(writeAppState.mock.calls[0][0].state_json) as {
      video_by_id: Record<string, { event_count: number; watch_seconds: number }>;
    };
    expect(payload.video_by_id["video-a"]?.event_count).toBe(1);
    expect(payload.video_by_id["video-a"]?.watch_seconds).toBeGreaterThanOrEqual(12);
  });
});
