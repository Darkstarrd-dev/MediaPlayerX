import { execSync } from "node:child_process";

function readPorcelainStatus() {
  return execSync("git status --porcelain", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

try {
  const status = readPorcelainStatus();
  if (status.length > 0) {
    console.error("Working tree is not clean. Commit/stash changes before baseline evaluation.");
    console.error(status);
    process.exit(1);
  }
  console.log("Working tree is clean.");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to verify working tree: ${message}`);
  process.exit(1);
}
