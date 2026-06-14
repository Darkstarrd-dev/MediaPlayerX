import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

function resolveNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function resolveElectronBinary(projectRoot) {
  return process.platform === "win32"
    ? path.join(projectRoot, "node_modules", ".bin", "electron.cmd")
    : path.join(projectRoot, "node_modules", ".bin", "electron");
}

function killProcessTree(pid) {
  if (!pid) {
    return;
  }
  if (process.platform === "win32") {
    // Windows 下子进程经 shell(cmd.exe) 包装，SIGTERM 只杀外层包装，底层 node/vite/electron
    // 会变孤儿继续占用端口；taskkill /T 连同整棵子进程树一并强杀，根除残留后端。
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // 进程已退出，忽略
    }
  }
}

function terminateChild(child) {
  if (!child) {
    return;
  }
  killProcessTree(child.pid);
}

function normalizeProxyServer(rawValue) {
  const value = String(rawValue ?? "").trim();
  if (!value) {
    return null;
  }

  if (value.startsWith("socks5h://")) {
    return `socks5://${value.slice("socks5h://".length)}`;
  }

  return value;
}

function resolveProxyServer(env) {
  return (
    normalizeProxyServer(env.MEDIA_PLAYERX_PROXY_SERVER) ??
    normalizeProxyServer(env.ALL_PROXY) ??
    normalizeProxyServer(env.all_proxy) ??
    normalizeProxyServer(env.HTTPS_PROXY) ??
    normalizeProxyServer(env.https_proxy) ??
    normalizeProxyServer(env.HTTP_PROXY) ??
    normalizeProxyServer(env.http_proxy)
  );
}

function withProxyEnv(baseEnv) {
  const env = { ...baseEnv };
  const proxyServer = resolveProxyServer(baseEnv);
  if (!proxyServer) {
    return env;
  }

  env.MEDIA_PLAYERX_PROXY_SERVER =
    env.MEDIA_PLAYERX_PROXY_SERVER ?? proxyServer;
  env.HTTP_PROXY = env.HTTP_PROXY ?? env.http_proxy ?? proxyServer;
  env.HTTPS_PROXY = env.HTTPS_PROXY ?? env.https_proxy ?? proxyServer;
  env.ALL_PROXY = env.ALL_PROXY ?? env.all_proxy ?? proxyServer;
  env.NO_PROXY = env.NO_PROXY ?? env.no_proxy ?? "localhost,127.0.0.1,::1";
  return env;
}

async function runCommand(projectRoot, command, args, env) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env,
      stdio: "inherit",
      shell: useShell,
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

const projectRoot = process.cwd();
const electronBinary = resolveElectronBinary(projectRoot);
const useShell = process.platform === "win32";
const devServerUrl =
  process.env.VITE_DEV_SERVER_URL ?? "http://127.0.0.1:5173";
const libraryRoot = path.resolve(
  process.env.MEDIA_PLAYERX_LIBRARY_ROOT ?? path.join(projectRoot, "library"),
);
const baseEnv = withProxyEnv(process.env);

await mkdir(libraryRoot, { recursive: true });

await runCommand(
  projectRoot,
  process.execPath,
  ["scripts/build-electron.mjs"],
  baseEnv,
);

// 初始构建（仅 vite build，tsc 已在 build-electron 中覆盖主进程类型检查）
await runCommand(
  projectRoot,
  path.join(projectRoot, "node_modules", ".bin", process.platform === "win32" ? "vite.cmd" : "vite"),
  ["build"],
  {
    ...baseEnv,
    VITE_MEDIA_REPOSITORY_MODE: "real",
    FORCE_COLOR: "1",
  },
);

const viteWatchProcess = spawn(
  path.join(projectRoot, "node_modules", ".bin", process.platform === "win32" ? "vite.cmd" : "vite"),
  ["build", "--watch"],
  {
    cwd: projectRoot,
    stdio: "inherit",
    shell: useShell,
    env: {
      ...baseEnv,
      VITE_MEDIA_REPOSITORY_MODE: "real",
    },
  },
);

let electronProcess = null;
let shuttingDown = false;

const shutdown = (exitCode) => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  terminateChild(electronProcess);
  terminateChild(viteWatchProcess);
  process.exit(exitCode);
};

process.once("SIGINT", () => shutdown(130));
process.once("SIGTERM", () => shutdown(143));
process.once("SIGHUP", () => shutdown(129));
process.on("exit", () => {
  // 兜底：任何路径退出时同步强杀子进程树，避免残留 vite/electron 后端占用端口
  terminateChild(electronProcess);
  terminateChild(viteWatchProcess);
});

viteWatchProcess.once("exit", (code) => {
  if (!shuttingDown && !electronProcess) {
    shutdown(code ?? 1);
  }
});

electronProcess = spawn(electronBinary, ["dist-electron/main.cjs"], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: useShell,
  env: {
    ...baseEnv,
    VITE_DEV_SERVER_URL: devServerUrl,
    VITE_MEDIA_REPOSITORY_MODE: "real",
    MEDIA_PLAYERX_LIBRARY_ROOT: libraryRoot,
  },
});

electronProcess.once("error", (error) => {
  console.error(error);
  shutdown(1);
});

electronProcess.once("exit", (code) => {
  shutdown(code ?? 0);
});
