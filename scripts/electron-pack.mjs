import { spawn } from "node:child_process";
import { verifySigningEnvironment } from "./verify-signing-env.mjs";
import { prepareOfflineSubtitlesComponent } from "./prepare-offline-subtitles-component.mjs";

const signed = process.argv.includes("--signed");
const skipOfflineSubtitlesComponent = process.argv.includes("--without-offline-subtitles-component");

if (signed) {
  verifySigningEnvironment();
}

const command = "npx";
const args = [
  "electron-builder",
  "--config",
  "electron-builder.config.cjs",
  "--win",
  "nsis",
  "--x64",
];
const env = {
  ...process.env,
};

if (!skipOfflineSubtitlesComponent) {
  const componentResult = prepareOfflineSubtitlesComponent();
  if (componentResult.prepared) {
    env.MPX_OFFLINE_SUBTITLE_COMPONENT_DIR = componentResult.componentRoot;
  }
}

if (signed) {
  env.MPX_WINDOWS_SIGN = "1";
}

const child = spawn(command, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
