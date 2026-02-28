import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  LibrarySnapshotDto,
  ReadVideoTranscodeCapabilitiesResponseDto,
  VideoItemDto,
} from "../../../src/contracts/backend";
import { type MediaAccessGuardContext } from "../../fileSystemMediaAccessGuard";
import { createVideoFixture } from "../../test-utils/mediaLibraryFixtures";
import { ManagementVideoTranscodeService } from "./managementVideoTranscodeService";

interface VideoTranscodeServicePrivateApi {
  runFfmpegWithProgress: (
    args: string[],
    options: { signal?: AbortSignal; isCancelled?: () => boolean },
    onProgressMs: (outTimeMs: number) => void,
  ) => Promise<{ code: number; stderr: string }>;
}

function createVideoAccessContext(rootDir: string): MediaAccessGuardContext {
  return {
    rootDir,
    importDirectoryRoots: [],
    importFileAllowlistKeys: new Set<string>(),
    archiveEntryIndexByPath: new Map<string, Set<string>>(),
    imageExtensions: new Set<string>(),
    videoExtensions: new Set([".mp4", ".mkv", ".webm"]),
    audioExtensions: new Set([".mp3", ".flac", ".wav", ".aac", ".opus"]),
    subtitleExtensions: new Set<string>(),
  };
}

function createCapabilities(
  rootDir: string,
): ReadVideoTranscodeCapabilitiesResponseDto {
  return {
    enabled: true,
    ffmpeg_available: true,
    ffprobe_available: true,
    library_root_dir: rootDir,
    default_output_dir: path.join(rootDir, "transcoded", "video"),
    containers: {
      mp4: { available: true, required_muxer: "mp4", reason: null },
      mkv: { available: true, required_muxer: "matroska", reason: null },
      webm: { available: true, required_muxer: "webm", reason: null },
    },
    video_codecs: {
      h264: { available: true, required_encoder: "libx264", reason: null },
      h265: { available: true, required_encoder: "libx265", reason: null },
      vp9: { available: true, required_encoder: "libvpx-vp9", reason: null },
      av1: { available: true, required_encoder: "libaom-av1", reason: null },
      copy: { available: true, required_encoder: "copy", reason: null },
    },
    checked_at_ms: Date.now(),
  };
}

async function createVideoSnapshot(rootDir: string): Promise<{
  snapshot: LibrarySnapshotDto;
  videoIds: string[];
}> {
  const videoDir = path.join(rootDir, "inputs");
  await fs.mkdir(videoDir, { recursive: true });
  const absolutePath = path.join(videoDir, "clip-001.mp4");
  await fs.writeFile(absolutePath, Buffer.from("fixture-video"));

  const video: VideoItemDto = createVideoFixture("video-1", absolutePath);
  return {
    snapshot: {
      image_packages: [],
      image_directories: [],
      videos: [video],
      audios: [],
    },
    videoIds: [video.id],
  };
}

describe("ManagementVideoTranscodeService", () => {
  const tempRoots: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(
      tempRoots.map((rootDir) =>
        fs.rm(rootDir, { recursive: true, force: true }),
      ),
    );
    tempRoots.length = 0;
  });

  it("应将参数覆盖映射为 ffmpeg 参数并输出目标文件", async () => {
    const rootDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-video-transcode-params-"),
    );
    tempRoots.push(rootDir);

    const { snapshot, videoIds } = await createVideoSnapshot(rootDir);
    const capabilities = createCapabilities(rootDir);
    const service = new ManagementVideoTranscodeService({
      rootDir,
      ffmpegBin: "ffmpeg",
      defaultConcurrency: 1,
      ensureRuntimeDependencies: vi.fn().mockResolvedValue({
        ffmpeg: true,
        ffprobe: true,
      }),
      ensureStateLoaded: vi.fn().mockResolvedValue(undefined),
      ensureSnapshotLoaded: vi
        .fn()
        .mockResolvedValue({ videos: snapshot.videos ?? [] }),
      buildMediaAccessContext: () => createVideoAccessContext(rootDir),
    });

    vi.spyOn(service, "readVideoTranscodeCapabilities").mockResolvedValue(
      capabilities,
    );
    const servicePrivate =
      service as unknown as VideoTranscodeServicePrivateApi;
    const capturedArgs: string[][] = [];
    vi.spyOn(servicePrivate, "runFfmpegWithProgress").mockImplementation(
      async (args, _options, onProgressMs) => {
        capturedArgs.push([...args]);
        onProgressMs(3_000);
        const outputPath = args[args.length - 1] ?? "";
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, Buffer.from("transcoded"));
        return { code: 0, stderr: "" };
      },
    );

    const progressPayloads: Array<{ progress: number; message: string }> = [];
    const result = await service.runVideoTranscodeTask(
      {
        video_ids: videoIds,
        params_override: {
          container: "mkv",
          video_codec: "h265",
          quality_mode: "bitrate",
          video_bitrate_kbps: 4_000,
          encoder_preset: "fast",
          audio_mode: "encode",
          audio_bitrate_kbps: 192,
          fps: 30,
        },
        overwrite: true,
      },
      {
        onProgress: (payload) => {
          progressPayloads.push({
            progress: payload.progress,
            message: payload.message,
          });
        },
      },
    );

    expect(result.success_count).toBe(1);
    expect(result.output_files[0]?.endsWith(".mkv")).toBe(true);
    const firstArgs = capturedArgs[0] ?? [];
    expect(firstArgs).toContain("-c:v");
    expect(firstArgs).toContain("libx265");
    expect(firstArgs).toContain("-b:v");
    expect(firstArgs).toContain("4000k");
    expect(firstArgs).toContain("-r");
    expect(firstArgs).toContain("30");
    expect(firstArgs).toContain("-c:a");
    expect(firstArgs).toContain("aac");
    expect(progressPayloads.some((item) => item.progress > 0)).toBe(true);
  });
});
