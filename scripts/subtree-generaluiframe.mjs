import { spawnSync } from "node:child_process";

const REMOTE_NAME = "general-ui-frame";
const REMOTE_URL = "https://github.com/Darkstarrd-dev/GeneralUIFrame.git";
const PREFIX = "apps/GeneralUIFrame";
const DEFAULT_BRANCH = "main";

function runGit(args, options = {}) {
  const result = spawnSync("git", args, {
    stdio: "inherit",
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function readGit(args) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
  });
  return result;
}

function ensureRemote() {
  const getUrl = readGit(["remote", "get-url", REMOTE_NAME]);

  if (getUrl.status !== 0) {
    runGit(["remote", "add", REMOTE_NAME, REMOTE_URL]);
    return;
  }

  const current = (getUrl.stdout ?? "").trim();
  if (current !== REMOTE_URL) {
    runGit(["remote", "set-url", REMOTE_NAME, REMOTE_URL]);
  }
}

function printUsage() {
  process.stdout.write(
    [
      "用法:",
      "  node scripts/subtree-generaluiframe.mjs setup",
      "  node scripts/subtree-generaluiframe.mjs pull [branch]",
      "  node scripts/subtree-generaluiframe.mjs push [branch]",
      "",
      "说明:",
      `  remote: ${REMOTE_NAME}`,
      `  prefix: ${PREFIX}`,
      `  default branch: ${DEFAULT_BRANCH}`,
      "",
    ].join("\n"),
  );
}

const action = process.argv[2] ?? "pull";
const branch = process.argv[3] ?? DEFAULT_BRANCH;

if (action === "setup") {
  ensureRemote();
  process.stdout.write(`已确保 remote: ${REMOTE_NAME} -> ${REMOTE_URL}\n`);
  process.exit(0);
}

if (action === "pull") {
  ensureRemote();
  runGit(["fetch", REMOTE_NAME, branch]);
  runGit(["subtree", "pull", `--prefix=${PREFIX}`, REMOTE_NAME, branch, "--squash"]);
  process.exit(0);
}

if (action === "push") {
  ensureRemote();
  runGit(["subtree", "push", `--prefix=${PREFIX}`, REMOTE_NAME, branch]);
  process.exit(0);
}

printUsage();
process.exit(1);
