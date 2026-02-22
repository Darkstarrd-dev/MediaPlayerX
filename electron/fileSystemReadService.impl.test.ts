import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

import { afterEach, describe, expect, it } from "vitest";

import { MEDIA_PROTOCOL_SCHEME } from "./channels";
import { FileSystemMediaReadService } from "./fileSystemReadService";
import {
  enqueueImportAndWait,
  waitForImportTaskDone,
  writeBinary,
  writeStoredZip,
  writeTinyPng,
} from "./fileSystemReadService.test.helpers";

describe("FileSystemMediaReadService", () => {
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

  it("可读取真实目录并保留中文/日文/特殊符号路径", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mpx-fs-service-"));
    createdRoots.push(root);

    await writeBinary(
      path.join(root, "中文目录", "かな!@#", "img_001.jpg"),
      [0xff, 0xd8, 0xff, 0xd9],
    );
    await writeBinary(
      path.join(root, "中文目录", "かな!@#", "img_002.png"),
      [0x89, 0x50, 0x4e, 0x47],
    );
    await writeStoredZip(path.join(root, "压缩_かな_!@#.zip"), [
      { name: "封面/001.jpg", content: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) },
      { name: "封面/002.png", content: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
      { name: "README.txt", content: Buffer.from("zip-entry") },
    ]);
    await writeBinary(
      path.join(root, "损坏_かな_!@#.rar"),
      [0x00, 0x01, 0x02, 0x03],
    );
    await writeBinary(
      path.join(root, "動画_かな.mp4"),
      [0x00, 0x00, 0x00, 0x18],
    );
    await writeBinary(
      path.join(root, "音声_かな.mp3"),
      [0x49, 0x44, 0x33, 0x04],
    );

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-folders", [root]);

    const snapshot = await service.readLibrarySnapshot();
    expect(snapshot.image_directories.length).toBeGreaterThan(0);
    expect(snapshot.image_packages.length).toBeGreaterThanOrEqual(2);
    expect(snapshot.videos.length).toBe(1);
    expect(snapshot.audios).toHaveLength(1);
    expect(snapshot.audios?.[0]?.track_title).toBe("音声_かな");

    const zipPackage = snapshot.image_packages.find((item) =>
      item.absolute_path.endsWith(".zip"),
    );
    expect(zipPackage?.images.length).toBe(2);
    expect(zipPackage?.images.map((item) => item.media_locator.kind)).toEqual([
      "archive-entry",
      "archive-entry",
    ]);

    const sidebar = await service.readImageSidebarTree({
      feature_filter: {
        name_query: "",
        work_title_query: "",
        series_id_query: "",
        circle_query: "",
        author_query: "",
        tags: [],
        grade: null,
      },
      grade_overrides: {},
    });

    const serializedTree = JSON.stringify(sidebar.tree);
    expect(serializedTree).toContain("中文目录");
    expect(serializedTree).toContain("かな!@#");

    const sourceId =
      sidebar.image_packages.find((item) => item.images.length > 0)?.id ??
      sidebar.image_directories.find((item) => item.images.length > 0)?.id;
    expect(sourceId).toBeTruthy();

    const page = await service.readImagePage({
      source_id: sourceId ?? null,
      page_index: 0,
      page_size: 16,
      show_names_only: false,
      feature_filter: {
        name_query: "",
        work_title_query: "",
        series_id_query: "",
        circle_query: "",
        author_query: "",
        tags: [],
        grade: null,
      },
      grade_overrides: {},
    });

    expect(page.refs.length).toBeGreaterThan(0);

    const metadata = await service.readImageMetadata({
      package_id: page.refs[0].package_id,
      image_index: page.refs[0].image_index,
    });

    expect(metadata).not.toBeNull();
  });

  it("媒体访问通道执行根目录白名单并可读取令牌资源", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mpx-media-channel-"));
    createdRoots.push(root);

    const outsideRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-media-outside-"),
    );
    createdRoots.push(outsideRoot);

    const insideImagePath = path.join(root, "inside.jpg");
    const outsideImagePath = path.join(outsideRoot, "outside.jpg");
    await writeBinary(insideImagePath, [0xff, 0xd8, 0xff, 0xd9]);
    await writeBinary(outsideImagePath, [0xff, 0xd8, 0xff, 0xd9]);

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-files", [insideImagePath]);
    await service.readLibrarySnapshot();

    const allowed = await service.resolveMediaResource({
      locator: {
        kind: "filesystem",
        absolute_path: insideImagePath,
        extension: ".jpg",
        media_type: "image",
        mime_type: "image/jpeg",
      },
    });

    expect(
      allowed.resource_url.startsWith(`${MEDIA_PROTOCOL_SCHEME}://resource/`),
    ).toBe(true);
    const token = decodeURIComponent(
      new URL(allowed.resource_url).pathname.replace(/^\//, ""),
    );
    const payload = await service.readMediaResourceByToken(token, null);
    expect(payload.status).toBe(200);
    expect(payload.headers["content-type"]).toBe("image/jpeg");
    expect(payload.body.length).toBeGreaterThan(0);

    await expect(
      service.resolveMediaResource({
        locator: {
          kind: "filesystem",
          absolute_path: outsideImagePath,
          extension: ".jpg",
          media_type: "image",
          mime_type: "image/jpeg",
        },
      }),
    ).rejects.toThrow(/未导入\/未允许|越界/);
  });

  it("压缩包轻扫仅使用 entry name，并可按白名单读取 zip 内图片", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-zip-light-scan-"),
    );
    createdRoots.push(root);

    const zipPath = path.join(root, "gallery.zip");
    await writeStoredZip(zipPath, [
      {
        name: "pages/0001.jpg",
        content: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
      },
      {
        name: "pages/0002.png",
        content: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      },
      { name: "doc/readme.txt", content: Buffer.from("not-image") },
    ]);

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-files", [zipPath]);
    const snapshot = await service.readLibrarySnapshot();
    const packageDto = snapshot.image_packages.find(
      (item) => item.absolute_path === zipPath,
    );

    expect(packageDto).toBeTruthy();
    expect(packageDto?.images.length).toBe(2);
    expect(packageDto?.images[0]?.media_locator.kind).toBe("archive-entry");
    expect(packageDto?.images[0]?.media_locator.entry_name).toBe(
      "pages/0001.jpg",
    );
    expect(packageDto?.images[1]?.media_locator.entry_name).toBe(
      "pages/0002.png",
    );

    const resolved = await service.resolveMediaResource({
      locator: {
        kind: "archive-entry",
        archive_path: zipPath,
        archive_format: "zip",
        entry_name: "pages/0001.jpg",
        extension: ".jpg",
        media_type: "image",
        mime_type: "image/jpeg",
      },
    });

    const token = decodeURIComponent(
      new URL(resolved.resource_url).pathname.replace(/^\//, ""),
    );
    const payload = await service.readMediaResourceByToken(token, null);
    expect(payload.status).toBe(200);
    expect(payload.headers["content-type"]).toBe("image/jpeg");
    expect(payload.body.length).toBeGreaterThan(0);

    await expect(
      service.resolveMediaResource({
        locator: {
          kind: "archive-entry",
          archive_path: zipPath,
          archive_format: "zip",
          entry_name: "../secret.jpg",
          extension: ".jpg",
          media_type: "image",
          mime_type: "image/jpeg",
        },
      }),
    ).rejects.toThrow(/entry 非法|entry 不在白名单/);
  });

  it("服务重启后首次读取 zip entry 可自愈白名单并返回资源", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-zip-restart-allowlist-"),
    );
    createdRoots.push(root);

    const zipPath = path.join(root, "gallery.zip");
    await writeStoredZip(zipPath, [
      { name: "01.webp", content: Buffer.from([0x52, 0x49, 0x46, 0x46]) },
      { name: "02.jpg", content: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) },
    ]);

    const first = new FileSystemMediaReadService(root);
    createdServices.push(first);
    await enqueueImportAndWait(first, "dialog-files", [zipPath]);
    await first.readLibrarySnapshot();

    const restarted = new FileSystemMediaReadService(root);
    createdServices.push(restarted);
    const snapshot = await restarted.readLibrarySnapshot();
    const packageDto = snapshot.image_packages.find(
      (item) => item.absolute_path === zipPath,
    );
    const webpImage = packageDto?.images.find(
      (image) =>
        image.media_locator.kind === "archive-entry" &&
        image.media_locator.entry_name === "01.webp",
    );

    expect(webpImage).toBeTruthy();

    const resolved = await restarted.resolveMediaResource({
      locator: {
        kind: "archive-entry",
        archive_path: zipPath,
        archive_format: "zip",
        entry_name: "01.webp",
        extension: ".webp",
        media_type: "image",
        mime_type: "image/webp",
      },
    });

    expect(resolved.mime_type).toBe("image/webp");

    const token = decodeURIComponent(
      new URL(resolved.resource_url).pathname.replace(/^\//, ""),
    );
    const payload = await restarted.readMediaResourceByToken(token, null);
    expect(payload.status).toBe(200);
    expect(payload.headers["content-type"]).toBe("image/webp");
    expect(payload.body.length).toBeGreaterThan(0);
  });

  it("缩略图请求可生成 Sharp WebP 缓存并复用受控协议返回", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mpx-thumb-cache-"));
    createdRoots.push(root);

    const imagePath = path.join(root, "thumb-source.png");
    await writeTinyPng(imagePath);

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-files", [imagePath]);
    await service.readLibrarySnapshot();

    const resolved = await service.resolveMediaResource({
      locator: {
        kind: "filesystem",
        absolute_path: imagePath,
        extension: ".png",
        media_type: "image",
        mime_type: "image/png",
      },
      preferred_variant: "thumbnail",
      thumbnail: {
        max_edge: 256,
        quality: 82,
      },
    });

    expect(resolved.mime_type).toBe("image/webp");
    const token = decodeURIComponent(
      new URL(resolved.resource_url).pathname.replace(/^\//, ""),
    );
    const payload = await service.readMediaResourceByToken(token, null);
    expect(payload.status).toBe(200);
    expect(payload.headers["content-type"]).toBe("image/webp");
    expect(payload.body.length).toBeGreaterThan(0);

    const thumbnailCacheRoot = path.join(
      root,
      ".mediaplayerx",
      "thumbnail-cache",
    );
    const cachedFiles = await fs.readdir(thumbnailCacheRoot);
    expect(cachedFiles.some((fileName) => fileName.endsWith(".webp"))).toBe(
      true,
    );
  });

  it("全屏重采样请求可生成 WebP 缓存并通过受控协议返回", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-fullscreen-cache-"),
    );
    createdRoots.push(root);

    const imagePath = path.join(root, "fullscreen-source.png");
    await writeTinyPng(imagePath);

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-files", [imagePath]);
    await service.readLibrarySnapshot();

    const resolved = await service.resolveMediaResource({
      locator: {
        kind: "filesystem",
        absolute_path: imagePath,
        extension: ".png",
        media_type: "image",
        mime_type: "image/png",
      },
      preferred_variant: "original",
      fullscreen_resize: {
        target_width: 1280,
        target_height: 720,
        kernel: "lanczos3",
      },
    });

    expect(resolved.mime_type).toBe("image/webp");
    const token = decodeURIComponent(
      new URL(resolved.resource_url).pathname.replace(/^\//, ""),
    );
    const payload = await service.readMediaResourceByToken(token, null);
    expect(payload.status).toBe(200);
    expect(payload.headers["content-type"]).toBe("image/webp");
    expect(payload.body.length).toBeGreaterThan(0);

    const thumbnailCacheRoot = path.join(
      root,
      ".mediaplayerx",
      "thumbnail-cache",
    );
    const cachedFiles = await fs.readdir(thumbnailCacheRoot);
    expect(cachedFiles.some((fileName) => fileName.endsWith(".webp"))).toBe(
      true,
    );
  });

  it("可输出运行时依赖预检与最小可用矩阵", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mpx-runtime-cap-"));
    createdRoots.push(root);

    await writeTinyPng(path.join(root, "sample.png"));

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);

    const capabilities = await service.readRuntimeCapabilities();
    expect(typeof capabilities.dependencies.sharp).toBe("boolean");
    expect(typeof capabilities.dependencies.ffmpeg).toBe("boolean");
    expect(typeof capabilities.dependencies.ffprobe).toBe("boolean");
    expect(typeof capabilities.dependencies.seven_zip).toBe("boolean");
    expect(typeof capabilities.dependencies.powershell).toBe("boolean");
    expect(capabilities.minimum_matrix.length).toBeGreaterThan(0);
    expect(
      capabilities.minimum_matrix.some((item) =>
        item.capability.includes("rar/7z"),
      ),
    ).toBe(true);
  });

  it("写链路可持久化评分与封面，失败时由调用端回滚", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mpx-write-chain-"));
    createdRoots.push(root);

    await writeBinary(
      path.join(root, "pkg", "img_001.jpg"),
      [0xff, 0xd8, 0xff, 0xd9],
    );
    await writeBinary(path.join(root, "video.mp4"), [0x00, 0x00, 0x00, 0x18]);

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-folders", [root]);
    const snapshot = await service.readLibrarySnapshot();
    const source = snapshot.image_directories[0];
    const video = snapshot.videos[0];

    expect(source).toBeTruthy();
    expect(video).toBeTruthy();
    if (!source || !video) {
      throw new Error("snapshot missing source/video");
    }

    const grade = await service.writePackageGrade({
      package_id: source.id,
      grade: 5,
    });
    expect(grade.grade).toBe(5);

    const cover = await service.saveVideoCover({
      video_id: video.id,
      time_sec: 0.3,
      fallback_color: "hsl(210, 44%, 40%)",
    });
    expect(cover.cover_color).toBe("hsl(210, 44%, 40%)");

    const videoMetadata = await service.writeVideoMetadata({
      video_id: video.id,
      work_title: "视频新标题",
      circle: "视频新社团",
      author: "视频新作者",
      tags: ["tag-a", "tag-b", "tag-a"],
      grade: 4,
    });
    expect(videoMetadata.video.work_title).toBe("视频新标题");
    expect(videoMetadata.video.circle).toBe("视频新社团");
    expect(videoMetadata.video.author).toBe("视频新作者");
    expect(videoMetadata.video.tags).toEqual(["tag-a", "tag-b"]);
    expect(videoMetadata.video.grade).toBe(4);

    const refreshed = await service.readLibrarySnapshot();
    expect(refreshed.image_directories[0]?.mock_grade).toBe(5);
    expect(refreshed.videos[0]?.cover_color).toBe("hsl(210, 44%, 40%)");
    expect(refreshed.videos[0]?.work_title).toBe("视频新标题");
    expect(refreshed.videos[0]?.circle).toBe("视频新社团");
    expect(refreshed.videos[0]?.author).toBe("视频新作者");
    expect(refreshed.videos[0]?.tags).toEqual(["tag-a", "tag-b"]);
    expect(refreshed.videos[0]?.grade).toBe(4);
  });

  it("视频元数据支持同步文件名到作品名并持久化", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-video-meta-sync-"),
    );
    createdRoots.push(root);

    await writeBinary(path.join(root, "clip_a.mp4"), [0x00, 0x00, 0x00, 0x18]);

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-files", [
      path.join(root, "clip_a.mp4"),
    ]);

    const snapshot = await service.readLibrarySnapshot();
    const video = snapshot.videos[0];
    expect(video).toBeTruthy();
    if (!video) {
      throw new Error("video not found");
    }

    const updated = await service.writeVideoMetadata({
      video_id: video.id,
      work_title: "临时标题",
      circle: "同步社团",
      author: "同步作者",
      tags: ["sync-tag"],
      sync_file_name_to_work_title: true,
    });

    expect(updated.video.work_title).toBe("clip_a");
    expect(updated.video.circle).toBe("同步社团");
    expect(updated.video.author).toBe("同步作者");
    expect(updated.video.tags).toEqual(["sync-tag"]);

    service.invalidateCache();
    const refreshed = await service.readLibrarySnapshot();
    expect(refreshed.videos[0]?.work_title).toBe("clip_a");
    expect(refreshed.videos[0]?.circle).toBe("同步社团");
    expect(refreshed.videos[0]?.author).toBe("同步作者");
    expect(refreshed.videos[0]?.tags).toEqual(["sync-tag"]);
  });

  it("写链路可写入图包元数据并按作品名同步图包名后缀", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mpx-write-meta-"));
    createdRoots.push(root);

    const zipPath = path.join(root, "meta_pkg.zip");
    await writeStoredZip(zipPath, [
      { name: "001.jpg", content: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) },
    ]);

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-files", [zipPath]);

    const snapshot = await service.readLibrarySnapshot();
    const source = snapshot.image_packages.find(
      (item) => item.absolute_path === zipPath,
    );
    expect(source).toBeTruthy();
    if (!source) {
      throw new Error("snapshot missing zip source");
    }

    const updated = await service.writePackageMetadata({
      package_id: source.id,
      work_title: "新的作品名",
      circle: "新社团",
      author: "新作者",
      tags: ["tag-A", "tag-B", "tag-A"],
      sync_work_title_to_package_name: true,
    });

    expect(updated.package.work_title).toBe("新的作品名");
    expect(updated.package.circle).toBe("新社团");
    expect(updated.package.author).toBe("新作者");
    expect(updated.package.tags).toEqual(["tag-A", "tag-B"]);
    expect(updated.package.package_name).toBe("新的作品名.zip");
    expect(updated.package.display_name).toBe("新的作品名");

    service.invalidateCache();
    const refreshed = await service.readLibrarySnapshot();
    const refreshedSource = refreshed.image_packages.find(
      (item) => item.id === source.id,
    );
    expect(refreshedSource?.work_title).toBe("新的作品名");
    expect(refreshedSource?.package_name).toBe("新的作品名.zip");
    expect(refreshedSource?.display_name).toBe("新的作品名");
  });

  it("播放列表写入后可在服务重启后恢复", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mpx-playlist-"));
    createdRoots.push(root);

    await writeBinary(path.join(root, "video-a.mp4"), [0x00, 0x00, 0x00, 0x18]);
    await writeBinary(path.join(root, "video-b.mp4"), [0x00, 0x00, 0x00, 0x18]);

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-folders", [root]);
    const snapshot = await service.readLibrarySnapshot();
    const targetVideoIds = snapshot.videos.slice(0, 2).map((video) => video.id);

    expect(targetVideoIds.length).toBe(2);
    await service.writePlaylist({ video_ids: targetVideoIds });

    service.dispose();

    const restarted = new FileSystemMediaReadService(root);
    createdServices.push(restarted);
    await restarted.readLibrarySnapshot();
    const restored = await restarted.readPlaylist();

    expect(restored.video_ids).toEqual(targetVideoIds);
  });

  it("读取快照时会自动清理磁盘已删除的 source/video 并广播变更", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-auto-prune-missing-"),
    );
    createdRoots.push(root);

    const imageDirectory = path.join(root, "gallery");
    const videoPath = path.join(root, "clip.mp4");
    await writeBinary(
      path.join(imageDirectory, "a.jpg"),
      [0xff, 0xd8, 0xff, 0xd9],
    );
    await writeBinary(videoPath, [0x00, 0x00, 0x00, 0x18]);

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-folders", [root]);

    const before = await service.readLibrarySnapshot();
    expect(before.image_directories.length).toBeGreaterThan(0);
    expect(before.videos.length).toBeGreaterThan(0);

    const eventPayloads: Array<{ reason: string; updated_at_ms: number }> = [];
    const unsubscribe = service.onLibraryChanged((payload) => {
      eventPayloads.push(payload);
    });

    await fs.rm(imageDirectory, { recursive: true, force: true });
    await fs.rm(videoPath, { force: true });

    const after = await service.readLibrarySnapshot();
    unsubscribe();

    expect(after.image_directories).toHaveLength(0);
    expect(after.videos).toHaveLength(0);
    expect(
      eventPayloads.some(
        (payload) => payload.reason === "auto-prune-missing-sources",
      ),
    ).toBe(true);
  });

  it("导入任务以纯引用登记库外文件并完成刷新", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mpx-import-root-"));
    const outsideRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-import-source-"),
    );
    createdRoots.push(root);
    createdRoots.push(outsideRoot);

    const outsideImagePath = path.join(outsideRoot, "incoming", "scene.jpg");
    await writeBinary(outsideImagePath, [0xff, 0xd8, 0xff, 0xd9]);

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);

    const before = await service.readLibrarySnapshot();
    const beforeImageCount = [
      ...before.image_packages,
      ...before.image_directories,
    ].reduce((sum, source) => sum + source.images.length, 0);
    expect(beforeImageCount).toBe(0);

    const queued = await service.enqueueImportTask({
      source: "dialog-files",
      paths: [outsideImagePath],
    });
    expect(["pending", "running", "completed"]).toContain(queued.task.status);

    const doneTask = await waitForImportTaskDone(service, queued.task.task_id);
    expect(doneTask.status).toBe("completed");
    expect(doneTask.processed_count).toBe(1);

    const importedDirectory = path.join(root, "imports", "files");
    const importedDirectoryStat = await fs
      .stat(importedDirectory)
      .catch(() => null);
    expect(importedDirectoryStat).toBeNull();

    const after = await service.readLibrarySnapshot();
    const afterImageCount = [
      ...after.image_packages,
      ...after.image_directories,
    ].reduce((sum, source) => sum + source.images.length, 0);
    expect(afterImageCount).toBeGreaterThan(beforeImageCount);

    const importedByReference = [
      ...after.image_packages,
      ...after.image_directories,
    ]
      .flatMap((source) => source.images)
      .some(
        (image) =>
          image.media_locator.kind === "filesystem" &&
          image.media_locator.absolute_path === outsideImagePath,
      );
    expect(importedByReference).toBe(true);
  });

  it("重复导入已登记文件夹时会重新扫描并纳入新增文件", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-import-folder-reimport-root-"),
    );
    const outsideRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-import-folder-reimport-source-"),
    );
    createdRoots.push(root);
    createdRoots.push(outsideRoot);

    const outsideFolderPath = path.join(outsideRoot, "incoming-gallery");
    const firstImagePath = path.join(outsideFolderPath, "scene-1.jpg");
    const secondImagePath = path.join(outsideFolderPath, "scene-2.jpg");
    await writeBinary(firstImagePath, [0xff, 0xd8, 0xff, 0xd9]);

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);

    await enqueueImportAndWait(service, "dialog-folders", [outsideFolderPath]);

    const firstSnapshot = await service.readLibrarySnapshot();
    const importedImageCountAfterFirstImport = [
      ...firstSnapshot.image_packages,
      ...firstSnapshot.image_directories,
    ]
      .flatMap((source) => source.images)
      .filter(
        (image) =>
          image.media_locator.kind === "filesystem" &&
          path
            .resolve(image.media_locator.absolute_path)
            .startsWith(path.resolve(outsideFolderPath)),
      ).length;
    expect(importedImageCountAfterFirstImport).toBe(1);

    await writeBinary(secondImagePath, [0xff, 0xd8, 0xff, 0xd9]);

    await enqueueImportAndWait(service, "dialog-folders", [outsideFolderPath]);

    const secondSnapshot = await service.readLibrarySnapshot();
    const importedImageCountAfterSecondImport = [
      ...secondSnapshot.image_packages,
      ...secondSnapshot.image_directories,
    ]
      .flatMap((source) => source.images)
      .filter(
        (image) =>
          image.media_locator.kind === "filesystem" &&
          path
            .resolve(image.media_locator.absolute_path)
            .startsWith(path.resolve(outsideFolderPath)),
      ).length;
    expect(importedImageCountAfterSecondImport).toBe(2);
  });

  it("音乐导入仅支持音频文件，非音频任务会失败", async () => {
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
    expect(finalTask?.error_detail).toContain("音乐导入仅支持音频文件");

    const snapshot = await service.readLibrarySnapshot();
    expect(snapshot.audios ?? []).toHaveLength(0);
  });

  it("音乐文件导入会写入 music_import_sources，并将孤立文件按专辑或 unknown artist 分组", async () => {
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
  });

  it("音乐文件夹含音频与图片时，图片目录统一归入 CD Booklet 树根", async () => {
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
        path.resolve(source.absolute_path).startsWith(path.resolve(albumRoot)),
    );
    expect(imageSourcesInAlbumRoot.length).toBeGreaterThan(0);
    expect(
      imageSourcesInAlbumRoot.every(
        (source) => source.tree_path[0] === "CD Booklet",
      ),
    ).toBe(true);

    const importedAudio = snapshot.audios?.find(
      (audio) => path.resolve(audio.absolute_path) === path.resolve(trackPath),
    );
    expect(importedAudio).toBeTruthy();
  });

  it("磁盘文件缺失触发自动清理时会同步移除 music_import_sources", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-import-music-prune-"),
    );
    const outsideRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-import-music-prune-source-"),
    );
    createdRoots.push(root);
    createdRoots.push(outsideRoot);

    const outsideAudioPath = path.join(outsideRoot, "incoming", "to-prune.mp3");
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
  });

  it("管理删除图片文件后会返回正确 deleted_count 并刷新快照", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-manage-delete-image-"),
    );
    createdRoots.push(root);

    const imagePathA = path.join(root, "gallery", "a.jpg");
    const imagePathB = path.join(root, "gallery", "b.jpg");
    await writeBinary(imagePathA, [0xff, 0xd8, 0xff, 0xd9]);
    await writeBinary(imagePathB, [0xff, 0xd8, 0xff, 0xd9]);

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-folders", [root]);

    const sidebar = await service.readImageSidebarTree({
      feature_filter: {
        name_query: "",
        work_title_query: "",
        series_id_query: "",
        circle_query: "",
        author_query: "",
        tags: [],
        grade: null,
      },
      grade_overrides: {},
    });

    const source = sidebar.image_directories.find(
      (item) =>
        path.resolve(item.absolute_path) ===
        path.resolve(path.join(root, "gallery")),
    );
    expect(source).toBeTruthy();
    if (!source) {
      throw new Error("source not found");
    }
    const firstImage = source.images[0];
    expect(firstImage?.media_locator.kind).toBe("filesystem");
    if (!firstImage || firstImage.media_locator.kind !== "filesystem") {
      throw new Error("image locator not found");
    }

    const result = await service.deleteImageItems({
      image_ids: [firstImage.id],
    });
    expect(result.deleted_count).toBe(1);
    expect(result.failed).toHaveLength(0);

    const removedStat = await fs
      .stat(firstImage.media_locator.absolute_path)
      .catch(() => null);
    expect(removedStat).toBeNull();

    const snapshotAfter = await service.readLibrarySnapshot();
    const idStillExists = [
      ...snapshotAfter.image_packages,
      ...snapshotAfter.image_directories,
    ]
      .flatMap((item) => item.images)
      .some((image) => image.id === firstImage.id);
    expect(idStillExists).toBe(false);
  });

  it("管理删除图片部分失败时返回 deleted_count 与 failed[] 明细", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-manage-delete-image-partial-"),
    );
    createdRoots.push(root);

    const imagePathA = path.join(root, "gallery", "a.jpg");
    await writeBinary(imagePathA, [0xff, 0xd8, 0xff, 0xd9]);

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-folders", [root]);

    const snapshotBefore = await service.readLibrarySnapshot();
    const source = snapshotBefore.image_directories.find(
      (item) =>
        path.resolve(item.absolute_path) ===
        path.resolve(path.join(root, "gallery")),
    );
    expect(source).toBeTruthy();
    if (!source) {
      throw new Error("source not found");
    }

    const targetImage = source.images[0];
    expect(targetImage).toBeTruthy();
    if (!targetImage) {
      throw new Error("target image not found");
    }

    const missingImageId = "missing-image-id";
    const result = await service.deleteImageItems({
      image_ids: [targetImage.id, missingImageId],
    });

    expect(result.deleted_count).toBe(1);
    expect(result.failed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          image_id: missingImageId,
          reason: "image not found",
        }),
      ]),
    );

    const removedStat = await fs.stat(imagePathA).catch(() => null);
    expect(removedStat).toBeNull();
  });

  it("管理删除 Sidebar 文件夹节点不会抛 isPathInsideRoot 异常并移除节点", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-manage-delete-folder-"),
    );
    createdRoots.push(root);

    const folderPath = path.join(root, "to-delete");
    await writeBinary(
      path.join(folderPath, "img_01.jpg"),
      [0xff, 0xd8, 0xff, 0xd9],
    );

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-folders", [root]);

    const sidebarBefore = await service.readImageSidebarTree({
      feature_filter: {
        name_query: "",
        work_title_query: "",
        series_id_query: "",
        circle_query: "",
        author_query: "",
        tags: [],
        grade: null,
      },
      grade_overrides: {},
    });

    const targetSource = sidebarBefore.image_directories.find(
      (item) => path.resolve(item.absolute_path) === path.resolve(folderPath),
    );
    expect(targetSource).toBeTruthy();
    if (!targetSource) {
      throw new Error("target source not found");
    }

    const targetNodeId = `folder:${targetSource.tree_path.join("/")}`;
    const result = await service.deleteSidebarNodes({
      node_ids: [targetNodeId],
    });
    expect(result.failed).toHaveLength(0);
    expect(result.deleted_count).toBeGreaterThan(0);

    const folderStat = await fs.stat(folderPath).catch(() => null);
    expect(folderStat).toBeNull();

    const sidebarAfter = await service.readImageSidebarTree({
      feature_filter: {
        name_query: "",
        work_title_query: "",
        series_id_query: "",
        circle_query: "",
        author_query: "",
        tags: [],
        grade: null,
      },
      grade_overrides: {},
    });
    const nodeStillExists = sidebarAfter.image_directories.some(
      (item) => path.resolve(item.absolute_path) === path.resolve(folderPath),
    );
    expect(nodeStillExists).toBe(false);
  });

  it("管理删除 Sidebar 节点在仅移除模式下只移除数据库记录且保留物理文件", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-manage-remove-only-folder-"),
    );
    createdRoots.push(root);

    const folderPath = path.join(root, "remove-only");
    const imagePath = path.join(folderPath, "img_01.jpg");
    await writeBinary(imagePath, [0xff, 0xd8, 0xff, 0xd9]);

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-folders", [root]);

    const sidebarBefore = await service.readImageSidebarTree({
      feature_filter: {
        name_query: "",
        work_title_query: "",
        series_id_query: "",
        circle_query: "",
        author_query: "",
        tags: [],
        grade: null,
      },
      grade_overrides: {},
    });

    const targetSource = sidebarBefore.image_directories.find(
      (item) => path.resolve(item.absolute_path) === path.resolve(folderPath),
    );
    expect(targetSource).toBeTruthy();
    if (!targetSource) {
      throw new Error("target source not found");
    }

    const targetNodeId = `folder:${targetSource.tree_path.join("/")}`;
    const result = await service.deleteSidebarNodes({
      node_ids: [targetNodeId],
      delete_files: false,
    });

    expect(result.failed).toHaveLength(0);
    expect(result.deleted_count).toBeGreaterThan(0);

    const folderStat = await fs.stat(folderPath).catch(() => null);
    const imageStat = await fs.stat(imagePath).catch(() => null);
    expect(folderStat?.isDirectory()).toBe(true);
    expect(imageStat?.isFile()).toBe(true);

    const sidebarAfter = await service.readImageSidebarTree({
      feature_filter: {
        name_query: "",
        work_title_query: "",
        series_id_query: "",
        circle_query: "",
        author_query: "",
        tags: [],
        grade: null,
      },
      grade_overrides: {},
    });
    const nodeStillExists = sidebarAfter.image_directories.some(
      (item) => path.resolve(item.absolute_path) === path.resolve(folderPath),
    );
    expect(nodeStillExists).toBe(false);
  });

  it("管理删除 Sidebar 节点部分失败时返回 deleted_count 与 failed[] 明细", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-manage-delete-sidebar-partial-"),
    );
    createdRoots.push(root);

    const folderPath = path.join(root, "to-delete");
    await writeBinary(
      path.join(folderPath, "img_01.jpg"),
      [0xff, 0xd8, 0xff, 0xd9],
    );

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-folders", [root]);

    const sidebarBefore = await service.readImageSidebarTree({
      feature_filter: {
        name_query: "",
        work_title_query: "",
        series_id_query: "",
        circle_query: "",
        author_query: "",
        tags: [],
        grade: null,
      },
      grade_overrides: {},
    });

    const targetSource = sidebarBefore.image_directories.find(
      (item) => path.resolve(item.absolute_path) === path.resolve(folderPath),
    );
    expect(targetSource).toBeTruthy();
    if (!targetSource) {
      throw new Error("target source not found");
    }

    const targetNodeId = `folder:${targetSource.tree_path.join("/")}`;
    const missingNodeId = "package:missing/path";
    const result = await service.deleteSidebarNodes({
      node_ids: [targetNodeId, missingNodeId],
    });

    expect(result.deleted_count).toBeGreaterThanOrEqual(1);
    expect(result.failed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node_id: missingNodeId,
          reason: "node not found",
        }),
      ]),
    );

    const folderStat = await fs.stat(folderPath).catch(() => null);
    expect(folderStat).toBeNull();
  });

  it("管理删除压缩包中的图片后会刷新 zip 条目白名单并保留剩余条目可读", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-manage-delete-zip-entry-"),
    );
    createdRoots.push(root);

    const zipPath = path.join(root, "gallery.zip");
    await writeStoredZip(zipPath, [
      { name: "a/001.jpg", content: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) },
      { name: "a/002.jpg", content: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) },
      { name: "docs/readme.txt", content: Buffer.from("hello") },
    ]);

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-files", [zipPath]);

    const snapshotBefore = await service.readLibrarySnapshot();
    const sourceBefore = snapshotBefore.image_packages.find(
      (item) => path.resolve(item.absolute_path) === path.resolve(zipPath),
    );
    expect(sourceBefore).toBeTruthy();
    if (!sourceBefore) {
      throw new Error("zip source not found");
    }
    expect(sourceBefore.images.length).toBeGreaterThanOrEqual(2);
    const deletedImage = sourceBefore.images[0];
    const remainingImage = sourceBefore.images[1];
    expect(deletedImage?.media_locator.kind).toBe("archive-entry");
    expect(remainingImage?.media_locator.kind).toBe("archive-entry");
    if (
      !deletedImage ||
      !remainingImage ||
      deletedImage.media_locator.kind !== "archive-entry" ||
      remainingImage.media_locator.kind !== "archive-entry"
    ) {
      throw new Error("zip image locators not found");
    }

    const deleteResult = await service.deleteImageItems({
      image_ids: [deletedImage.id],
    });
    expect(deleteResult.deleted_count).toBe(1);
    expect(deleteResult.failed).toHaveLength(0);

    const snapshotAfter = await service.readLibrarySnapshot();
    const sourceAfter = snapshotAfter.image_packages.find(
      (item) => path.resolve(item.absolute_path) === path.resolve(zipPath),
    );
    expect(sourceAfter).toBeTruthy();
    if (!sourceAfter) {
      throw new Error("zip source not found after delete");
    }
    expect(sourceAfter.images.some((item) => item.id === deletedImage.id)).toBe(
      false,
    );
    expect(
      sourceAfter.images.some((item) => item.id === remainingImage.id),
    ).toBe(true);

    const remainingResolved = await service.resolveMediaResource({
      locator: remainingImage.media_locator,
    });
    expect(
      remainingResolved.resource_url.startsWith(`${MEDIA_PROTOCOL_SCHEME}://`),
    ).toBe(true);

    await expect(
      service.resolveMediaResource({
        locator: deletedImage.media_locator,
      }),
    ).rejects.toThrow(/entry 不在白名单|allowlist/i);
  });

  it("管理删除 Sidebar 压缩包和视频节点后快照同步移除并物理删除文件", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-manage-delete-zip-video-"),
    );
    createdRoots.push(root);

    const zipPath = path.join(root, "drop.zip");
    const videoPath = path.join(root, "drop.mp4");
    await writeStoredZip(zipPath, [
      { name: "001.jpg", content: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) },
    ]);
    await writeBinary(videoPath, [0x00, 0x00, 0x00, 0x18]);

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-files", [zipPath, videoPath]);

    const snapshotBefore = await service.readLibrarySnapshot();
    const zipSource = snapshotBefore.image_packages.find(
      (item) => path.resolve(item.absolute_path) === path.resolve(zipPath),
    );
    const videoSource = snapshotBefore.videos.find(
      (item) => path.resolve(item.absolute_path) === path.resolve(videoPath),
    );
    expect(zipSource).toBeTruthy();
    expect(videoSource).toBeTruthy();
    if (!zipSource || !videoSource) {
      throw new Error("zip/video sources not found before delete");
    }

    const deleteResult = await service.deleteSidebarNodes({
      node_ids: [
        `package:${zipSource.tree_path.join("/")}`,
        `video:${videoSource.tree_path.join("/")}`,
      ],
    });
    expect(deleteResult.failed).toHaveLength(0);
    expect(deleteResult.deleted_count).toBeGreaterThanOrEqual(2);

    const zipStat = await fs.stat(zipPath).catch(() => null);
    const videoStat = await fs.stat(videoPath).catch(() => null);
    expect(zipStat).toBeNull();
    expect(videoStat).toBeNull();

    const snapshotAfter = await service.readLibrarySnapshot();
    expect(
      snapshotAfter.image_packages.some(
        (item) => path.resolve(item.absolute_path) === path.resolve(zipPath),
      ),
    ).toBe(false);
    expect(
      snapshotAfter.videos.some(
        (item) => path.resolve(item.absolute_path) === path.resolve(videoPath),
      ),
    ).toBe(false);
  });

  it("resolveMediaResource 输出审计统计（拒绝分类、token 命中/过期）", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mpx-audit-"));
    createdRoots.push(root);

    const imagePath = path.join(root, "inside.jpg");
    await writeBinary(imagePath, [0xff, 0xd8, 0xff, 0xd9]);
    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-files", [imagePath]);
    await service.readLibrarySnapshot();

    const allowed = await service.resolveMediaResource({
      locator: {
        kind: "filesystem",
        absolute_path: imagePath,
        extension: ".jpg",
        media_type: "image",
        mime_type: "image/jpeg",
      },
    });
    const token = decodeURIComponent(
      new URL(allowed.resource_url).pathname.replace(/^\//, ""),
    );
    await service.readMediaResourceByToken(token, null);

    await expect(
      service.resolveMediaResource({
        locator: {
          kind: "filesystem",
          absolute_path: path.join(root, "..", "outside.jpg"),
          extension: ".jpg",
          media_type: "image",
          mime_type: "image/jpeg",
        },
      }),
    ).rejects.toThrow(/未导入\/未允许|越界/);

    const audit = await service.readMediaAccessAudit();
    expect(audit.resolve_requests).toBeGreaterThanOrEqual(2);
    expect(audit.resolve_granted).toBeGreaterThanOrEqual(1);
    expect(
      audit.resolve_denied_by_reason.path_outside_root,
    ).toBeGreaterThanOrEqual(1);
    expect(audit.token_hits).toBeGreaterThanOrEqual(1);
  });
});
