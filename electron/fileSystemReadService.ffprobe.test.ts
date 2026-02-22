import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

import { afterEach, describe, expect, it } from "vitest";

import { FileSystemMediaReadService } from "./fileSystemReadService";
import {
  commandExists,
  createSampleAudioWithTags,
  createSampleVideo,
  enqueueImportAndWait,
} from "./fileSystemReadService.test.helpers";

describe("FileSystemMediaReadService ffprobe metadata", () => {
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

  it("可通过 ffprobe 探测真实视频元数据并回填时长/分辨率", async () => {
    if (!(await commandExists("ffmpeg")) || !(await commandExists("ffprobe"))) {
      return;
    }

    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mpx-video-probe-"));
    createdRoots.push(root);

    const videoPath = path.join(root, "sample.mp4");
    await createSampleVideo(videoPath);

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-files", [videoPath]);
    const snapshot = await service.readLibrarySnapshot();
    const video = snapshot.videos[0];

    expect(video).toBeTruthy();
    if (!video) {
      throw new Error("video not found");
    }
    expect(video.duration_sec).toBeGreaterThan(0);
    expect(video.width).toBe(640);
    expect(video.height).toBe(360);
  });

  it("入库时可提取音频 ID3/Vorbis 标签并持久化到 sqlite", async () => {
    if (!(await commandExists("ffmpeg")) || !(await commandExists("ffprobe"))) {
      return;
    }

    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "mpx-audio-metadata-probe-"),
    );
    createdRoots.push(root);

    const audioPath = path.join(root, "tagged.mp3");
    await createSampleAudioWithTags(audioPath);

    const service = new FileSystemMediaReadService(root);
    createdServices.push(service);
    await enqueueImportAndWait(service, "dialog-files", [audioPath]);

    const snapshot = await service.readLibrarySnapshot();
    const audio = snapshot.audios?.find(
      (item) => path.resolve(item.absolute_path) === path.resolve(audioPath),
    );

    expect(audio).toBeTruthy();
    if (!audio) {
      throw new Error("audio not found");
    }
    expect(audio.album).toBe("Album X");
    expect(audio.author).toBe("Artist Y");
    expect(audio.track_title).toBe("Track Z");
    expect(audio.series_id).toBe("series-audio-001");

    service.invalidateCache();
    const refreshed = await service.readLibrarySnapshot();
    const refreshedAudio = refreshed.audios?.find(
      (item) => item.id === audio.id,
    );
    expect(refreshedAudio).toMatchObject({
      album: "Album X",
      author: "Artist Y",
      track_title: "Track Z",
      series_id: "series-audio-001",
    });
  });
});
