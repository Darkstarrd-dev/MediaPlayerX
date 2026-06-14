import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import axios from "axios";

import {
  listVideoSubtitlesResponseSchema,
  prepareSubtitleTrackResponseSchema,
  readAppStateResponseSchema,
  readImageMetadataResponseSchema,
  readImagePageResponseSchema,
  readPlaylistResponseSchema,
  saveVideoCoverResponseSchema,
  writeAppStateResponseSchema,
  writePackageExternalMetadataResponseSchema,
  writePackageGradeResponseSchema,
  writePlaylistResponseSchema,
  type LibrarySnapshotDto,
  type ImagePackageDto,
  type ImageSourceSidebarDto,
  type ListVideoSubtitlesRequestDto,
  type ListVideoSubtitlesResponseDto,
  type MediaLocatorDto,
  type PrepareSubtitleTrackRequestDto,
  type PrepareSubtitleTrackResponseDto,
  type ReadAppStateRequestDto,
  type ReadAppStateResponseDto,
  type ReadImageMetadataRequestDto,
  type ReadImageMetadataResponseDto,
  type ReadImagePageRequestDto,
  type ReadImagePageResponseDto,
  type ReadSourceImagesRequestDto,
  type ReadSourceImagesResponseDto,
  type ReadImageSidebarTreeRequestDto,
  type ReadImageSidebarTreeResponseDto,
  type ReadManageSubtitleCleanupTaskRequestDto,
  type ReadManageSubtitleCleanupTaskResponseDto,
  type RunManageSubtitleCleanupRequestDto,
  type RunManageSubtitleCleanupResponseDto,
  type ReadPlaylistResponseDto,
  type SaveManageSubtitleCleanupRequestDto,
  type SaveManageSubtitleCleanupResponseDto,
  type SaveVideoCoverRequestDto,
  type SaveVideoCoverResponseDto,
  type StartManageSubtitleCleanupRequestDto,
  type StartManageSubtitleCleanupResponseDto,
  type WriteAppStateRequestDto,
  type WriteAppStateResponseDto,
  type WritePackageGradeRequestDto,
  type WritePackageGradeResponseDto,
  type WritePackageMetadataRequestDto,
  type WritePackageMetadataResponseDto,
  type WritePackageExternalMetadataRequestDto,
  type WritePackageExternalMetadataResponseDto,
  type WritePlaylistRequestDto,
  type WritePlaylistResponseDto,
  type WriteVideoMetadataRequestDto,
  type WriteVideoMetadataResponseDto,
  type WriteAudioMetadataRequestDto,
  type WriteAudioMetadataResponseDto,
} from "../../../src/contracts/backend";
import {
  applyPackageMetadataWrite,
  applyVideoMetadataWrite,
  type PersistedVideoMetadataRecord,
} from "../../fileSystemMetadataWriters";
import { filterSources as filterLibrarySources } from "../../fileSystemSourceFilter";
import {
  probeImageDimensionsFromFile,
  runProcess,
} from "../../fileSystemRuntimeHelpers";
import { buildImageSidebarTree } from "../../fileSystemSidebarTree";
import { captureVideoCoverImage } from "../../fileSystemVideoCoverCapture";
import {
  detectMimeTypeByExtension,
  isPathInsideRoot,
  makeStableId,
  normalizeAllowlistKey,
  toAbsoluteTreePath,
  toDeterministicCoverColor,
  toSafeSizeKb,
} from "../../fileSystemServiceHelpers";
import { MediaLibraryDatabase } from "../../mediaLibraryDatabase";
import type { PersistedVideoCoverRecord } from "./librarySnapshotService.types";
import { LibrarySubtitleCleanupTaskService } from "./librarySubtitleCleanupTaskService";
import {
  XP_PREFERENCE_METRICS_STATE_KEY,
  SUBTITLE_EXTENSIONS,
  ensureNotAborted,
  filterHiddenImagesFromSource,
  filterHiddenImagesFromSources,
  isAutoLiveSubtitleFile,
  normalizeExternalMetadataText,
  parseAutoLiveSubtitleLocale,
  parsePreferenceRuntimeCheckpoints,
  parsePersistedPreferenceMetrics,
  resolveCoverFileExtension,
  resolveFallbackCoverColor,
  resolveIsolatedAudioGroup,
} from "./libraryReadWriteServiceHelpers";
import type { RuntimeDependencySnapshot } from "./runtimeDependencyService";
import { detectSubtitleLanguageLabel } from "./subtitleCleanupHelpers";
import {
  convertSrtTextToVtt,
  decodeSubtitleText,
} from "../../subtitles/subtitleSrtVttConverter";

interface LibraryReadWriteServiceOptions {
  database: MediaLibraryDatabase;
  ffmpegBin: string;
  coverOutputRootDir: string;
  rootDir: string;
  packageGradeOverridesBySourceId: Map<string, number | null>;
  videoCoverOverridesByVideoId: Map<string, PersistedVideoCoverRecord>;
  videoMetadataOverridesByVideoId: Map<string, PersistedVideoMetadataRecord>;
  ensureSnapshotLoaded: () => Promise<LibrarySnapshotDto>;
  ensureRuntimeDependencies: () => Promise<RuntimeDependencySnapshot>;
  markInteractiveRead: () => void;
  isRar7zPath: (filePath: string) => boolean;
  queueRar7zNormalization: (
    sourceArchivePath: string,
    priority?: "low" | "high",
  ) => void;
  emitLibraryChanged: (payload: {
    reason: string;
    updated_at_ms: number;
  }) => void;
}

const PREFERENCE_DEBUG_SESSION_HISTORY_LIMIT = 200;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asEventArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function dedupeSessionEventsBySessionId(events: unknown[]): unknown[] {
  const seenSessionIds = new Set<string>();
  const dedupedReversed: unknown[] = [];
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (!event || typeof event !== "object") {
      dedupedReversed.push(event);
      continue;
    }
    const record = event as Record<string, unknown>;
    const sessionIdRaw = record.session_id;
    const sessionId =
      typeof sessionIdRaw === "string" ? sessionIdRaw.trim() : "";
    if (!sessionId) {
      dedupedReversed.push(event);
      continue;
    }
    if (seenSessionIds.has(sessionId)) {
      continue;
    }
    seenSessionIds.add(sessionId);
    dedupedReversed.push(event);
  }
  return dedupedReversed.reverse();
}

function hasObjectKeys(value: unknown): boolean {
  return Boolean(
    value &&
    typeof value === "object" &&
    Object.keys(value as Record<string, unknown>).length > 0,
  );
}

function mergePreferenceMetricsState(
  previousState: unknown,
  incomingState: unknown,
): Record<string, unknown> {
  const previousRecord = asRecord(previousState);
  const incomingRecordRaw = asRecord(incomingState);
  const incomingRecord = { ...incomingRecordRaw };
  delete incomingRecord.image_runtime_checkpoints;
  delete incomingRecord.video_runtime_checkpoints;
  const mergedImageSessions = dedupeSessionEventsBySessionId([
    ...asEventArray(previousRecord.image_session_events),
    ...asEventArray(incomingRecord.image_session_events),
  ]).slice(-PREFERENCE_DEBUG_SESSION_HISTORY_LIMIT);
  const mergedVideoSessions = dedupeSessionEventsBySessionId([
    ...asEventArray(previousRecord.video_session_events),
    ...asEventArray(incomingRecord.video_session_events),
  ]).slice(-PREFERENCE_DEBUG_SESSION_HISTORY_LIMIT);
  const mergedImageMetrics = hasObjectKeys(incomingRecord.image_by_source_id)
    ? incomingRecord.image_by_source_id
    : previousRecord.image_by_source_id;
  const mergedVideoMetrics = hasObjectKeys(incomingRecord.video_by_id)
    ? incomingRecord.video_by_id
    : previousRecord.video_by_id;

  return {
    ...incomingRecord,
    image_by_source_id: mergedImageMetrics,
    video_by_id: mergedVideoMetrics,
    image_session_events: mergedImageSessions,
    video_session_events: mergedVideoSessions,
  };
}

function toSidebarSource(source: ImagePackageDto): ImageSourceSidebarDto {
  const { images, ...rest } = source;
  const cover = images[0] ?? null;
  return {
    ...rest,
    image_count: images.length,
    cover_media_locator: cover ? cover.media_locator : null,
  };
}

export class LibraryReadWriteService {
  private readonly subtitleCleanupTaskService: LibrarySubtitleCleanupTaskService;

  constructor(private readonly options: LibraryReadWriteServiceOptions) {
    this.subtitleCleanupTaskService = new LibrarySubtitleCleanupTaskService({
      database: options.database,
      rootDir: options.rootDir,
      ffmpegBin: options.ffmpegBin,
      ensureRuntimeDependencies: options.ensureRuntimeDependencies,
    });
  }

  private resolveSubtitleCacheOutputPath(subtitleId: string): string {
    const outputDir = path.join(
      this.options.rootDir,
      ".mediaplayerx",
      "subtitle-cache",
    );
    return path.join(outputDir, `${makeStableId("subtitle", subtitleId)}.vtt`);
  }

  private async convertSrtToVtt(
    sourcePath: string,
    subtitleId: string,
  ): Promise<string> {
    const outputPath = this.resolveSubtitleCacheOutputPath(subtitleId);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const rawBuffer = await fs.readFile(sourcePath);
    const rawText = decodeSubtitleText(rawBuffer);
    const vttText = convertSrtTextToVtt(rawText);
    await fs.writeFile(outputPath, vttText, "utf8");
    return outputPath;
  }

  private async convertSubtitleToVttWithFfmpeg(
    sourcePath: string,
    subtitleId: string,
  ): Promise<string> {
    const outputPath = this.resolveSubtitleCacheOutputPath(subtitleId);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const result = await runProcess(
      this.options.ffmpegBin,
      ["-y", "-i", sourcePath, outputPath],
      20_000,
    );
    if (result.code !== 0) {
      throw new Error(result.stderr.trim() || `字幕转换失败: ${sourcePath}`);
    }
    return outputPath;
  }

  async readImageSidebarTree(
    request: ReadImageSidebarTreeRequestDto,
    signal?: AbortSignal,
  ): Promise<ReadImageSidebarTreeResponseDto> {
    this.options.markInteractiveRead();
    ensureNotAborted(signal);
    const snapshot = await this.options.ensureSnapshotLoaded();
    ensureNotAborted(signal);
    const includeHidden = request.include_hidden ?? false;
    const filtered = filterLibrarySources(snapshot, request);
    ensureNotAborted(signal);
    const filteredPackages = filterHiddenImagesFromSources(
      filtered.imagePackages,
      includeHidden,
    );
    const filteredDirectories = filterHiddenImagesFromSources(
      filtered.imageDirectories,
      includeHidden,
    );
    ensureNotAborted(signal);

    return {
      image_packages: filteredPackages.map(toSidebarSource),
      image_directories: filteredDirectories.map(toSidebarSource),
      tree: buildImageSidebarTree(filteredPackages, filteredDirectories),
    };
  }

  async readImagePage(
    request: ReadImagePageRequestDto,
    signal?: AbortSignal,
  ): Promise<ReadImagePageResponseDto> {
    this.options.markInteractiveRead();
    ensureNotAborted(signal);
    const snapshot = await this.options.ensureSnapshotLoaded();
    ensureNotAborted(signal);
    const includeHidden = request.include_hidden ?? false;
    const filtered = filterLibrarySources(snapshot, {
      feature_filter: request.feature_filter,
      grade_overrides: request.grade_overrides,
    });
    ensureNotAborted(signal);

    const allSources = [
      ...filtered.imagePackages,
      ...filtered.imageDirectories,
    ];
    const selectedById = request.source_id
      ? allSources.find((source) => source.id === request.source_id)
      : null;
    const selectedSource =
      selectedById ??
      allSources.find((source) => source.images.length > 0) ??
      allSources[0] ??
      null;
    ensureNotAborted(signal);

    if (
      request.source_id &&
      selectedSource &&
      selectedSource.images.length === 0 &&
      this.options.isRar7zPath(selectedSource.absolute_path)
    ) {
      this.options.queueRar7zNormalization(
        selectedSource.absolute_path,
        "high",
      );
    }

    if (!selectedSource) {
      return readImagePageResponseSchema.parse({
        source_id: null,
        total_items: 0,
        page_index: 0,
        page_size: request.page_size,
        refs: [],
      });
    }

    const selectedSourceVisible = filterHiddenImagesFromSource(
      selectedSource,
      includeHidden,
    );
    ensureNotAborted(signal);
    const totalItems = selectedSourceVisible.images.length;
    const pageSize = request.show_names_only
      ? Math.max(1, totalItems)
      : request.page_size;
    const maxPageIndex = Math.max(0, Math.ceil(totalItems / pageSize) - 1);
    const pageIndex = request.show_names_only
      ? 0
      : Math.min(request.page_index, maxPageIndex);
    const pageStart = pageIndex * pageSize;
    const pageEnd = pageStart + pageSize;

    const refs = selectedSourceVisible.images
      .slice(pageStart, pageEnd)
      .map((_, index) => ({
        package_id: selectedSource.id,
        image_index: pageStart + index,
      }));
    ensureNotAborted(signal);

    return readImagePageResponseSchema.parse({
      source_id: selectedSource.id,
      total_items: totalItems,
      page_index: pageIndex,
      page_size: request.page_size,
      refs,
    });
  }

  async readImageMetadata(
    request: ReadImageMetadataRequestDto,
  ): Promise<ReadImageMetadataResponseDto> {
    this.options.markInteractiveRead();
    const includeHidden = request.include_hidden ?? false;
    const snapshot = await this.options.ensureSnapshotLoaded();
    const allSources = [
      ...snapshot.image_packages,
      ...snapshot.image_directories,
    ];
    const source = allSources.find((item) => item.id === request.package_id);
    const visibleSource = source
      ? filterHiddenImagesFromSource(source, includeHidden)
      : null;
    const image = visibleSource?.images[request.image_index];

    if (
      visibleSource &&
      image &&
      image.media_locator.kind === "filesystem" &&
      image.media_locator.media_type === "image"
    ) {
      if (image.size_kb <= 0) {
        const stat = await fs
          .stat(image.media_locator.absolute_path)
          .catch(() => null);
        if (stat?.isFile()) {
          image.size_kb = toSafeSizeKb(stat.size);
        }
      }

      if (image.width <= 0 || image.height <= 0) {
        const dimensions = await probeImageDimensionsFromFile(
          image.media_locator.absolute_path,
        );
        if (dimensions.width > 0 && dimensions.height > 0) {
          image.width = dimensions.width;
          image.height = dimensions.height;
        }
      }
    }

    return readImageMetadataResponseSchema.parse(
      visibleSource && image
        ? {
            package: visibleSource,
            image,
            grade: visibleSource.mock_grade,
          }
        : null,
    );
  }

  async readSourceImages(
    request: ReadSourceImagesRequestDto,
  ): Promise<ReadSourceImagesResponseDto> {
    this.options.markInteractiveRead();
    const includeHidden = request.include_hidden ?? false;
    const snapshot = await this.options.ensureSnapshotLoaded();
    const allSources = [
      ...snapshot.image_packages,
      ...snapshot.image_directories,
    ];
    const source = allSources.find((item) => item.id === request.source_id);
    const visibleSource = source
      ? filterHiddenImagesFromSource(source, includeHidden)
      : null;
    return {
      source_id: request.source_id,
      images: visibleSource ? visibleSource.images : [],
    };
  }

  async writePackageGrade(
    request: WritePackageGradeRequestDto,
  ): Promise<WritePackageGradeResponseDto> {
    const snapshot = await this.options.ensureSnapshotLoaded();
    const allSources = [
      ...snapshot.image_packages,
      ...snapshot.image_directories,
    ];
    const source = allSources.find((item) => item.id === request.package_id);
    if (!source) {
      throw new Error(`写入评分失败：source 不存在 ${request.package_id}`);
    }

    source.mock_grade = request.grade;
    this.options.packageGradeOverridesBySourceId.set(
      request.package_id,
      request.grade,
    );
    this.options.database.writePackageGrade(request.package_id, request.grade);

    this.options.emitLibraryChanged({
      reason: "write-package-grade",
      updated_at_ms: Date.now(),
    });

    return writePackageGradeResponseSchema.parse({
      package_id: request.package_id,
      grade: request.grade,
      updated_at_ms: Date.now(),
    });
  }

  async writePackageMetadata(
    request: WritePackageMetadataRequestDto,
  ): Promise<WritePackageMetadataResponseDto> {
    const snapshot = await this.options.ensureSnapshotLoaded();
    const response = applyPackageMetadataWrite({
      snapshot,
      database: this.options.database,
      request,
    });

    this.options.emitLibraryChanged({
      reason: "write-package-metadata",
      updated_at_ms: response.updated_at_ms,
    });

    return response;
  }

  async writePackageExternalMetadata(
    request: WritePackageExternalMetadataRequestDto,
  ): Promise<WritePackageExternalMetadataResponseDto> {
    const snapshot = await this.options.ensureSnapshotLoaded();
    const allSources = [
      ...snapshot.image_packages,
      ...snapshot.image_directories,
    ];
    const source = allSources.find((item) => item.id === request.package_id);
    if (!source) {
      throw new Error(
        `写入外部元数据失败：source 不存在 ${request.package_id}`,
      );
    }

    const updatedAtMs = Date.now();
    const externalMetadata = {
      source_site: request.source_site,
      source_url: request.source_url,
      source_remote_id: request.source_remote_id,
      source_token: normalizeExternalMetadataText(request.source_token),
      title: normalizeExternalMetadataText(request.title),
      title_jpn: normalizeExternalMetadataText(request.title_jpn),
      group_name: normalizeExternalMetadataText(request.group_name),
      group_name_jpn: normalizeExternalMetadataText(request.group_name_jpn),
      artist: normalizeExternalMetadataText(request.artist),
      artist_jpn: normalizeExternalMetadataText(request.artist_jpn),
      posted: normalizeExternalMetadataText(request.posted),
      rating: request.rating ?? null,
      favorited: request.favorited ?? null,
      tags: request.tags,
      raw_json: request.raw_json,
    };

    this.options.database.writeSourceExternalMetadata(source.id, {
      sourceSite: externalMetadata.source_site,
      sourceUrl: externalMetadata.source_url,
      sourceRemoteId: externalMetadata.source_remote_id,
      sourceToken: externalMetadata.source_token,
      title: externalMetadata.title,
      titleJpn: externalMetadata.title_jpn,
      groupName: externalMetadata.group_name,
      groupNameJpn: externalMetadata.group_name_jpn,
      artist: externalMetadata.artist,
      artistJpn: externalMetadata.artist_jpn,
      posted: externalMetadata.posted,
      rating: externalMetadata.rating,
      favorited: externalMetadata.favorited,
      tags: externalMetadata.tags,
      rawJson: externalMetadata.raw_json,
    });

    source.external_metadata = externalMetadata;

    let sourceCover = source.source_cover ?? null;
    const thumbUrl = request.thumb_url?.trim() ?? "";
    if (thumbUrl.length > 0) {
      try {
        const extension = resolveCoverFileExtension(thumbUrl);
        const fileHash = createHash("sha1").update(thumbUrl).digest("hex");
        const targetDir = path.join(this.options.coverOutputRootDir, "source");
        const outputPath = path.join(
          targetDir,
          `${source.id}-${fileHash}${extension}`,
        );
        await fs.mkdir(targetDir, { recursive: true });
        const response = await axios.get<ArrayBuffer>(thumbUrl, {
          responseType: "arraybuffer",
          timeout: 12_000,
        });
        await fs.writeFile(outputPath, Buffer.from(response.data));

        const coverColor =
          sourceCover?.cover_color ?? resolveFallbackCoverColor(source.id);
        sourceCover = {
          cover_color: coverColor,
          cover_image_path: outputPath,
          updated_at_ms: updatedAtMs,
        };
        this.options.database.writeSourceCover(
          source.id,
          coverColor,
          outputPath,
        );
      } catch (error) {
        void error;
      }
    }

    source.source_cover = sourceCover;

    this.options.emitLibraryChanged({
      reason: "write-package-external-metadata",
      updated_at_ms: updatedAtMs,
    });

    return writePackageExternalMetadataResponseSchema.parse({
      package: source,
      updated_at_ms: updatedAtMs,
    });
  }

  async writeVideoMetadata(
    request: WriteVideoMetadataRequestDto,
  ): Promise<WriteVideoMetadataResponseDto> {
    const snapshot = await this.options.ensureSnapshotLoaded();
    const { response, persistedRecord } = applyVideoMetadataWrite({
      snapshot,
      database: this.options.database,
      request,
    });

    this.options.videoMetadataOverridesByVideoId.set(
      response.video.id,
      persistedRecord,
    );

    this.options.emitLibraryChanged({
      reason: "write-video-metadata",
      updated_at_ms: response.updated_at_ms,
    });

    return response;
  }

  async writeAudioMetadata(
    request: WriteAudioMetadataRequestDto,
  ): Promise<WriteAudioMetadataResponseDto> {
    const snapshot = await this.options.ensureSnapshotLoaded();
    const audio = snapshot.audios?.find((item) => item.id === request.audio_id);
    if (!audio) {
      throw new Error(`写入音频元数据失败：audio 不存在 ${request.audio_id}`);
    }

    if (typeof request.album !== "undefined") {
      audio.album = request.album.trim();
    }
    if (typeof request.author !== "undefined") {
      audio.author = request.author.trim();
    }
    if (typeof request.track_title !== "undefined") {
      audio.track_title = request.track_title.trim();
    }
    if (typeof request.series_id !== "undefined") {
      audio.series_id = request.series_id.trim();
    }

    const normalizedAudioPath = path.resolve(audio.absolute_path);
    const normalizedAudioPathKey = normalizeAllowlistKey(normalizedAudioPath);
    const musicImportSources = this.options.database.readMusicImportSources();
    const musicFileAllowlistKeys = new Set(
      musicImportSources.files.map((value) =>
        normalizeAllowlistKey(path.resolve(value)),
      ),
    );
    const musicDirectoryRoots = Array.from(
      new Set(
        musicImportSources.directories.map((value) => path.resolve(value)),
      ),
    );
    const isExplicitMusicFile = musicFileAllowlistKeys.has(
      normalizedAudioPathKey,
    );
    const underMusicDirectory = musicDirectoryRoots.some((rootPath) =>
      isPathInsideRoot(rootPath, normalizedAudioPath),
    );
    audio.tree_path =
      isExplicitMusicFile && !underMusicDirectory
        ? [resolveIsolatedAudioGroup(audio.album), audio.file_name]
        : toAbsoluteTreePath(audio.absolute_path);

    const updatedAtMs = Date.now();
    this.options.database.writeAudioMetadata(audio.id, {
      album: audio.album,
      author: audio.author,
      trackTitle: audio.track_title,
      seriesId: audio.series_id,
    });
    this.options.database.writeAudioTreePath(audio.id, audio.tree_path);

    this.options.emitLibraryChanged({
      reason: "write-audio-metadata",
      updated_at_ms: updatedAtMs,
    });

    return {
      audio,
      updated_at_ms: updatedAtMs,
    };
  }

  async saveVideoCover(
    request: SaveVideoCoverRequestDto,
  ): Promise<SaveVideoCoverResponseDto> {
    const snapshot = await this.options.ensureSnapshotLoaded();
    const runtimeDependencies = await this.options.ensureRuntimeDependencies();
    const video = snapshot.videos.find((item) => item.id === request.video_id);
    if (!video) {
      throw new Error(`保存封面失败：video 不存在 ${request.video_id}`);
    }

    const coverImagePath = await captureVideoCoverImage({
      videoPath: video.absolute_path,
      videoId: video.id,
      timeSec: request.time_sec,
      ffmpegBin: this.options.ffmpegBin,
      coverOutputRootDir: this.options.coverOutputRootDir,
      ffmpegAvailable: runtimeDependencies.ffmpeg,
    });
    const coverColor =
      request.fallback_color ??
      video.cover_color ??
      toDeterministicCoverColor(video.id);
    const updatedAtMs = Date.now();

    video.cover_color = coverColor;
    video.cover_image_path = coverImagePath;
    this.options.videoCoverOverridesByVideoId.set(video.id, {
      coverColor,
      coverImagePath,
      updatedAtMs,
    });
    this.options.database.writeVideoCover(video.id, coverColor, coverImagePath);

    this.options.emitLibraryChanged({
      reason: "write-video-cover",
      updated_at_ms: Date.now(),
    });

    return saveVideoCoverResponseSchema.parse({
      video_id: video.id,
      cover_color: coverColor,
      cover_image_path: coverImagePath,
      updated_at_ms: updatedAtMs,
    });
  }

  async readPlaylist(): Promise<ReadPlaylistResponseDto> {
    const videoIds = this.options.database.readPlaylist();
    return readPlaylistResponseSchema.parse({
      video_ids: videoIds,
    });
  }

  async writePlaylist(
    request: WritePlaylistRequestDto,
  ): Promise<WritePlaylistResponseDto> {
    const nextVideoIds = this.options.database.writePlaylist(request.video_ids);

    this.options.emitLibraryChanged({
      reason: "write-playlist",
      updated_at_ms: Date.now(),
    });

    return writePlaylistResponseSchema.parse({
      video_ids: nextVideoIds,
      updated_at_ms: Date.now(),
    });
  }

  async listVideoSubtitles(
    request: ListVideoSubtitlesRequestDto,
  ): Promise<ListVideoSubtitlesResponseDto> {
    this.options.markInteractiveRead();
    const [snapshot, runtimeDependencies] = await Promise.all([
      this.options.ensureSnapshotLoaded(),
      this.options.ensureRuntimeDependencies(),
    ]);
    const video = snapshot.videos.find((item) => item.id === request.video_id);
    if (!video) {
      throw new Error(`读取字幕失败：video 不存在 ${request.video_id}`);
    }

    const videoDir = path.dirname(video.absolute_path);
    const videoStem = path
      .basename(video.absolute_path, path.extname(video.absolute_path))
      .toLowerCase();
    const entries = await fs
      .readdir(videoDir, { withFileTypes: true })
      .catch(() => []);

    const subtitles = entries
      .filter((entry) => entry.isFile())
      .map((entry) => {
        const ext = path.extname(entry.name).toLowerCase();
        if (!SUBTITLE_EXTENSIONS.has(ext)) {
          return null;
        }
        const absolutePath = path.join(videoDir, entry.name);
        const subtitleStem = path.basename(entry.name, ext);
        const languageLabel = detectSubtitleLanguageLabel(
          entry.name,
          videoStem,
        );
        const autoLiveLocale = parseAutoLiveSubtitleLocale(entry.name);
        const label = autoLiveLocale
          ? `自动字幕（已保存，${autoLiveLocale}）`
          : isAutoLiveSubtitleFile(entry.name)
            ? "自动字幕（已保存）"
            : (languageLabel ?? entry.name);
        const format = ext.slice(1) as "vtt" | "srt" | "ass" | "ssa";
        const locator: MediaLocatorDto = {
          kind: "filesystem",
          absolute_path: absolutePath,
          extension: ext,
          media_type: "subtitle",
          mime_type: detectMimeTypeByExtension(ext, "subtitle"),
        };

        return {
          id: makeStableId("subtitle", absolutePath),
          label,
          source: "external" as const,
          format,
          locator,
          score:
            subtitleStem.toLowerCase() === videoStem ||
            subtitleStem.toLowerCase().startsWith(`${videoStem}.`)
              ? 0
              : 1,
        };
      })
      .flatMap((item) => (item !== null && item.score === 0 ? [item] : []))
      .sort(
        (left, right) =>
          left.score - right.score ||
          left.label.localeCompare(right.label, "zh-CN"),
      )
      .map((item) => ({
        id: item.id,
        label: item.label,
        source: item.source,
        format: item.format,
        locator: item.locator,
      }));

    return listVideoSubtitlesResponseSchema.parse({
      subtitles,
      ffmpeg_available: runtimeDependencies.ffmpeg,
    });
  }

  async prepareSubtitleTrack(
    request: PrepareSubtitleTrackRequestDto,
  ): Promise<PrepareSubtitleTrackResponseDto> {
    this.options.markInteractiveRead();
    if (
      request.locator.kind !== "filesystem" ||
      request.locator.media_type !== "subtitle"
    ) {
      throw new Error("字幕准备失败：仅支持文件系统字幕");
    }

    if (request.format === "vtt") {
      return prepareSubtitleTrackResponseSchema.parse({
        locator: request.locator,
        converted: false,
      });
    }

    if (request.format !== "srt") {
      const runtimeDependencies =
        await this.options.ensureRuntimeDependencies();
      if (!runtimeDependencies.ffmpeg) {
        throw new Error("字幕准备失败：ffmpeg 不可用，无法转换为 vtt");
      }
    }

    const outputPath =
      request.format === "srt"
        ? await this.convertSrtToVtt(
            request.locator.absolute_path,
            request.subtitle_id,
          )
        : await this.convertSubtitleToVttWithFfmpeg(
            request.locator.absolute_path,
            request.subtitle_id,
          );
    return prepareSubtitleTrackResponseSchema.parse({
      locator: {
        kind: "filesystem",
        absolute_path: outputPath,
        extension: ".vtt",
        media_type: "subtitle",
        mime_type: "text/vtt",
      },
      converted: true,
    });
  }

  async startManageSubtitleCleanup(
    request: StartManageSubtitleCleanupRequestDto,
  ): Promise<StartManageSubtitleCleanupResponseDto> {
    this.options.markInteractiveRead();
    const snapshot = await this.options.ensureSnapshotLoaded();
    const video = snapshot.videos.find((item) => item.id === request.video_id);
    if (!video) {
      throw new Error(`字幕清洗失败：video 不存在 ${request.video_id}`);
    }
    return this.subtitleCleanupTaskService.startTask(
      video.id,
      video.absolute_path,
    );
  }

  async readManageSubtitleCleanupTask(
    request: ReadManageSubtitleCleanupTaskRequestDto,
  ): Promise<ReadManageSubtitleCleanupTaskResponseDto> {
    return this.subtitleCleanupTaskService.readTask(request);
  }

  async runManageSubtitleCleanup(
    request: RunManageSubtitleCleanupRequestDto,
  ): Promise<RunManageSubtitleCleanupResponseDto> {
    return this.subtitleCleanupTaskService.runTask(request);
  }

  async saveManageSubtitleCleanup(
    request: SaveManageSubtitleCleanupRequestDto,
  ): Promise<SaveManageSubtitleCleanupResponseDto> {
    return await this.subtitleCleanupTaskService.saveTask(request);
  }

  async readAppState(
    request: ReadAppStateRequestDto,
  ): Promise<ReadAppStateResponseDto> {
    this.options.markInteractiveRead();
    const state = this.options.database.readAppState<unknown>(
      request.state_key,
      null,
    );
    return readAppStateResponseSchema.parse({
      state_json:
        state !== null
          ? JSON.stringify(state)
          : (request.fallback_json ?? "null"),
    });
  }

  async writeAppState(
    request: WriteAppStateRequestDto,
  ): Promise<WriteAppStateResponseDto> {
    this.options.markInteractiveRead();
    const incomingState = JSON.parse(request.state_json);
    const parsedState =
      request.state_key === XP_PREFERENCE_METRICS_STATE_KEY
        ? mergePreferenceMetricsState(
            this.options.database.readAppState(request.state_key, {}),
            incomingState,
          )
        : incomingState;
    this.options.database.writeAppState(request.state_key, parsedState);
    const updatedAtMs = Date.now();

    if (request.state_key === XP_PREFERENCE_METRICS_STATE_KEY) {
      const parsedMetrics = parsePersistedPreferenceMetrics(incomingState);
      const runtimeCheckpoints =
        parsePreferenceRuntimeCheckpoints(incomingState);

      for (const checkpoint of runtimeCheckpoints.imageCheckpoints) {
        this.options.database.upsertImagePreferenceRuntime({
          sessionId: checkpoint.sessionId,
          sourceId: checkpoint.sourceId,
          startedAtMs: checkpoint.startedAtMs,
          lastCheckpointMs: checkpoint.lastCheckpointMs,
          checkpointSeq: checkpoint.checkpointSeq,
          pagesRead: checkpoint.pagesRead,
          totalPages: checkpoint.totalPages,
          completionRatio: checkpoint.completionRatio,
          isFullscreen: checkpoint.isFullscreen,
        });
      }

      for (const checkpoint of runtimeCheckpoints.videoCheckpoints) {
        this.options.database.upsertVideoPreferenceRuntime({
          sessionId: checkpoint.sessionId,
          videoId: checkpoint.videoId,
          startedAtMs: checkpoint.startedAtMs,
          lastCheckpointMs: checkpoint.lastCheckpointMs,
          checkpointSeq: checkpoint.checkpointSeq,
          watchSeconds: checkpoint.watchSeconds,
          totalSeconds: checkpoint.totalSeconds,
          completionRatio: checkpoint.completionRatio,
          hadFullscreen: checkpoint.hadFullscreen,
          lastVideoTime: checkpoint.lastVideoTime,
        });
      }

      const shouldUpdatePreferenceMetrics =
        parsedMetrics.imageBySourceId.size > 0 ||
        parsedMetrics.videoById.size > 0 ||
        parsedMetrics.imageSessions.length > 0 ||
        parsedMetrics.videoSessions.length > 0;
      const snapshot = shouldUpdatePreferenceMetrics
        ? await this.options.ensureSnapshotLoaded().catch(() => null)
        : null;

      const sourceById = snapshot
        ? new Map(
            [...snapshot.image_packages, ...snapshot.image_directories].map(
              (source) => [source.id, source],
            ),
          )
        : null;
      const videoById = snapshot
        ? new Map(snapshot.videos.map((video) => [video.id, video]))
        : null;

      for (const session of parsedMetrics.imageSessions) {
        this.options.database.insertImagePreferenceSession({
          sessionId: session.sessionId,
          sourceId: session.sourceId,
          startedAtMs: session.startedAtMs,
          endedAtMs: session.endedAtMs,
          pagesRead: session.pagesRead,
          totalPages: session.totalPages,
          completionRatio: session.completionRatio,
          isFullscreen: session.isFullscreen,
          endReason: session.endReason,
        });
        this.options.database.deleteImagePreferenceRuntime(session.sessionId);
      }

      for (const session of parsedMetrics.videoSessions) {
        this.options.database.insertVideoPreferenceSession({
          sessionId: session.sessionId,
          videoId: session.videoId,
          startedAtMs: session.startedAtMs,
          endedAtMs: session.endedAtMs,
          watchSeconds: session.watchSeconds,
          totalSeconds: session.totalSeconds,
          completionRatio: session.completionRatio,
          hadFullscreen: session.hadFullscreen,
          isNoise: session.isNoise,
          endReason: session.endReason,
        });
        this.options.database.deleteVideoPreferenceRuntime(session.sessionId);
      }

      for (const [sourceId, metric] of parsedMetrics.imageBySourceId) {
        if (!sourceById?.has(sourceId)) continue;
        this.options.database.writeImagePreferenceMetrics(sourceId, {
          eventCount: metric.eventCount,
          pagesRead: metric.pagesRead,
          totalPages: metric.totalPages,
          completionRatio: metric.completionRatio,
          lastEventTimeMs: metric.lastEventTimeMs,
        });

        const source = sourceById?.get(sourceId);
        if (source) {
          source.preference_metrics = {
            event_count: metric.eventCount,
            pages_read: metric.pagesRead,
            total_pages: metric.totalPages,
            completion_ratio: metric.completionRatio,
            last_event_time_ms: metric.lastEventTimeMs,
            updated_at_ms: updatedAtMs,
          };
        }
      }

      for (const [videoId, metric] of parsedMetrics.videoById) {
        this.options.database.writeVideoPreferenceMetrics(videoId, {
          eventCount: metric.eventCount,
          watchSeconds: metric.watchSeconds,
          totalSeconds: metric.totalSeconds,
          completionRatio: metric.completionRatio,
          lastEventTimeMs: metric.lastEventTimeMs,
        });

        const video = videoById?.get(videoId);
        if (video) {
          video.preference_metrics = {
            event_count: metric.eventCount,
            watch_seconds: metric.watchSeconds,
            total_seconds: metric.totalSeconds,
            completion_ratio: metric.completionRatio,
            last_event_time_ms: metric.lastEventTimeMs,
            updated_at_ms: updatedAtMs,
          };
        }
      }

      if (shouldUpdatePreferenceMetrics) {
        this.options.emitLibraryChanged({
          reason: "write-preference-metrics",
          updated_at_ms: updatedAtMs,
        });
      }
    }

    return writeAppStateResponseSchema.parse({
      updated_at_ms: updatedAtMs,
    });
  }
}
