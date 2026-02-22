import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { promises as fs } from "node:fs";
import { Worker } from "node:worker_threads";
import { inflateRawSync } from "node:zlib";

export const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
]);
export const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mkv", ".mov"]);
export const ARCHIVE_EXTENSIONS = new Set([".zip", ".rar", ".7z"]);

const ZIP_END_OF_CENTRAL_DIR_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_FILE_HEADER_SIGNATURE = 0x02014b50;
const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const ZIP_GENERAL_PURPOSE_FLAG_UTF8 = 0x0800;
const ZIP_GENERAL_PURPOSE_FLAG_ENCRYPTED = 0x0001;
const ZIP_COMPRESSION_STORE = 0;
const ZIP_COMPRESSION_DEFLATE = 8;
const ZIP_MAX_COMMENT_LENGTH = 0xffff;
const ZIP_SCAN_TAIL_PADDING = 128;

export function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }
  return args;
}

export function toPosix(value) {
  return value.split(path.sep).join("/");
}

export function toStableId(prefix, rawValue) {
  const hash = createHash("sha1").update(rawValue).digest("hex").slice(0, 12);
  return `${prefix}-${hash}`;
}

export function formatMs(value) {
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  return Number(value.toFixed(2));
}

export function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return null;
  }
  return Number(value.toFixed(digits));
}

export function resolveNumber(rawValue, fallback) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function decodeZipEntryName(bytes, utf8) {
  return utf8 ? bytes.toString("utf8") : bytes.toString("latin1");
}

function normalizeArchiveEntryName(value) {
  return value.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
}

export function isSafeArchiveEntryName(value) {
  if (!value || value.includes("\u0000")) {
    return false;
  }
  if (value.startsWith("/") || value.startsWith("\\")) {
    return false;
  }
  if (/^[a-zA-Z]:/.test(value)) {
    return false;
  }

  return value.split("/").every((segment) => segment !== "..");
}

function findSignatureBackward(buffer, signature) {
  for (let index = buffer.length - 4; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === signature) {
      return index;
    }
  }
  return -1;
}

export async function scanZipCentralEntries(archivePath) {
  const handle = await fs.open(archivePath, "r");
  try {
    const stat = await handle.stat();
    if (stat.size < 22) {
      return [];
    }

    const tailSize = Math.min(
      stat.size,
      ZIP_MAX_COMMENT_LENGTH + 22 + ZIP_SCAN_TAIL_PADDING,
    );
    const tailOffset = stat.size - tailSize;
    const tailBuffer = Buffer.alloc(tailSize);
    await handle.read(tailBuffer, 0, tailSize, tailOffset);

    const eocdIndex = findSignatureBackward(
      tailBuffer,
      ZIP_END_OF_CENTRAL_DIR_SIGNATURE,
    );
    if (eocdIndex < 0) {
      return [];
    }

    const centralSize = tailBuffer.readUInt32LE(eocdIndex + 12);
    const centralOffset = tailBuffer.readUInt32LE(eocdIndex + 16);
    if (centralSize === 0xffffffff || centralOffset === 0xffffffff) {
      return [];
    }
    if (centralOffset + centralSize > stat.size) {
      return [];
    }

    const centralBuffer = Buffer.alloc(centralSize);
    await handle.read(centralBuffer, 0, centralSize, centralOffset);

    const entries = [];
    let cursor = 0;
    while (cursor + 46 <= centralBuffer.length) {
      const signature = centralBuffer.readUInt32LE(cursor);
      if (signature !== ZIP_CENTRAL_FILE_HEADER_SIGNATURE) {
        break;
      }

      const generalPurposeBitFlag = centralBuffer.readUInt16LE(cursor + 8);
      const compressionMethod = centralBuffer.readUInt16LE(cursor + 10);
      const compressedSize = centralBuffer.readUInt32LE(cursor + 20);
      const fileNameLength = centralBuffer.readUInt16LE(cursor + 28);
      const extraLength = centralBuffer.readUInt16LE(cursor + 30);
      const commentLength = centralBuffer.readUInt16LE(cursor + 32);
      const localHeaderOffset = centralBuffer.readUInt32LE(cursor + 42);

      const fileNameStart = cursor + 46;
      const fileNameEnd = fileNameStart + fileNameLength;
      if (fileNameEnd > centralBuffer.length) {
        break;
      }

      const fileName = decodeZipEntryName(
        centralBuffer.subarray(fileNameStart, fileNameEnd),
        (generalPurposeBitFlag & ZIP_GENERAL_PURPOSE_FLAG_UTF8) !== 0,
      );
      const entryName = normalizeArchiveEntryName(fileName);

      const nextCursor = fileNameEnd + extraLength + commentLength;
      if (nextCursor > centralBuffer.length) {
        break;
      }
      cursor = nextCursor;

      if (!entryName || entryName.endsWith("/")) {
        continue;
      }

      entries.push({
        entryName,
        extension: path.extname(entryName).toLowerCase(),
        compressedSize,
        compressionMethod,
        generalPurposeBitFlag,
        localHeaderOffset,
      });
    }

    return entries;
  } finally {
    await handle.close();
  }
}

export async function readZipEntryContent(archivePath, entry) {
  const handle = await fs.open(archivePath, "r");
  try {
    const localHeader = Buffer.alloc(30);
    const { bytesRead } = await handle.read(
      localHeader,
      0,
      localHeader.length,
      entry.localHeaderOffset,
    );
    if (
      bytesRead < localHeader.length ||
      localHeader.readUInt32LE(0) !== ZIP_LOCAL_FILE_HEADER_SIGNATURE
    ) {
      throw new Error("zip_local_header_invalid");
    }

    const localFileNameLength = localHeader.readUInt16LE(26);
    const localExtraLength = localHeader.readUInt16LE(28);
    const dataOffset =
      entry.localHeaderOffset + 30 + localFileNameLength + localExtraLength;
    const compressedBuffer = Buffer.alloc(entry.compressedSize);
    const read = await handle.read(
      compressedBuffer,
      0,
      compressedBuffer.length,
      dataOffset,
    );
    if (read.bytesRead < compressedBuffer.length) {
      throw new Error("zip_entry_read_incomplete");
    }

    if (
      (entry.generalPurposeBitFlag & ZIP_GENERAL_PURPOSE_FLAG_ENCRYPTED) !==
      0
    ) {
      throw new Error("zip_entry_encrypted");
    }

    if (entry.compressionMethod === ZIP_COMPRESSION_STORE) {
      return compressedBuffer;
    }
    if (entry.compressionMethod === ZIP_COMPRESSION_DEFLATE) {
      return inflateRawSync(compressedBuffer);
    }
    throw new Error("zip_entry_compression_unsupported");
  } finally {
    await handle.close();
  }
}

export async function runProcess(command, args, timeoutMs = 120_000) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`process_timeout:${command}`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `process_exit_${code}:${command}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

export async function probeVideoMetadata(videoPath, ffprobeBin) {
  const result = await runProcess(
    ffprobeBin,
    [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_streams",
      "-show_format",
      videoPath,
    ],
    60_000,
  );
  const parsed = JSON.parse(result.stdout);
  const videoStream = Array.isArray(parsed.streams)
    ? (parsed.streams.find((stream) => stream.codec_type === "video") ??
      parsed.streams[0])
    : null;
  const width = Number(videoStream?.width ?? 0);
  const height = Number(videoStream?.height ?? 0);
  const duration = Number(
    parsed.format?.duration ?? videoStream?.duration ?? 0,
  );
  return {
    width: Number.isFinite(width) && width > 0 ? width : 0,
    height: Number.isFinite(height) && height > 0 ? height : 0,
    durationSec: Number.isFinite(duration) && duration > 0 ? duration : 0,
  };
}

export class PriorityQueue {
  constructor(concurrency) {
    this.concurrency = Math.max(1, Math.floor(concurrency));
    this.pending = [];
    this.active = 0;
    this.running = false;
    this.idleResolvers = [];
  }

  push(task, priority = 0) {
    this.pending.push({ task, priority });
    this.pending.sort((a, b) => b.priority - a.priority);
    this.#drain();
  }

  async onIdle() {
    if (this.pending.length === 0 && this.active === 0) {
      return;
    }

    await new Promise((resolve) => {
      this.idleResolvers.push(resolve);
    });
  }

  #notifyIdleIfNeeded() {
    if (this.pending.length > 0 || this.active > 0) {
      return;
    }

    const resolvers = this.idleResolvers.splice(0, this.idleResolvers.length);
    for (const resolver of resolvers) {
      resolver();
    }
  }

  #drain() {
    if (this.running) {
      return;
    }
    this.running = true;

    queueMicrotask(async () => {
      try {
        while (this.active < this.concurrency && this.pending.length > 0) {
          const current = this.pending.shift();
          if (!current) {
            break;
          }

          this.active += 1;
          Promise.resolve()
            .then(() => current.task())
            .catch(() => undefined)
            .finally(() => {
              this.active -= 1;
              this.#notifyIdleIfNeeded();
              this.#drain();
            });
        }
      } finally {
        this.running = false;
      }
    });
  }
}

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function createDbLayerAsync(dbPath) {
  try {
    const sqlite = await import("node:sqlite");
    const { DatabaseSync } = sqlite;
    const db = new DatabaseSync(dbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS package_item (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        absolute_path TEXT NOT NULL,
        status TEXT NOT NULL,
        discovered_at_ms INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS image_item (
        id TEXT PRIMARY KEY,
        package_id TEXT NOT NULL,
        source_kind TEXT NOT NULL,
        source_path TEXT NOT NULL,
        archive_entry_name TEXT,
        thumb_path TEXT,
        status TEXT NOT NULL,
        ordinal INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_image_pkg_ordinal ON image_item(package_id, ordinal);
      CREATE TABLE IF NOT EXISTS video_item (
        id TEXT PRIMARY KEY,
        absolute_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        duration_sec REAL,
        width INTEGER,
        height INTEGER,
        status TEXT NOT NULL,
        discovered_at_ms INTEGER NOT NULL,
        updated_at_ms INTEGER NOT NULL
      );
    `);

    const insertPackageStmt = db.prepare(
      "INSERT OR REPLACE INTO package_item(id,kind,absolute_path,status,discovered_at_ms) VALUES(?,?,?,?,?)",
    );
    const insertImageStmt = db.prepare(
      "INSERT OR REPLACE INTO image_item(id,package_id,source_kind,source_path,archive_entry_name,thumb_path,status,ordinal) VALUES(?,?,?,?,?,?,?,?)",
    );
    const updateImageThumbStmt = db.prepare(
      "UPDATE image_item SET thumb_path = ?, status = ? WHERE id = ?",
    );
    const insertVideoStmt = db.prepare(
      "INSERT OR REPLACE INTO video_item(id,absolute_path,file_name,duration_sec,width,height,status,discovered_at_ms,updated_at_ms) VALUES(?,?,?,?,?,?,?,?,?)",
    );
    const updateVideoMetaStmt = db.prepare(
      "UPDATE video_item SET duration_sec = ?, width = ?, height = ?, status = ?, updated_at_ms = ? WHERE id = ?",
    );

    return {
      enabled: true,
      strategy: "sqlite",
      insertPackage: (item) =>
        insertPackageStmt.run(
          item.id,
          item.kind,
          item.absolutePath,
          item.status,
          item.discoveredAtMs,
        ),
      insertImage: (item) =>
        insertImageStmt.run(
          item.id,
          item.packageId,
          item.sourceKind,
          item.sourcePath,
          item.archiveEntryName,
          item.thumbPath,
          item.status,
          item.ordinal,
        ),
      updateImageThumb: (item) =>
        updateImageThumbStmt.run(item.thumbPath, item.status, item.id),
      insertVideo: (item) =>
        insertVideoStmt.run(
          item.id,
          item.absolutePath,
          item.fileName,
          item.durationSec,
          item.width,
          item.height,
          item.status,
          item.discoveredAtMs,
          item.updatedAtMs,
        ),
      updateVideoMeta: (item) =>
        updateVideoMetaStmt.run(
          item.durationSec,
          item.width,
          item.height,
          item.status,
          item.updatedAtMs,
          item.id,
        ),
      flush: async () => undefined,
      dispose: () => db.close(),
    };
  } catch {
    return {
      enabled: false,
      strategy: "sqlite",
      insertPackage: () => undefined,
      insertImage: () => undefined,
      updateImageThumb: () => undefined,
      insertVideo: () => undefined,
      updateVideoMeta: () => undefined,
      flush: async () => undefined,
      dispose: () => undefined,
    };
  }
}

export async function createBetterSqliteWorkerDbLayer(dbPath) {
  const workerUrl = new URL("./benchmark-db-worker.mjs", import.meta.url);
  const worker = new Worker(workerUrl, {
    workerData: {
      dbPath,
    },
  });

  let requestId = 0;
  const pendingRequests = new Map();
  let ready = false;

  const rejectAll = (error) => {
    const requests = Array.from(pendingRequests.values());
    pendingRequests.clear();
    for (const request of requests) {
      request.reject(error);
    }
  };

  worker.on("message", (message) => {
    if (!message || typeof message !== "object") {
      return;
    }

    if (message.type === "ready") {
      ready = true;
      const request = pendingRequests.get(0);
      if (request) {
        pendingRequests.delete(0);
        request.resolve(undefined);
      }
      return;
    }

    if (message.type === "response" && typeof message.requestId === "number") {
      const request = pendingRequests.get(message.requestId);
      if (!request) {
        return;
      }
      pendingRequests.delete(message.requestId);
      if (message.ok) {
        request.resolve(message.payload);
      } else {
        request.reject(new Error(message.error ?? "db_worker_request_failed"));
      }
      return;
    }
  });

  worker.on("error", (error) => {
    rejectAll(error);
  });

  const callWorker = (type, payload) => {
    requestId += 1;
    const currentRequestId = requestId;
    return new Promise((resolve, reject) => {
      pendingRequests.set(currentRequestId, { resolve, reject });
      worker.postMessage({
        type,
        requestId: currentRequestId,
        payload,
      });
    });
  };

  const waitReady = async () => {
    if (ready) {
      return;
    }
    await new Promise((resolve, reject) => {
      pendingRequests.set(0, { resolve, reject });
    });
  };

  await waitReady();

  const postWrite = (type, payload) => {
    worker.postMessage({ type, payload });
  };

  return {
    enabled: true,
    strategy: "better-sqlite3-worker",
    insertPackage: (item) => postWrite("insertPackage", item),
    insertImage: (item) => postWrite("insertImage", item),
    updateImageThumb: (item) => postWrite("updateImageThumb", item),
    insertVideo: (item) => postWrite("insertVideo", item),
    updateVideoMeta: (item) => postWrite("updateVideoMeta", item),
    flush: async () => {
      await callWorker("flush");
    },
    dispose: async () => {
      try {
        await callWorker("close");
      } finally {
        await worker.terminate();
      }
    },
  };
}

export function createMemoryDbLayer() {
  const packageStore = new Map();
  const imageStore = new Map();
  const videoStore = new Map();

  return {
    enabled: true,
    strategy: "memory",
    insertPackage: (item) => packageStore.set(item.id, item),
    insertImage: (item) => imageStore.set(item.id, item),
    updateImageThumb: (item) => {
      const current = imageStore.get(item.id);
      if (!current) {
        return;
      }
      imageStore.set(item.id, {
        ...current,
        thumbPath: item.thumbPath,
        status: item.status,
      });
    },
    insertVideo: (item) => videoStore.set(item.id, item),
    updateVideoMeta: (item) => {
      const current = videoStore.get(item.id);
      if (!current) {
        return;
      }
      videoStore.set(item.id, {
        ...current,
        durationSec: item.durationSec,
        width: item.width,
        height: item.height,
        status: item.status,
        updatedAtMs: item.updatedAtMs,
      });
    },
    flush: async () => undefined,
    dispose: () => undefined,
  };
}

export async function readDirEntriesByStrategy(dirPath, strategy) {
  if (strategy === "opendir") {
    const entries = [];
    const directory = await fs.opendir(dirPath);
    for await (const entry of directory) {
      entries.push(entry);
    }
    return entries;
  }

  return await fs.readdir(dirPath, { withFileTypes: true });
}

function parsePowerShellLines(raw) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function scanZipEntriesWithPowerShell(archivePath) {
  const escapedArchivePath = archivePath.replace(/'/g, "''");
  const command = [
    "$ErrorActionPreference='Stop'",
    "Add-Type -AssemblyName System.IO.Compression.FileSystem",
    `$zip=[System.IO.Compression.ZipFile]::OpenRead('${escapedArchivePath}')`,
    "try { $zip.Entries | ForEach-Object { $_.FullName } } finally { $zip.Dispose() }",
  ].join("; ");

  const result = await runProcess(
    "powershell.exe",
    ["-NoProfile", "-Command", command],
    180_000,
  );
  const entryNames = parsePowerShellLines(result.stdout);
  return entryNames
    .map((entryName) => normalizeArchiveEntryName(entryName))
    .filter((entryName) => entryName.length > 0 && !entryName.endsWith("/"))
    .map((entryName) => ({
      entryName,
      extension: path.extname(entryName).toLowerCase(),
      compressedSize: 0,
      compressionMethod: ZIP_COMPRESSION_STORE,
      generalPurposeBitFlag: 0,
      localHeaderOffset: 0,
    }));
}

async function scanZipEntriesWithNodeStreamZip(archivePath) {
  const module = await import("node-stream-zip");
  const StreamZip = module.default ?? module;
  const zip = new StreamZip.async({
    file: archivePath,
    storeEntries: true,
  });

  try {
    const entries = await zip.entries();
    return Object.values(entries)
      .filter((entry) => !entry.isDirectory)
      .map((entry) => {
        const entryName = normalizeArchiveEntryName(String(entry.name ?? ""));
        return {
          entryName,
          extension: path.extname(entryName).toLowerCase(),
          compressedSize: Number(entry.compressedSize ?? 0),
          compressionMethod: Number(entry.method ?? ZIP_COMPRESSION_STORE),
          generalPurposeBitFlag: 0,
          localHeaderOffset: Number(entry.offset ?? 0),
        };
      })
      .filter(
        (entry) => entry.entryName.length > 0 && !entry.entryName.endsWith("/"),
      );
  } finally {
    await zip.close().catch(() => undefined);
  }
}

async function scanZipEntriesWithYauzl(archivePath) {
  const module = await import("yauzl");
  const yauzl = module.default ?? module;

  const zipFile = await new Promise((resolve, reject) => {
    yauzl.open(
      archivePath,
      { lazyEntries: true, decodeStrings: false },
      (error, handle) => {
        if (error || !handle) {
          reject(error ?? new Error("yauzl_open_failed"));
          return;
        }
        resolve(handle);
      },
    );
  });

  return await new Promise((resolve, reject) => {
    const entries = [];

    zipFile.on("entry", (entry) => {
      const rawName = Buffer.isBuffer(entry.fileName)
        ? entry.fileName
        : Buffer.from(String(entry.fileName ?? ""), "utf8");
      const entryName = normalizeArchiveEntryName(
        decodeZipEntryName(
          rawName,
          (entry.generalPurposeBitFlag & ZIP_GENERAL_PURPOSE_FLAG_UTF8) !== 0,
        ),
      );

      if (entryName.length > 0 && !entryName.endsWith("/")) {
        entries.push({
          entryName,
          extension: path.extname(entryName).toLowerCase(),
          compressedSize: Number(entry.compressedSize ?? 0),
          compressionMethod: Number(
            entry.compressionMethod ?? ZIP_COMPRESSION_STORE,
          ),
          generalPurposeBitFlag: Number(entry.generalPurposeBitFlag ?? 0),
          localHeaderOffset: Number(entry.relativeOffsetOfLocalHeader ?? 0),
        });
      }

      zipFile.readEntry();
    });

    zipFile.on("end", () => {
      zipFile.close();
      resolve(entries);
    });

    zipFile.on("error", (error) => {
      reject(error);
    });

    zipFile.readEntry();
  });
}

export async function scanZipEntriesByStrategy(archivePath, strategy) {
  if (strategy === "powershell") {
    return await scanZipEntriesWithPowerShell(archivePath);
  }

  if (strategy === "node-stream-zip") {
    return await scanZipEntriesWithNodeStreamZip(archivePath);
  }

  if (strategy === "yauzl") {
    return await scanZipEntriesWithYauzl(archivePath);
  }

  return await scanZipCentralEntries(archivePath);
}
