import { describe, expect, it } from "vitest";

import type { MediaLocatorDto } from "../../contracts/backend";
import type { MediaLocator } from "../../types";
import {
  mapMediaLocatorDto,
  mapMediaLocatorToDto,
  mediaLocatorDtoKey,
  mediaLocatorKey,
} from "./mediaLocator";

describe("mediaLocator", () => {
  it("mediaLocatorKey 与 mediaLocatorDtoKey 应输出一致键", () => {
    const fsLocator: MediaLocator = {
      kind: "filesystem",
      absolutePath: "D:/a/b/c.jpg",
      extension: ".jpg",
      mediaType: "image",
      mimeType: "image/jpeg",
    };
    expect(mediaLocatorKey(fsLocator)).toBe("fs:D:/a/b/c.jpg");
    expect(mediaLocatorDtoKey(mapMediaLocatorToDto(fsLocator))).toBe(
      "fs:D:/a/b/c.jpg",
    );

    const archiveLocator: MediaLocator = {
      kind: "archive-entry",
      archivePath: "D:/a.zip",
      archiveFormat: "zip",
      entryName: "folder/1.png",
      extension: ".png",
      mediaType: "image",
      mimeType: "image/png",
    };
    expect(mediaLocatorKey(archiveLocator)).toBe(
      "archive:D:/a.zip::folder/1.png",
    );
    expect(mediaLocatorDtoKey(mapMediaLocatorToDto(archiveLocator))).toBe(
      "archive:D:/a.zip::folder/1.png",
    );
  });

  it("mapMediaLocatorToDto 与 mapMediaLocatorDto 应保持双向映射", () => {
    const dto: MediaLocatorDto = {
      kind: "archive-entry",
      archive_path: "D:/album.cbz",
      archive_format: "zip",
      entry_name: "001.webp",
      extension: ".webp",
      media_type: "image",
      mime_type: "image/webp",
    };

    const viewModel = mapMediaLocatorDto(dto);
    expect(viewModel).toEqual({
      kind: "archive-entry",
      archivePath: "D:/album.cbz",
      archiveFormat: "zip",
      entryName: "001.webp",
      extension: ".webp",
      mediaType: "image",
      mimeType: "image/webp",
    });
    expect(mapMediaLocatorToDto(viewModel)).toEqual(dto);
  });
});
