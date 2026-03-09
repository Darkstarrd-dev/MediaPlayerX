import { promises as fs } from "node:fs";
import path from "node:path";

import {
  type ImagePackageDto,
  type LibrarySnapshotDto,
  type StartImageConvertTaskRequestDto,
} from "../../../src/contracts/backend";
import { getSharpModule } from "../../fileSystemRuntimeHelpers";
import {
  isPathAllowlisted,
  type MediaAccessGuardContext,
} from "../../fileSystemMediaAccessGuard";
import { normalizeAllowlistKey } from "../../fileSystemServiceHelpers";
import { writeStoredZipFromEntries } from "../../fileSystemZipStoreWriter";
import {
  isSafeArchiveEntryName,
  readZipEntryContent,
  scanZipCentralEntries,
} from "../../zipArchiveHelpers";
import {
  IMAGE_CONVERT_TARGET_EXTENSION_BY_FORMAT,
  parseSidebarNodeId,
  pathKeyHasPrefix,
  ZIP_IMAGE_ENTRY_EXTENSIONS,
} from "./managementMutationService.helpers";

class ImageConvertCancelledError extends Error {
  constructor() {
    super("image_convert_cancelled");
    this.name = "ImageConvertCancelledError";
  }
}

interface ImageConvertProgressPayload {
  total_count: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  message: string;
}

interface RunImageConvertTaskOptions {
  isCancelled?: () => boolean;
  onProgress?: (payload: ImageConvertProgressPayload) => void;
}

interface RunImageConvertTaskResult {
  total_count: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  first_error_detail: string | null;
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function buildCurveLutFromAnchors(
  shadowX: number,
  midtoneX: number,
  highlightX: number,
  shadowYOffset: number,
  midtoneYOffset: number,
  highlightYOffset: number,
): Uint8ClampedArray {
  const clampedShadowX = clampByte(shadowX);
  const clampedMidtoneX = clampByte(midtoneX);
  const clampedHighlightX = clampByte(highlightX);
  const anchorX = [
    0,
    Math.max(1, Math.min(clampedShadowX, clampedMidtoneX - 2)),
    Math.max(clampedShadowX + 1, Math.min(clampedMidtoneX, clampedHighlightX - 1)),
    Math.max(clampedMidtoneX + 2, Math.min(clampedHighlightX, 254)),
    255,
  ];
  const anchorY = [
    0,
    clampByte(anchorX[1] - shadowYOffset * 0.52),
    clampByte(anchorX[2] - midtoneYOffset * 0.52),
    clampByte(anchorX[3] - highlightYOffset * 0.52),
    255,
  ];
  const slope = new Array<number>(anchorX.length).fill(0);
  slope[0] = (anchorY[1] - anchorY[0]) / (anchorX[1] - anchorX[0]);
  slope[slope.length - 1] =
    (anchorY[anchorY.length - 1] - anchorY[anchorY.length - 2]) /
    (anchorX[anchorX.length - 1] - anchorX[anchorX.length - 2]);
  for (let index = 1; index < slope.length - 1; index += 1) {
    slope[index] =
      (anchorY[index + 1] - anchorY[index - 1]) /
      (anchorX[index + 1] - anchorX[index - 1]);
  }

  const lut = new Uint8ClampedArray(256);
  for (let x = 0; x <= 255; x += 1) {
    let segmentIndex = 0;
    while (segmentIndex < anchorX.length - 2 && x > anchorX[segmentIndex + 1]) {
      segmentIndex += 1;
    }
    const x0 = anchorX[segmentIndex];
    const x1 = anchorX[segmentIndex + 1];
    const y0 = anchorY[segmentIndex];
    const y1 = anchorY[segmentIndex + 1];
    const span = Math.max(1, x1 - x0);
    const t = (x - x0) / span;
    const m0 = slope[segmentIndex];
    const m1 = slope[segmentIndex + 1];
    const h00 = 2 * t * t * t - 3 * t * t + 1;
    const h10 = t * t * t - 2 * t * t + t;
    const h01 = -2 * t * t * t + 3 * t * t;
    const h11 = t * t * t - t * t;
    const y = h00 * y0 + h10 * span * m0 + h01 * y1 + h11 * span * m1;
    lut[x] = clampByte(y);
  }
  return lut;
}

function createImageConvertLut(
  profile: NonNullable<StartImageConvertTaskRequestDto["adjust"]>,
): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256);
  const normalizedContrast = Math.max(-100, Math.min(100, profile.contrast)) / 100;
  const contrastFactor =
    (259 * (normalizedContrast * 255 + 255)) /
    (255 * (259 - normalizedContrast * 255));
  const brightnessOffset =
    (Math.max(-100, Math.min(100, profile.brightness)) / 100) * 255;
  const inputBlack = Math.max(0, Math.min(254, Math.round(profile.level_input_black)));
  const inputWhite = Math.max(
    inputBlack + 1,
    Math.min(255, Math.round(profile.level_input_white)),
  );
  const gamma = Math.max(0.1, Math.min(5, profile.level_gamma));
  const curveShadow = Math.max(-100, Math.min(100, profile.curve_shadow));
  const curveMidtone = Math.max(-100, Math.min(100, profile.curve_midtone));
  const curveHighlight = Math.max(-100, Math.min(100, profile.curve_highlight));
  const curveLut =
    profile.mode === "curve"
      ? buildCurveLutFromAnchors(
        profile.curve_shadow_x,
        profile.curve_midtone_x,
        profile.curve_highlight_x,
        curveShadow,
        curveMidtone,
        curveHighlight,
      )
      : null;

  for (let index = 0; index < 256; index += 1) {
    let value = index;
    if (profile.mode === "basic") {
      value = contrastFactor * (value - 128) + 128 + brightnessOffset;
    }
    if (profile.mode === "levels") {
      const leveled = (value - inputBlack) / (inputWhite - inputBlack);
      const clampedLeveled = Math.max(0, Math.min(1, leveled));
      value = 255 * Math.pow(clampedLeveled, 1 / gamma);
    }
    if (profile.mode === "curve") {
      value = curveLut ? curveLut[clampByte(value)] : value;
    }
    lut[index] = clampByte(value);
  }

  return lut;
}

interface ManagementImageConvertServiceDependencies {
  thumbnailCacheRootDir: string;
  ensureStateLoaded: () => Promise<void>;
  ensureSnapshotLoaded: () => Promise<LibrarySnapshotDto>;
  refreshSnapshotFromFilesystem?: (options?: {
    force?: boolean;
    reason?: string;
  }) => Promise<LibrarySnapshotDto>;
  syncSnapshotFromDatabase: () => LibrarySnapshotDto;
  refreshArchiveIndexesForPaths: (
    archivePaths: Iterable<string>,
  ) => Promise<void>;
  buildMediaAccessContext: () => MediaAccessGuardContext;
  emitLibraryChanged: (payload: {
    reason: string;
    updated_at_ms: number;
  }) => void;
  withArchiveWriteLock: <T>(
    archivePath: string,
    task: () => Promise<T>,
  ) => Promise<T>;
}

export class ManagementImageConvertService {
  constructor(
    private readonly dependencies: ManagementImageConvertServiceDependencies,
  ) {}

  private throwIfImageConvertCancelled(
    isCancelled: (() => boolean) | undefined,
  ): void {
    if (isCancelled?.()) {
      throw new ImageConvertCancelledError();
    }
  }

  private buildImageConvertTempPath(
    targetPath: string,
    suffix: string,
  ): string {
    return `${targetPath}.${Date.now()}.${Math.round(Math.random() * 100_000)}.${suffix}`;
  }

  private async replaceFileContentAtomically(
    sourcePath: string,
    targetPath: string,
    content: Buffer,
  ): Promise<void> {
    const resolvedSourcePath = path.resolve(sourcePath);
    const resolvedTargetPath = path.resolve(targetPath);
    const sourceKey = normalizeAllowlistKey(resolvedSourcePath);
    const targetKey = normalizeAllowlistKey(resolvedTargetPath);
    const tempPath = this.buildImageConvertTempPath(
      resolvedTargetPath,
      "mpx-tmp",
    );

    await fs.mkdir(path.dirname(resolvedTargetPath), { recursive: true });
    await fs.writeFile(tempPath, content);

    if (sourceKey === targetKey) {
      const backupPath = this.buildImageConvertTempPath(
        resolvedSourcePath,
        "mpx-bak",
      );
      await fs.rename(resolvedSourcePath, backupPath);
      let replaced = false;
      try {
        await fs.rename(tempPath, resolvedSourcePath);
        replaced = true;
        await fs.rm(backupPath, { force: true });
      } finally {
        if (!replaced) {
          await fs
            .rename(backupPath, resolvedSourcePath)
            .catch(() => undefined);
        }
        await fs.rm(tempPath, { force: true }).catch(() => undefined);
      }
      return;
    }

    const existingTarget = await fs.stat(resolvedTargetPath).catch(() => null);
    if (existingTarget) {
      await fs.rm(tempPath, { force: true }).catch(() => undefined);
      throw new Error(`destination already exists: ${resolvedTargetPath}`);
    }

    await fs.rename(tempPath, resolvedTargetPath);
    let sourceRemoved = false;
    try {
      await fs.rm(resolvedSourcePath, { force: true });
      sourceRemoved = true;
    } finally {
      if (!sourceRemoved) {
        await fs.rm(resolvedTargetPath, { force: true }).catch(() => undefined);
      }
      await fs.rm(tempPath, { force: true }).catch(() => undefined);
    }
  }

  private async convertImageBuffer(
    sourceBuffer: Buffer,
    request: Pick<
      StartImageConvertTaskRequestDto,
      | "scale_factor"
      | "longest_edge_px"
      | "adjust"
      | "target_format"
      | "quality"
    >,
  ): Promise<Buffer> {
    const sharpModule = await getSharpModule();
    if (!sharpModule?.default) {
      throw new Error("sharp unavailable");
    }

    const sharp = sharpModule.default;
    let pipeline = sharp(sourceBuffer, { failOn: "none" }).rotate();
    const shouldResizeByScale = request.scale_factor < 0.999;
    const shouldResizeByLongestEdge =
      typeof request.longest_edge_px === "number" &&
      Number.isFinite(request.longest_edge_px) &&
      request.longest_edge_px > 0;
    if (shouldResizeByScale || shouldResizeByLongestEdge) {
      const metadata = await pipeline.metadata().catch(() => null);
      const width = Number(metadata?.width);
      const height = Number(metadata?.height);
      if (
        Number.isFinite(width) &&
        Number.isFinite(height) &&
        width > 0 &&
        height > 0
      ) {
        let resizeRatio = Math.max(0.1, Math.min(1, request.scale_factor));
        if (shouldResizeByLongestEdge) {
          const sourceLongestEdge = Math.max(width, height);
          const targetLongestEdge = Math.max(
            1,
            Math.round(request.longest_edge_px ?? sourceLongestEdge),
          );
          resizeRatio = Math.min(1, targetLongestEdge / sourceLongestEdge);
        }
        const targetWidth = Math.max(1, Math.round(width * resizeRatio));
        const targetHeight = Math.max(1, Math.round(height * resizeRatio));
        pipeline = pipeline.resize({
          width: targetWidth,
          height: targetHeight,
          fit: "fill",
        });
      }
    }

    if (request.adjust) {
      const rawPayload = await pipeline
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const { data, info } = rawPayload;
      const lut = createImageConvertLut(request.adjust);
      for (let index = 0; index < data.length; index += info.channels) {
        data[index] = lut[data[index] ?? 0];
        data[index + 1] = lut[data[index + 1] ?? 0];
        data[index + 2] = lut[data[index + 2] ?? 0];
      }
      pipeline = sharp(data, {
        raw: {
          width: info.width,
          height: info.height,
          channels: info.channels,
        },
      });
    }

    if (request.target_format === "webp") {
      return await pipeline.webp({ quality: request.quality }).toBuffer();
    }
    if (request.target_format === "jpeg") {
      return await pipeline.jpeg({ quality: request.quality }).toBuffer();
    }
    if (request.target_format === "png") {
      return await pipeline
        .png({ quality: request.quality, compressionLevel: 9 })
        .toBuffer();
    }
    return await pipeline.avif({ quality: request.quality }).toBuffer();
  }

  private toConvertedEntryName(
    entryName: string,
    targetExtension: string,
  ): string {
    const normalizedEntryName = entryName.replace(/\\/g, "/");
    const dirName = path.posix.dirname(normalizedEntryName);
    const baseName = path.posix.basename(
      normalizedEntryName,
      path.posix.extname(normalizedEntryName),
    );
    const nextName = `${baseName}${targetExtension}`;
    if (!dirName || dirName === ".") {
      return nextName;
    }
    return `${dirName}/${nextName}`;
  }

  private countConvertibleItemsFromSource(source: ImagePackageDto): number {
    const hasArchiveEntries = source.images.some(
      (image) => image.media_locator.kind === "archive-entry",
    );
    if (hasArchiveEntries) {
      return source.images.filter(
        (image) => image.media_locator.kind === "archive-entry",
      ).length;
    }
    return source.images.filter(
      (image) => image.media_locator.kind === "filesystem",
    ).length;
  }

  private collectImageConvertSources(
    normalizedNodeIds: string[],
    snapshot: LibrarySnapshotDto,
  ): {
    selectedSources: ImagePackageDto[];
    failedNodeIds: Array<{ node_id: string; reason: string }>;
  } {
    const sourceByPathKey = new Map<string, ImagePackageDto>();
    const selectedById = new Map<string, ImagePackageDto>();
    const failedNodeIds: Array<{ node_id: string; reason: string }> = [];

    for (const source of [
      ...snapshot.image_packages,
      ...snapshot.image_directories,
    ]) {
      sourceByPathKey.set(source.tree_path.join("/"), source);
    }

    for (const nodeId of normalizedNodeIds) {
      const parsed = parseSidebarNodeId(nodeId);
      if (!parsed) {
        failedNodeIds.push({ node_id: nodeId, reason: "invalid node id" });
        continue;
      }

      const matchedSources = Array.from(sourceByPathKey.entries())
        .filter(([sourcePathKey]) => {
          if (parsed.kind === "folder") {
            return pathKeyHasPrefix(sourcePathKey, parsed.pathKey);
          }
          if (parsed.kind === "package") {
            return sourcePathKey === parsed.pathKey;
          }
          return false;
        })
        .map(([, source]) => source);

      if (matchedSources.length === 0) {
        failedNodeIds.push({ node_id: nodeId, reason: "node not found" });
        continue;
      }

      for (const source of matchedSources) {
        selectedById.set(source.id, source);
      }
    }

    return {
      selectedSources: Array.from(selectedById.values()),
      failedNodeIds,
    };
  }

  private async convertDirectorySource(
    source: ImagePackageDto,
    request: StartImageConvertTaskRequestDto,
    options: RunImageConvertTaskOptions,
    updateProgress: (payload: {
      processedDelta: number;
      successDelta: number;
      failedDelta: number;
      message: string;
    }) => void,
  ): Promise<{ firstError: string | null }> {
    const targetExtension =
      IMAGE_CONVERT_TARGET_EXTENSION_BY_FORMAT[request.target_format];
    const filePaths = Array.from(
      new Set(
        source.images
          .map((image) => image.media_locator)
          .filter(
            (
              locator,
            ): locator is Extract<
              ImagePackageDto["images"][number]["media_locator"],
              { kind: "filesystem" }
            > => locator.kind === "filesystem",
          )
          .map((locator) => path.resolve(locator.absolute_path)),
      ),
    );

    if (filePaths.length === 0) {
      return { firstError: null };
    }

    let firstError: string | null = null;
    const queue = [...filePaths];
    const workerCount = Math.max(
      1,
      Math.min(request.concurrency, queue.length),
    );
    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        while (queue.length > 0) {
          this.throwIfImageConvertCancelled(options.isCancelled);
          const sourcePath = queue.shift();
          if (!sourcePath) {
            return;
          }

          try {
            const sourceBuffer = await fs.readFile(sourcePath);
            const convertedBuffer = await this.convertImageBuffer(
              sourceBuffer,
              request,
            );
            const nextPath = path.resolve(
              path.join(
                path.dirname(sourcePath),
                `${path.basename(sourcePath, path.extname(sourcePath))}${targetExtension}`,
              ),
            );
            await this.replaceFileContentAtomically(
              sourcePath,
              nextPath,
              convertedBuffer,
            );
            updateProgress({
              processedDelta: 1,
              successDelta: 1,
              failedDelta: 0,
              message: `converted ${path.basename(sourcePath)}`,
            });
          } catch (error) {
            if (error instanceof ImageConvertCancelledError) {
              throw error;
            }
            const reason =
              error instanceof Error && error.message
                ? error.message
                : String(error);
            if (!firstError) {
              firstError = reason;
            }
            updateProgress({
              processedDelta: 1,
              successDelta: 0,
              failedDelta: 1,
              message: `failed ${path.basename(sourcePath)}: ${reason}`,
            });
          }
        }
      }),
    );

    return { firstError };
  }

  private async convertZipSource(
    source: ImagePackageDto,
    request: StartImageConvertTaskRequestDto,
    options: RunImageConvertTaskOptions,
    updateProgress: (payload: {
      processedDelta: number;
      successDelta: number;
      failedDelta: number;
      message: string;
    }) => void,
  ): Promise<{ firstError: string | null }> {
    const archivePath = path.resolve(source.absolute_path);
    const targetExtension =
      IMAGE_CONVERT_TARGET_EXTENSION_BY_FORMAT[request.target_format];
    const sourceImageCount = source.images.filter(
      (image) => image.media_locator.kind === "archive-entry",
    ).length;
    if (sourceImageCount <= 0) {
      return { firstError: null };
    }

    try {
      await this.dependencies.withArchiveWriteLock(archivePath, async () => {
        const entries = await scanZipCentralEntries(archivePath);
        const plannedEntryNameSet = new Set<string>();
        const outputEntries: Array<{ entryName: string; content: Buffer }> = [];

        for (const entry of entries) {
          this.throwIfImageConvertCancelled(options.isCancelled);
          const currentEntryName = entry.entryName;
          const ext = path.extname(currentEntryName).toLowerCase();
          const isImageEntry = ZIP_IMAGE_ENTRY_EXTENSIONS.has(ext);

          const nextEntryName = isImageEntry
            ? this.toConvertedEntryName(currentEntryName, targetExtension)
            : currentEntryName;
          if (!isSafeArchiveEntryName(nextEntryName)) {
            throw new Error(`archive entry illegal: ${nextEntryName}`);
          }
          if (plannedEntryNameSet.has(nextEntryName)) {
            throw new Error(
              `archive entry destination already exists: ${nextEntryName}`,
            );
          }
          plannedEntryNameSet.add(nextEntryName);

          const content = await readZipEntryContent(archivePath, entry);
          if (!isImageEntry) {
            outputEntries.push({
              entryName: nextEntryName,
              content,
            });
            continue;
          }

          const converted = await this.convertImageBuffer(content, request);
          outputEntries.push({
            entryName: nextEntryName,
            content: converted,
          });
        }

        const tempPath = this.buildImageConvertTempPath(
          archivePath,
          "mpx-tmp.zip",
        );
        const backupPath = this.buildImageConvertTempPath(
          archivePath,
          "mpx-bak",
        );
        await writeStoredZipFromEntries(tempPath, outputEntries);
        await scanZipCentralEntries(tempPath);

        await fs.rename(archivePath, backupPath);
        let replaced = false;
        try {
          await fs.rename(tempPath, archivePath);
          replaced = true;
          await fs.rm(backupPath, { force: true });
        } finally {
          if (!replaced) {
            await fs.rename(backupPath, archivePath).catch(() => undefined);
          }
          await fs.rm(tempPath, { force: true }).catch(() => undefined);
        }
      });

      updateProgress({
        processedDelta: sourceImageCount,
        successDelta: sourceImageCount,
        failedDelta: 0,
        message: `converted archive ${path.basename(source.absolute_path)}`,
      });
      return { firstError: null };
    } catch (error) {
      if (error instanceof ImageConvertCancelledError) {
        throw error;
      }
      const reason =
        error instanceof Error && error.message ? error.message : String(error);
      updateProgress({
        processedDelta: sourceImageCount,
        successDelta: 0,
        failedDelta: sourceImageCount,
        message: `failed archive ${path.basename(source.absolute_path)}: ${reason}`,
      });
      return { firstError: reason };
    }
  }

  async runImageConvertTask(
    request: StartImageConvertTaskRequestDto,
    options: RunImageConvertTaskOptions = {},
  ): Promise<RunImageConvertTaskResult> {
    await this.dependencies.ensureStateLoaded();
    const snapshot = await this.dependencies.ensureSnapshotLoaded();
    const mediaAccessContext = this.dependencies.buildMediaAccessContext();

    const normalizedNodeIds = Array.from(
      new Set(request.node_ids.map((value) => value.trim()).filter(Boolean)),
    );
    const collected = this.collectImageConvertSources(
      normalizedNodeIds,
      snapshot,
    );
    if (collected.selectedSources.length <= 0) {
      throw new Error("image convert failed: no valid source selected");
    }

    const selectedSources = collected.selectedSources.filter((source) =>
      isPathAllowlisted(path.resolve(source.absolute_path), mediaAccessContext),
    );
    if (selectedSources.length <= 0) {
      throw new Error(
        "image convert failed: selected sources are outside allowlist",
      );
    }

    const blockedCount =
      collected.selectedSources.length - selectedSources.length;
    const blockedItemCount = collected.selectedSources
      .filter(
        (source) => !selectedSources.some((item) => item.id === source.id),
      )
      .reduce(
        (total, source) => total + this.countConvertibleItemsFromSource(source),
        0,
      );
    const selectionErrorCount = collected.failedNodeIds.length;

    const totalCount = selectedSources.reduce(
      (total, source) => total + this.countConvertibleItemsFromSource(source),
      0,
    );
    if (totalCount <= 0) {
      throw new Error(
        "image convert failed: selected source has no convertible image",
      );
    }

    let processedCount = blockedItemCount;
    let successCount = 0;
    let failedCount = blockedItemCount;
    let firstErrorDetail: string | null = null;
    const changedArchivePaths = new Set<string>();

    const emitProgress = (message: string): void => {
      options.onProgress?.({
        total_count: totalCount,
        processed_count: processedCount,
        success_count: successCount,
        failed_count: failedCount,
        message,
      });
    };

    if (selectionErrorCount > 0 || blockedCount > 0) {
      firstErrorDetail = `selection warnings: invalid_nodes=${selectionErrorCount}, blocked_sources=${blockedCount}`;
    }

    emitProgress("starting image convert task");

    for (const source of selectedSources) {
      this.throwIfImageConvertCancelled(options.isCancelled);

      const updateProgress = (payload: {
        processedDelta: number;
        successDelta: number;
        failedDelta: number;
        message: string;
      }): void => {
        processedCount += payload.processedDelta;
        successCount += payload.successDelta;
        failedCount += payload.failedDelta;
        emitProgress(payload.message);
      };

      const shouldUseZipFlow =
        path.extname(source.absolute_path).toLowerCase() === ".zip" ||
        source.images.some(
          (image) => image.media_locator.kind === "archive-entry",
        );
      const next = shouldUseZipFlow
        ? await this.convertZipSource(source, request, options, updateProgress)
        : await this.convertDirectorySource(
            source,
            request,
            options,
            updateProgress,
          );
      if (!firstErrorDetail && next.firstError) {
        firstErrorDetail = next.firstError;
      }
      if (shouldUseZipFlow && !next.firstError) {
        changedArchivePaths.add(path.resolve(source.absolute_path));
      }
    }

    if (successCount > 0) {
      await fs
        .rm(this.dependencies.thumbnailCacheRootDir, {
          recursive: true,
          force: true,
        })
        .catch(() => undefined);
      if (changedArchivePaths.size > 0) {
        await this.dependencies
          .refreshArchiveIndexesForPaths(changedArchivePaths)
          .catch(() => undefined);
      }
      if (this.dependencies.refreshSnapshotFromFilesystem) {
        await this.dependencies.refreshSnapshotFromFilesystem({
          force: true,
          reason: "manage-image-convert",
        });
      } else {
        this.dependencies.syncSnapshotFromDatabase();
      }
      this.dependencies.emitLibraryChanged({
        reason: "manage-image-convert",
        updated_at_ms: Date.now(),
      });
    }

    emitProgress("image convert task finished");
    return {
      total_count: totalCount,
      processed_count: processedCount,
      success_count: successCount,
      failed_count: failedCount,
      first_error_detail: firstErrorDetail,
    };
  }
}
