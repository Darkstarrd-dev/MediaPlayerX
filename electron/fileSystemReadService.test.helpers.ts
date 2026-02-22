import { spawn } from "node:child_process";
import path from "node:path";
import { promises as fs } from "node:fs";

import { expect } from "vitest";

import { FileSystemMediaReadService } from "./fileSystemReadService";

const ONE_PIXEL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5XKx8AAAAASUVORK5CYII=";

export async function writeBinary(
  filePath: string,
  bytes: number[],
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, Buffer.from(bytes));
}

export async function writeTinyPng(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, Buffer.from(ONE_PIXEL_PNG_BASE64, "base64"));
}

export async function commandExists(command: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const child = spawn(command, ["-version"], { windowsHide: true });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

export async function createSampleVideo(videoPath: string): Promise<void> {
  await fs.mkdir(path.dirname(videoPath), { recursive: true });
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "ffmpeg",
      [
        "-y",
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=c=#224466:s=640x360:d=1.2",
        "-f",
        "lavfi",
        "-i",
        "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-shortest",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        videoPath,
      ],
      { windowsHide: true },
    );

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr || `ffmpeg failed: ${code}`));
    });
  });
}

export async function createSampleAudioWithTags(
  audioPath: string,
): Promise<void> {
  await fs.mkdir(path.dirname(audioPath), { recursive: true });
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "ffmpeg",
      [
        "-y",
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:duration=1.2",
        "-c:a",
        "libmp3lame",
        "-metadata",
        "album=Album X",
        "-metadata",
        "artist=Artist Y",
        "-metadata",
        "title=Track Z",
        "-metadata",
        "comment=series-audio-001",
        audioPath,
      ],
      { windowsHide: true },
    );

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr || `ffmpeg failed: ${code}`));
    });
  });
}

export async function waitForImportTaskDone(
  service: FileSystemMediaReadService,
  taskId: string,
  timeoutMs = 15_000,
): Promise<{
  task_id: string;
  status: "completed" | "failed";
  processed_count: number;
  total_count: number;
}> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const snapshot = await service.readImportTasks();
    const task = snapshot.tasks.find((item) => item.task_id === taskId);
    if (task && (task.status === "completed" || task.status === "failed")) {
      return {
        task_id: task.task_id,
        status: task.status,
        processed_count: task.processed_count,
        total_count: task.total_count,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  throw new Error(`import task timeout: ${taskId}`);
}

export async function enqueueImportAndWait(
  service: FileSystemMediaReadService,
  source:
    | "dialog-files"
    | "dialog-folders"
    | "drag-drop"
    | "paste"
    | "dialog-files-music"
    | "dialog-folders-music"
    | "drag-drop-music"
    | "paste-music",
  paths: string[],
): Promise<void> {
  const queued = await service.enqueueImportTask({ source, paths });
  expect(["pending", "running", "completed"]).toContain(queued.task.status);
  const done = await waitForImportTaskDone(service, queued.task.task_id);
  expect(done.status).toBe("completed");
}

export async function writeStoredZip(
  filePath: string,
  entries: Array<{ name: string; content: Buffer }>,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let cursor = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, "utf8");
    const data = entry.content;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(0, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localChunks.push(localHeader, nameBuffer, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(0, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(cursor, 42);

    centralChunks.push(centralHeader, nameBuffer);

    cursor += localHeader.length + nameBuffer.length + data.length;
  }

  const centralDirectoryBuffer = Buffer.concat(centralChunks);
  const endOfCentralDirectory = Buffer.alloc(22);
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
  endOfCentralDirectory.writeUInt16LE(0, 4);
  endOfCentralDirectory.writeUInt16LE(0, 6);
  endOfCentralDirectory.writeUInt16LE(entries.length, 8);
  endOfCentralDirectory.writeUInt16LE(entries.length, 10);
  endOfCentralDirectory.writeUInt32LE(centralDirectoryBuffer.length, 12);
  endOfCentralDirectory.writeUInt32LE(cursor, 16);
  endOfCentralDirectory.writeUInt16LE(0, 20);

  await fs.writeFile(
    filePath,
    Buffer.concat([
      ...localChunks,
      centralDirectoryBuffer,
      endOfCentralDirectory,
    ]),
  );
}
