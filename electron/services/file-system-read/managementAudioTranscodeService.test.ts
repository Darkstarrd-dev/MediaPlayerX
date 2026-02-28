import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  AudioItemDto,
  LibrarySnapshotDto,
  ReadAudioTranscodeCapabilitiesResponseDto,
} from "../../../src/contracts/backend";
import { type MediaAccessGuardContext } from "../../fileSystemMediaAccessGuard";
import { createAudioFixture } from "../../test-utils/mediaLibraryFixtures";
import { ManagementAudioTranscodeService } from "./managementAudioTranscodeService";

interface TranscodeServicePrivateApi {
  runFfmpeg: (
    args: string[],
    options: { signal?: AbortSignal },
  ) => Promise<{ code: number; stderr: string }>;
}

function createAudioAccessContext(rootDir: string): MediaAccessGuardContext {
  return {
    rootDir,
    importDirectoryRoots: [],
    importFileAllowlistKeys: new Set<string>(),
    archiveEntryIndexByPath: new Map<string, Set<string>>(),
    imageExtensions: new Set<string>(),
    videoExtensions: new Set<string>(),
    audioExtensions: new Set([
      ".mp3",
      ".flac",
      ".wav",
      ".m4a",
      ".opus",
      ".aac",
    ]),
    subtitleExtensions: new Set<string>(),
  };
}

async function createAudioSnapshot(
  rootDir: string,
  count: number,
): Promise<{ snapshot: LibrarySnapshotDto; audioIds: string[] }> {
  const audioDir = path.join(rootDir, "inputs");
  await fs.mkdir(audioDir, { recursive: true });

  const audios: AudioItemDto[] = [];
  const audioIds: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const fileName = `track-${String(index + 1).padStart(3, "0")}.mp3`;
    const absolutePath = path.join(audioDir, fileName);
    await fs.writeFile(absolutePath, Buffer.from(`fixture-${index + 1}`));
    const audioId = `audio-${index + 1}`;
    audioIds.push(audioId);
    audios.push(createAudioFixture(audioId, absolutePath));
  }

  return {
    snapshot: {
      image_packages: [],
      image_directories: [],
      videos: [],
      audios,
    },
    audioIds,
  };
}

function createCapabilities(
  rootDir: string,
): ReadAudioTranscodeCapabilitiesResponseDto {
  const defaultOutputDir = path.join(rootDir, "transcoded", "audio");
  return {
    enabled: true,
    ffmpeg_available: true,
    ffprobe_available: true,
    library_root_dir: rootDir,
    default_output_dir: defaultOutputDir,
    presets: {
      flac: {
        available: true,
        required_encoder: "flac",
        required_muxer: "flac",
        reason: null,
      },
      alac: {
        available: true,
        required_encoder: "alac",
        required_muxer: "ipod/mp4",
        reason: null,
      },
      wav: {
        available: true,
        required_encoder: "pcm_s16le",
        required_muxer: "wav",
        reason: null,
      },
      opus: {
        available: true,
        required_encoder: "libopus",
        required_muxer: "opus",
        reason: null,
      },
      aac: {
        available: true,
        required_encoder: "aac",
        required_muxer: "ipod/mp4",
        reason: null,
      },
      mp3: {
        available: true,
        required_encoder: "libmp3lame",
        required_muxer: "mp3",
        reason: null,
      },
    },
    checked_at_ms: Date.now(),
  };
}

describe("ManagementAudioTranscodeService", () => {
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

  it("可完成 100 首批量转码并支持失败项重试", async () => {
    const rootDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-audio-transcode-batch-"),
    );
    tempRoots.push(rootDir);

    const { snapshot, audioIds } = await createAudioSnapshot(rootDir, 100);
    const capabilities = createCapabilities(rootDir);
    const defaultOutputDir = capabilities.default_output_dir;
    await fs.mkdir(defaultOutputDir, { recursive: true });

    const failedAudioIds = new Set(audioIds.slice(0, 12));
    for (const audioId of failedAudioIds) {
      const audio = (snapshot.audios ?? []).find((item) => item.id === audioId);
      if (!audio) {
        continue;
      }
      const targetPath = path.join(
        defaultOutputDir,
        `${path.basename(audio.absolute_path, path.extname(audio.absolute_path))}.flac`,
      );
      await fs.writeFile(targetPath, Buffer.from("pre-existing"));
    }

    let musicImportSources = {
      directories: [] as string[],
      files: [] as string[],
    };
    const writeMusicImportSources = vi.fn(
      (next: { directories: string[]; files: string[] }) => {
        musicImportSources = {
          directories: [...next.directories],
          files: [...next.files],
        };
      },
    );
    const refreshSnapshotFromFilesystem = vi.fn().mockResolvedValue(snapshot);
    const emitLibraryChanged = vi.fn();

    const service = new ManagementAudioTranscodeService({
      rootDir,
      ffmpegBin: "ffmpeg",
      defaultConcurrency: 2,
      runWithCpuToken: async <T>(_taskName: string, task: () => Promise<T>) =>
        await task(),
      ensureRuntimeDependencies: vi.fn().mockResolvedValue({
        ffmpeg: true,
        ffprobe: true,
      }),
      ensureStateLoaded: vi.fn().mockResolvedValue(undefined),
      ensureSnapshotLoaded: vi.fn().mockResolvedValue(snapshot),
      refreshSnapshotFromFilesystem,
      syncSnapshotFromDatabase: vi.fn().mockReturnValue(snapshot),
      buildMediaAccessContext: () => createAudioAccessContext(rootDir),
      readMusicImportSources: () => musicImportSources,
      writeMusicImportSources,
      emitLibraryChanged,
    });

    vi.spyOn(service, "readAudioTranscodeCapabilities").mockResolvedValue(
      capabilities,
    );
    const servicePrivate = service as unknown as TranscodeServicePrivateApi;
    let runningCount = 0;
    let maxRunningCount = 0;
    vi.spyOn(servicePrivate, "runFfmpeg").mockImplementation(async (args) => {
      runningCount += 1;
      maxRunningCount = Math.max(maxRunningCount, runningCount);
      await new Promise((resolve) => setTimeout(resolve, 5));
      const outputPath = args[args.length - 1] ?? "";
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, Buffer.from("transcoded"));
      runningCount -= 1;
      return { code: 0, stderr: "" };
    });

    const firstRun = await service.runAudioTranscodeTask({
      audio_ids: audioIds,
      preset: "flac",
      overwrite: false,
      add_output_to_music_sources: true,
    });

    expect(firstRun.total_count).toBe(100);
    expect(firstRun.success_count).toBe(88);
    expect(firstRun.failed_count).toBe(12);
    expect(firstRun.first_error_detail).toContain("destination already exists");

    const retryRun = await service.runAudioTranscodeTask({
      audio_ids: Array.from(failedAudioIds),
      preset: "flac",
      overwrite: true,
      add_output_to_music_sources: true,
    });

    expect(retryRun.total_count).toBe(12);
    expect(retryRun.success_count).toBe(12);
    expect(retryRun.failed_count).toBe(0);
    expect(maxRunningCount).toBeLessThanOrEqual(2);
    expect(maxRunningCount).toBeGreaterThan(1);
    expect(musicImportSources.directories).toContain(defaultOutputDir);
    expect(musicImportSources.files).toHaveLength(0);
    expect(refreshSnapshotFromFilesystem).toHaveBeenCalledTimes(2);
    expect(emitLibraryChanged).toHaveBeenCalledTimes(2);
  });

  it("output_dir 为空时应默认输出到库内转码目录并自动入源", async () => {
    const rootDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-audio-transcode-default-output-"),
    );
    tempRoots.push(rootDir);

    const { snapshot, audioIds } = await createAudioSnapshot(rootDir, 1);
    const capabilities = createCapabilities(rootDir);
    let musicImportSources = {
      directories: [] as string[],
      files: [] as string[],
    };
    const writeMusicImportSources = vi.fn(
      (next: { directories: string[]; files: string[] }) => {
        musicImportSources = {
          directories: [...next.directories],
          files: [...next.files],
        };
      },
    );

    const service = new ManagementAudioTranscodeService({
      rootDir,
      ffmpegBin: "ffmpeg",
      defaultConcurrency: 1,
      ensureRuntimeDependencies: vi.fn().mockResolvedValue({
        ffmpeg: true,
        ffprobe: true,
      }),
      ensureStateLoaded: vi.fn().mockResolvedValue(undefined),
      ensureSnapshotLoaded: vi.fn().mockResolvedValue(snapshot),
      refreshSnapshotFromFilesystem: vi.fn().mockResolvedValue(snapshot),
      syncSnapshotFromDatabase: vi.fn().mockReturnValue(snapshot),
      buildMediaAccessContext: () => createAudioAccessContext(rootDir),
      readMusicImportSources: () => musicImportSources,
      writeMusicImportSources,
      emitLibraryChanged: vi.fn(),
    });

    vi.spyOn(service, "readAudioTranscodeCapabilities").mockResolvedValue(
      capabilities,
    );
    const servicePrivate = service as unknown as TranscodeServicePrivateApi;
    vi.spyOn(servicePrivate, "runFfmpeg").mockImplementation(async (args) => {
      const outputPath = args[args.length - 1] ?? "";
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, Buffer.from("transcoded"));
      return { code: 0, stderr: "" };
    });

    const result = await service.runAudioTranscodeTask({
      audio_ids: audioIds,
      preset: "flac",
      overwrite: true,
      add_output_to_music_sources: true,
    });

    expect(result.success_count).toBe(1);
    expect(result.output_files).toHaveLength(1);
    expect(path.resolve(result.output_files[0] ?? "")).toContain(
      path.resolve(capabilities.default_output_dir),
    );
    expect(musicImportSources.directories).toEqual([
      path.resolve(capabilities.default_output_dir),
    ]);
    expect(musicImportSources.files).toEqual([]);
  });

  it("应将参数覆盖映射为 ffmpeg 参数", async () => {
    const rootDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-audio-transcode-params-"),
    );
    tempRoots.push(rootDir);

    const { snapshot, audioIds } = await createAudioSnapshot(rootDir, 1);
    const capabilities = createCapabilities(rootDir);

    const service = new ManagementAudioTranscodeService({
      rootDir,
      ffmpegBin: "ffmpeg",
      defaultConcurrency: 1,
      ensureRuntimeDependencies: vi.fn().mockResolvedValue({
        ffmpeg: true,
        ffprobe: true,
      }),
      ensureStateLoaded: vi.fn().mockResolvedValue(undefined),
      ensureSnapshotLoaded: vi.fn().mockResolvedValue(snapshot),
      refreshSnapshotFromFilesystem: vi.fn().mockResolvedValue(snapshot),
      syncSnapshotFromDatabase: vi.fn().mockReturnValue(snapshot),
      buildMediaAccessContext: () => createAudioAccessContext(rootDir),
      readMusicImportSources: () => ({ directories: [], files: [] }),
      writeMusicImportSources: vi.fn(),
      emitLibraryChanged: vi.fn(),
    });

    vi.spyOn(service, "readAudioTranscodeCapabilities").mockResolvedValue(
      capabilities,
    );
    const servicePrivate = service as unknown as TranscodeServicePrivateApi;
    const capturedArgs: string[][] = [];
    vi.spyOn(servicePrivate, "runFfmpeg").mockImplementation(async (args) => {
      capturedArgs.push([...args]);
      const outputPath = args[args.length - 1] ?? "";
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, Buffer.from("transcoded"));
      return { code: 0, stderr: "" };
    });

    const result = await service.runAudioTranscodeTask({
      audio_ids: audioIds,
      preset: "mp3",
      overwrite: true,
      params_override: {
        vbr_quality: 2,
        sample_rate_hz: 48_000,
        channels: 2,
        metadata_mode: "none",
        metadata_override: {
          album: "demo-album",
        },
      },
    });

    expect(result.success_count).toBe(1);
    const firstArgs = capturedArgs[0] ?? [];
    expect(firstArgs).toContain("-c:a");
    expect(firstArgs).toContain("libmp3lame");
    expect(firstArgs).toContain("-q:a");
    expect(firstArgs).toContain("2");
    expect(firstArgs).toContain("-ar");
    expect(firstArgs).toContain("48000");
    expect(firstArgs).toContain("-ac");
    expect(firstArgs).toContain("2");
    expect(firstArgs).toContain("-metadata");
    expect(firstArgs).toContain("album=demo-album");
    expect(firstArgs).not.toContain("-map_metadata");
  });
});
