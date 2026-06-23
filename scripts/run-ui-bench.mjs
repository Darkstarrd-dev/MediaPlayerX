#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
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

function resolveNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function resolveElectronBinary(projectRoot) {
  return process.platform === "win32"
    ? path.join(projectRoot, "node_modules", ".bin", "electron.cmd")
    : path.join(projectRoot, "node_modules", ".bin", "electron");
}

async function runCommand(projectRoot, command, args, env) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }
      reject(
        new Error(
          `command failed: ${command} ${args.join(" ")} (exit ${code ?? "null"})`,
        ),
      );
    });
  });
}

function buildRunTag() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function toBool(value) {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

const projectRoot = process.cwd();
const args = parseArgs(process.argv.slice(2));

const benchMode =
  String(args.mode ?? process.env.MEDIA_PLAYERX_BENCH ?? "").trim() || "e2e";
const candidateId = String(args["candidate-id"] ?? "C0");
const runTag = String(args["run-tag"] ?? buildRunTag());
const isolateUserDataDir =
  args["reuse-user-data-dir"] === undefined
    ? true
    : !toBool(args["reuse-user-data-dir"]);

const outDir = path.resolve(
  String(args["out-dir"] ?? path.join(projectRoot, "docs", "perf", "ui-runs")),
);
const libraryRoot = path.resolve(
  String(
    args["library-root"] ??
      path.join(projectRoot, "library-bench", `${candidateId}`),
  ),
);
const userDataBaseDir = path.resolve(
  String(
    args["user-data-dir"] ??
      path.join(
        projectRoot,
        "bench-user-data",
        `${benchMode}-${candidateId}-${runTag}`,
      ),
  ),
);
const userDataDir = isolateUserDataDir
  ? path.join(userDataBaseDir, buildRunTag())
  : userDataBaseDir;

const config = {
  candidateId,
  runTag,
  librarySnapshotLite:
    args["library-snapshot-lite"] !== undefined
      ? toBool(args["library-snapshot-lite"])
      : undefined,
  importRefreshThrottle:
    args["import-refresh-throttle"] !== undefined
      ? toBool(args["import-refresh-throttle"])
      : undefined,
  reactProfiler: args["react-profiler"] ? true : true,
  resolvedMedia: {
    applyMode: args["apply-mode"] ?? undefined,
    stateScope: args["state-scope"] ?? undefined,
    maxConcurrent: args["max-concurrent"]
      ? Number(args["max-concurrent"])
      : undefined,
  },
  imageLoadingSkeleton: {
    mode: args["skeleton"] ?? undefined,
  },
  e2e: {
    importPaths: args["import-path"]
      ? [String(args["import-path"])]
      : undefined,
    browseSteps: args["browse-steps"]
      ? Number(args["browse-steps"])
      : undefined,
    browseIntervalMs: args["browse-interval-ms"]
      ? Number(args["browse-interval-ms"])
      : undefined,
    warmupMs: args["warmup-ms"] ? Number(args["warmup-ms"]) : undefined,
    maxDurationMs: args["max-duration-ms"]
      ? Number(args["max-duration-ms"])
      : undefined,
    waitImportCompletion:
      args["wait-import-completion"] !== undefined
        ? toBool(args["wait-import-completion"])
        : undefined,
  },
  dom: {
    targetCount: args["target-count"]
      ? Number(args["target-count"])
      : undefined,
    resolveDelayMinMs: args["resolve-delay-min-ms"]
      ? Number(args["resolve-delay-min-ms"])
      : undefined,
    resolveDelayMaxMs: args["resolve-delay-max-ms"]
      ? Number(args["resolve-delay-max-ms"])
      : undefined,
  },
};

await mkdir(outDir, { recursive: true });
await mkdir(libraryRoot, { recursive: true });
await mkdir(userDataDir, { recursive: true });

const distOk = existsSync(path.join(projectRoot, "dist", "index.html"));
const electronOk = existsSync(
  path.join(projectRoot, "dist-electron", "main.cjs"),
);
const skipBuild = toBool(args["skip-build"]);

if (!skipBuild && (!distOk || !electronOk)) {
  const npm = resolveNpmCommand();
  await runCommand(projectRoot, npm, ["run", "desktop:build"], process.env);
}

const electronBinary = resolveElectronBinary(projectRoot);

const env = {
  ...process.env,
  VITE_MEDIA_REPOSITORY_MODE: "real",
  MEDIA_PLAYERX_LIBRARY_ROOT: libraryRoot,
  MEDIA_PLAYERX_BENCH: benchMode,
  MEDIA_PLAYERX_BENCH_OUT_DIR: outDir,
  MEDIA_PLAYERX_BENCH_CONFIG_JSON: JSON.stringify(config),
  MEDIA_PLAYERX_USER_DATA_DIR: userDataDir,
};

if (!env.MEDIA_PLAYERX_ARCHIVE_EXTRACTOR_BIN && process.platform === "win32") {
  const sevenZip = "C:/Program Files/7-Zip/7z.exe";
  if (existsSync(sevenZip)) {
    env.MEDIA_PLAYERX_ARCHIVE_EXTRACTOR_BIN = sevenZip;
  }
}

if (!env.MEDIA_PLAYERX_FFMPEG_BIN && process.platform === "win32") {
  const ffmpeg = "C:/Tools/ffmpeg-7.1.1-essentials_build/bin/ffmpeg.exe";
  if (existsSync(ffmpeg)) {
    env.MEDIA_PLAYERX_FFMPEG_BIN = ffmpeg;
  }
}

if (!env.MEDIA_PLAYERX_FFPROBE_BIN && process.platform === "win32") {
  const ffprobe = "C:/Tools/ffmpeg-7.1.1-essentials_build/bin/ffprobe.exe";
  if (existsSync(ffprobe)) {
    env.MEDIA_PLAYERX_FFPROBE_BIN = ffprobe;
  }
}

const child = spawn(electronBinary, ["dist-electron/main.cjs"], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
  env,
});

await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code) => {
    if (code === 0) {
      resolve(undefined);
      return;
    }
    reject(new Error(`electron exited: ${code ?? "null"}`));
  });
});
