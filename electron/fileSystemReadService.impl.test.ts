import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { createServer } from "node:http";

import { afterEach, describe, expect, it, vi } from "vitest";

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
    const firstLocator = packageDto?.images[0]?.media_locator;
    const secondLocator = packageDto?.images[1]?.media_locator;
    expect(firstLocator?.kind).toBe("archive-entry");
    expect(secondLocator?.kind).toBe("archive-entry");
    if (
      !firstLocator ||
      firstLocator.kind !== "archive-entry" ||
      !secondLocator ||
      secondLocator.kind !== "archive-entry"
    ) {
      throw new Error("zip image locator kind mismatch");
    }
    expect(firstLocator.entry_name).toBe("pages/0001.jpg");
    expect(secondLocator.entry_name).toBe("pages/0002.png");

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

  it("可输出音频转码能力矩阵并包含预设可用性", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-audio-transcode-cap-"),
    );
    createdRoots.push(root);

    await writeTinyPng(path.join(root, "sample.png"));

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);

    const capabilities = await service.readAudioTranscodeCapabilities();
    expect(typeof capabilities.enabled).toBe("boolean");
    expect(typeof capabilities.ffmpeg_available).toBe("boolean");
    expect(typeof capabilities.ffprobe_available).toBe("boolean");
    expect(typeof capabilities.library_root_dir).toBe("string");
    expect(typeof capabilities.default_output_dir).toBe("string");
    expect(
      capabilities.default_output_dir
        .replace(/\\/g, "/")
        .endsWith("/transcoded/audio"),
    ).toBe(true);
    expect(typeof capabilities.presets.flac.available).toBe("boolean");
    expect(typeof capabilities.presets.mp3.required_encoder).toBe("string");
    expect(typeof capabilities.presets.mp3.required_muxer).toBe("string");
  });

  it("可输出视频转码能力矩阵并包含容器/编码器可用性", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-video-transcode-cap-"),
    );
    createdRoots.push(root);

    await writeTinyPng(path.join(root, "sample.png"));

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);

    const capabilities = await service.readVideoTranscodeCapabilities();
    expect(typeof capabilities.enabled).toBe("boolean");
    expect(typeof capabilities.ffmpeg_available).toBe("boolean");
    expect(typeof capabilities.ffprobe_available).toBe("boolean");
    expect(typeof capabilities.library_root_dir).toBe("string");
    expect(typeof capabilities.default_output_dir).toBe("string");
    expect(
      capabilities.default_output_dir
        .replace(/\\/g, "/")
        .endsWith("/transcoded/video"),
    ).toBe(true);
    expect(typeof capabilities.containers.mp4.available).toBe("boolean");
    expect(typeof capabilities.containers.mp4.required_muxer).toBe("string");
    expect(typeof capabilities.video_codecs.h264.available).toBe("boolean");
    expect(typeof capabilities.video_codecs.h264.required_encoder).toBe(
      "string",
    );
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

  it("外部元数据写入在封面下载失败时仍会成功持久化", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-write-external-meta-"),
    );
    createdRoots.push(root);

    const zipPath = path.join(root, "meta_external_pkg.zip");
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

    const server = createServer((_request, response) => {
      response.statusCode = 500;
      response.end("thumbnail unavailable");
    });
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    try {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("thumbnail server unavailable");
      }
      const thumbUrl = `http://127.0.0.1:${address.port}/cover.jpg`;

      const updated = await service.writePackageExternalMetadata({
        package_id: source.id,
        source_site: "nhentai",
        source_url: "https://nhentai.net/g/474755/",
        source_remote_id: "474755",
        source_token: "",
        title: "Jotaika Kishi Belveed / Feminized Knight Belveed",
        title_jpn: "女体化騎士ベルウィード",
        group_name: "",
        group_name_jpn: "天路あや",
        artist: "tenro aya",
        artist_jpn: "",
        posted: "2023-09-24",
        rating: null,
        favorited: "2141",
        tags: {
          parody: "ero trap dungeon",
          character: "",
          tag: "big breasts, gender bender",
        },
        raw_json: JSON.stringify({ source: "unit-test" }),
        thumb_url: thumbUrl,
      });

      expect(updated.package.external_metadata?.source_site).toBe("nhentai");
      expect(updated.package.external_metadata?.source_remote_id).toBe(
        "474755",
      );
      expect(updated.package.external_metadata?.title).toBe(
        "Jotaika Kishi Belveed / Feminized Knight Belveed",
      );
      expect(updated.package.external_metadata?.title_jpn).toBe(
        "女体化騎士ベルウィード",
      );
      expect(updated.package.external_metadata?.group_name_jpn).toBe(
        "天路あや",
      );
      expect(updated.package.external_metadata?.artist).toBe("tenro aya");
      expect(updated.package.external_metadata?.favorited).toBe("2141");
      expect(updated.package.source_cover).toBeNull();

      service.invalidateCache();
      const refreshed = await service.readLibrarySnapshot();
      const refreshedSource = refreshed.image_packages.find(
        (item) => item.id === source.id,
      );
      expect(refreshedSource?.external_metadata?.source_site).toBe("nhentai");
      expect(refreshedSource?.external_metadata?.title_jpn).toBe(
        "女体化騎士ベルウィード",
      );
      expect(refreshedSource?.external_metadata?.group_name_jpn).toBe(
        "天路あや",
      );
      expect(refreshedSource?.external_metadata?.artist).toBe("tenro aya");
      expect(refreshedSource?.external_metadata?.posted).toBe("2023-09-24");
      expect(refreshedSource?.external_metadata?.favorited).toBe("2141");
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
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

    await new Promise((resolve) => {
      setTimeout(resolve, 1_200);
    });
    eventPayloads.length = 0;

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

  it("管理变更进行中应延后自动缺失清理", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mpx-prune-guard-"));
    createdRoots.push(root);

    await writeBinary(
      path.join(root, "gallery", "a.jpg"),
      [0xff, 0xd8, 0xff, 0xd9],
    );

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-folders", [root]);
    await service.readLibrarySnapshot();

    const serviceInternal = service as unknown as {
      managementMutationInFlightCount: number;
      pruneMissingSnapshotPromise: Promise<void> | null;
      pruneMissingSnapshotQueued: boolean;
      schedulePruneMissingSnapshotEntries: () => void;
      pruneMissingSnapshotEntries: (snapshot: unknown) => Promise<unknown>;
    };
    const pruneSpy = vi.spyOn(serviceInternal, "pruneMissingSnapshotEntries");

    serviceInternal.managementMutationInFlightCount = 1;
    serviceInternal.schedulePruneMissingSnapshotEntries();
    await Promise.resolve();
    await Promise.resolve();

    expect(pruneSpy).not.toHaveBeenCalled();
    expect(serviceInternal.pruneMissingSnapshotQueued).toBe(true);
    expect(serviceInternal.pruneMissingSnapshotPromise).toBeNull();

    serviceInternal.managementMutationInFlightCount = 0;
    serviceInternal.schedulePruneMissingSnapshotEntries();
    await Promise.resolve();
    await Promise.resolve();

    expect(pruneSpy).toHaveBeenCalledTimes(1);
  });

  it("同一批目录多轮 replace 重命名后不应丢失 sidebar 节点", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-rename-replace-loop-"),
    );
    createdRoots.push(root);

    await writeBinary(
      path.join(root, "set demo A", "a.jpg"),
      [0xff, 0xd8, 0xff, 0xd9],
    );
    await writeBinary(
      path.join(root, "set B", "b.jpg"),
      [0xff, 0xd8, 0xff, 0xd9],
    );
    await writeBinary(
      path.join(root, "set demo C", "c.jpg"),
      [0xff, 0xd8, 0xff, 0xd9],
    );

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-folders", [root]);

    const featureFilter = {
      name_query: "",
      work_title_query: "",
      series_id_query: "",
      circle_query: "",
      author_query: "",
      tags: [],
      grade: null,
    };

    const beforeSnapshot = await service.readLibrarySnapshot();
    expect(beforeSnapshot.image_directories).toHaveLength(3);

    const firstTargets = beforeSnapshot.image_directories.map((source) => ({
      kind: "sidebar-node" as const,
      node_id: `package:${source.tree_path.join("/")}`,
    }));

    const firstRename = await service.renameItems({
      targets: firstTargets,
      mode: "replace",
      replace_from: " demo",
      replace_to: "",
      fail_fast: false,
      preview_only: false,
    });

    expect(firstRename.failed).toEqual([]);
    expect(firstRename.renamed_count).toBe(2);

    const secondSnapshotBase = await service.readLibrarySnapshot();
    expect(secondSnapshotBase.image_directories).toHaveLength(3);

    const secondTargets = secondSnapshotBase.image_directories.map(
      (source) => ({
        kind: "sidebar-node" as const,
        node_id: `package:${source.tree_path.join("/")}`,
      }),
    );

    const secondRename = await service.renameItems({
      targets: secondTargets,
      mode: "replace",
      replace_from: " demo",
      replace_to: "",
      fail_fast: false,
      preview_only: false,
    });

    expect(secondRename.failed).toEqual([]);
    expect(secondRename.renamed_count).toBe(0);
    expect(
      secondRename.results.every(
        (item) => item.reason === "replace-target-not-found",
      ),
    ).toBe(true);

    const sidebar = await service.readImageSidebarTree({
      feature_filter: featureFilter,
      grade_overrides: {},
    });
    expect(sidebar.image_directories).toHaveLength(3);

    const labels = sidebar.image_directories
      .map((item) => item.display_name)
      .sort((left, right) => left.localeCompare(right, "zh-CN"));
    expect(labels).toEqual(["set A", "set B", "set C"]);

    await expect(
      fs.stat(path.join(root, "set A", "a.jpg")),
    ).resolves.toMatchObject({
      isFile: expect.any(Function),
    });
    await expect(
      fs.stat(path.join(root, "set B", "b.jpg")),
    ).resolves.toMatchObject({
      isFile: expect.any(Function),
    });
    await expect(
      fs.stat(path.join(root, "set C", "c.jpg")),
    ).resolves.toMatchObject({
      isFile: expect.any(Function),
    });
  });

  it("外部删除导入源后会通过 watcher 自动清理并广播变更", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-auto-prune-watcher-"),
    );
    createdRoots.push(root);

    const imageDirectory = path.join(root, "gallery");
    await writeBinary(
      path.join(imageDirectory, "a.jpg"),
      [0xff, 0xd8, 0xff, 0xd9],
    );

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-folders", [root]);

    const before = await service.readLibrarySnapshot();
    expect(before.image_directories.length).toBeGreaterThan(0);

    const eventPayloads: Array<{ reason: string; updated_at_ms: number }> = [];
    const unsubscribe = service.onLibraryChanged((payload) => {
      eventPayloads.push(payload);
    });

    await fs.rm(imageDirectory, { recursive: true, force: true });

    await expect
      .poll(
        () =>
          eventPayloads.some(
            (payload) => payload.reason === "auto-prune-missing-sources",
          ),
        { timeout: 5_000, interval: 100 },
      )
      .toBe(true);

    const after = await service.readLibrarySnapshot();
    unsubscribe();

    expect(after.image_directories).toHaveLength(0);
  });

  it("自动字幕 sidecar 写盘不会触发 watcher 自动清理广播", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-auto-subtitle-sidecar-watch-"),
    );
    createdRoots.push(root);

    const videoPath = path.join(root, "clip.mp4");
    await writeBinary(videoPath, [0x00, 0x00, 0x00, 0x18]);

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-folders", [root]);
    await service.readLibrarySnapshot();

    const eventPayloads: Array<{ reason: string; updated_at_ms: number }> = [];
    const unsubscribe = service.onLibraryChanged((payload) => {
      eventPayloads.push(payload);
    });

    const subtitlePath = path.join(root, "clip.auto-live.zh-CN.srt");
    const subtitleTempPath = `${subtitlePath}.tmp`;
    await fs.writeFile(
      subtitleTempPath,
      "1\n00:00:00,000 --> 00:00:01,000\nhello\n\n",
      "utf8",
    );
    await fs.rename(subtitleTempPath, subtitlePath);
    await fs.appendFile(
      subtitlePath,
      "2\n00:00:01,000 --> 00:00:02,000\nworld\n\n",
      "utf8",
    );

    await new Promise((resolve) => {
      setTimeout(resolve, 1_500);
    });

    unsubscribe();

    expect(
      eventPayloads.some(
        (payload) => payload.reason === "auto-prune-missing-sources",
      ),
    ).toBe(false);
  });

  it("watcher 刷新进行中会合并后续请求并应用最小间隔节流", async () => {
    vi.useFakeTimers();
    try {
      const root = await fs.mkdtemp(
        path.join(os.tmpdir(), "mpx-watcher-refresh-coalesce-"),
      );
      createdRoots.push(root);

      const service = new FileSystemMediaReadService(root);
      createdServices.push(service);

      const serviceInternal = service as unknown as {
        runExternalSourceRefreshFromWatcher: () => void;
        refreshSnapshotFromFilesystem: () => Promise<unknown>;
      };
      const emptySnapshot = {
        image_packages: [],
        image_directories: [],
        videos: [],
        audios: [],
      };

      let resolveFirstRefresh: ((value: unknown) => void) | null = null;
      const firstRefreshPromise = new Promise<unknown>((resolve) => {
        resolveFirstRefresh = resolve;
      });
      const refreshSpy = vi
        .spyOn(serviceInternal, "refreshSnapshotFromFilesystem")
        .mockImplementationOnce(async () => await firstRefreshPromise)
        .mockResolvedValue(emptySnapshot);

      serviceInternal.runExternalSourceRefreshFromWatcher();
      await vi.advanceTimersByTimeAsync(0);
      expect(refreshSpy).toHaveBeenCalledTimes(1);

      serviceInternal.runExternalSourceRefreshFromWatcher();
      await Promise.resolve();
      expect(refreshSpy).toHaveBeenCalledTimes(1);

      const completeFirstRefresh = resolveFirstRefresh as
        | ((value: unknown) => void)
        | null;
      expect(completeFirstRefresh).not.toBeNull();
      if (!completeFirstRefresh) {
        throw new Error("first refresh resolver missing");
      }
      completeFirstRefresh(emptySnapshot);
      await Promise.resolve();
      await Promise.resolve();

      expect(refreshSpy).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(4_999);
      expect(refreshSpy).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      expect(refreshSpy).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
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
});
