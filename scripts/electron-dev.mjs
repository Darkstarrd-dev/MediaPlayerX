import { spawn, spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import net from "node:net";
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

// 查找正在监听指定端口的进程 PID（用于启动前回收残留后端）
function findPidsListeningOnPort(port) {
  const pids = new Set();
  if (process.platform === "win32") {
    const result = spawnSync("netstat", ["-ano"], { encoding: "utf8" });
    for (const line of (result.stdout ?? "").split(/\r?\n/)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 5 || parts[0] !== "TCP") {
        continue;
      }
      const localAddress = parts[1] ?? "";
      const state = parts[3] ?? "";
      const pid = Number(parts[4]);
      if (
        state === "LISTENING" &&
        localAddress.endsWith(`:${port}`) &&
        Number.isInteger(pid) &&
        pid > 0
      ) {
        pids.add(pid);
      }
    }
  } else {
    const result = spawnSync("lsof", ["-ti", `tcp:${port}`], {
      encoding: "utf8",
    });
    for (const line of (result.stdout ?? "").split(/\r?\n/)) {
      const pid = Number(line.trim());
      if (Number.isInteger(pid) && pid > 0) {
        pids.add(pid);
      }
    }
  }
  return [...pids];
}

// 启动自愈：若 dev 端口已被上次未正常退出的残留后端占用，则回收后再启动，
// 避免 --strictPort 直接撞「端口已占用」失败。
async function reclaimDevServerPort(host, port) {
  if (!(await canConnect(host, port))) {
    return;
  }
  const pids = findPidsListeningOnPort(port);
  if (pids.length === 0) {
    return;
  }
  console.warn(
    `[dev:desktop] 端口 ${port} 被既有进程占用(PID: ${pids.join(", ")})，回收残留后端后再启动`,
  );
  for (const pid of pids) {
    killProcessTree(pid);
  }
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!(await canConnect(host, port))) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  console.warn(`[dev:desktop] 端口 ${port} 回收后仍被占用，继续启动可能失败`);
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

async function canConnect(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });

    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    socket.setTimeout(1000);
    socket.once("connect", () => {
      cleanup();
      resolve(true);
    });
    socket.once("error", () => {
      cleanup();
      resolve(false);
    });
    socket.once("timeout", () => {
      cleanup();
      resolve(false);
    });
  });
}

async function waitForServer(host, port, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await canConnect(host, port)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  throw new Error(`vite dev server not ready: ${host}:${port}`);
}

const projectRoot = process.cwd();
const npmCommand = resolveNpmCommand();
const electronBinary = resolveElectronBinary(projectRoot);
const useShell = process.platform === "win32";
const devPort = Number(process.env.MEDIA_PLAYERX_DEV_PORT ?? 5173);
const devServerUrl =
  process.env.VITE_DEV_SERVER_URL ?? `http://127.0.0.1:${devPort}`;
const parsedDevServerUrl = new URL(devServerUrl);
const devServerHost = parsedDevServerUrl.hostname;
const devServerPort = Number(
  parsedDevServerUrl.port ||
    (parsedDevServerUrl.protocol === "https:" ? 443 : 80),
);
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

await reclaimDevServerPort(devServerHost, devServerPort);

const viteProcess = spawn(
  npmCommand,
  [
    "run",
    "dev",
    "--",
    "--host",
    "127.0.0.1",
    "--port",
    String(devPort),
    "--strictPort",
  ],
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
  terminateChild(viteProcess);
  process.exit(exitCode);
};

process.once("SIGINT", () => shutdown(130));
process.once("SIGTERM", () => shutdown(143));
process.once("SIGHUP", () => shutdown(129));
process.on("exit", () => {
  // 兜底：任何路径退出时同步强杀子进程树，避免残留 vite/electron 后端占用端口
  terminateChild(electronProcess);
  terminateChild(viteProcess);
});

viteProcess.once("exit", (code) => {
  if (!shuttingDown && !electronProcess) {
    shutdown(code ?? 1);
  }
});

try {
  await waitForServer(devServerHost, devServerPort, 90_000);
} catch (error) {
  console.error(error);
  shutdown(1);
}

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
