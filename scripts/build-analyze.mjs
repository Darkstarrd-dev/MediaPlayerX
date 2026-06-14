// Cross-platform wrapper that enables bundle visualization (ANALYZE=true) and
// then runs `vite build`. Avoids the `VAR=val cmd` syntax that does not work
// under Windows cmd.exe. See vite.config.ts `visualizer` plugin gating.
process.env.ANALYZE = "true";
import { spawnSync } from "node:child_process";

const result = spawnSync("npx", ["vite", "build"], {
  stdio: "inherit",
  shell: true,
  cwd: process.cwd(),
});

process.exit(result.status ?? 0);
