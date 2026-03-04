import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
 

import { afterEach, describe, expect, it } from "vitest";

import { MEDIA_PROTOCOL_SCHEME } from "./channels";
import { FileSystemMediaReadService } from "./fileSystemReadService";
import {
  enqueueImportAndWait,
  writeBinary,
  writeStoredZip,
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

  it("管理仅移除父级 folder 且联选子级节点时不应将子节点记为失败", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-manage-remove-only-folder-parent-"),
    );
    createdRoots.push(root);

    const parentFolderPath = path.join(root, "parent-remove-only");
    for (let index = 1; index <= 8; index += 1) {
      const childFolderPath = path.join(
        parentFolderPath,
        `child-${String(index).padStart(2, "0")}`,
      );
      await writeBinary(
        path.join(childFolderPath, "img_01.jpg"),
        [0xff, 0xd8, 0xff, 0xd9],
      );
    }

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

    const childSources = sidebarBefore.image_directories.filter(
      (item) =>
        path.resolve(path.dirname(item.absolute_path)) ===
        path.resolve(parentFolderPath),
    );
    expect(childSources).toHaveLength(8);
    const firstChild = childSources[0];
    expect(firstChild).toBeTruthy();
    if (!firstChild) {
      throw new Error("child source not found");
    }

    const parentNodeId = `folder:${firstChild.tree_path.slice(0, -1).join("/")}`;
    const childNodeIds = childSources.map(
      (source) => `folder:${source.tree_path.join("/")}`,
    );

    const result = await service.deleteSidebarNodes({
      node_ids: [parentNodeId, ...childNodeIds],
      delete_files: false,
    });

    expect(result.deleted_count).toBe(1);
    expect(result.failed).toHaveLength(0);

    const parentFolderStat = await fs.stat(parentFolderPath).catch(() => null);
    const childImageStat = await fs
      .stat(path.join(parentFolderPath, "child-01", "img_01.jpg"))
      .catch(() => null);
    expect(parentFolderStat?.isDirectory()).toBe(true);
    expect(childImageStat?.isFile()).toBe(true);

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
    const childNodesStillExist = sidebarAfter.image_directories.some(
      (item) =>
        path.resolve(path.dirname(item.absolute_path)) ===
        path.resolve(parentFolderPath),
    );
    expect(childNodesStillExist).toBe(false);
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
