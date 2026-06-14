import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isCoverageRun = process.argv.some(
    (arg) => arg === "--coverage" || arg.startsWith("--coverage."),
  );
  const isAnalyzeRun = process.env.ANALYZE === "true";

  return {
    // Electron loads the production bundle via file://, so we need relative asset paths.
    base: command === "build" ? "./" : "/",
    plugins: [
      react(),
      // Bundle visualization is opt-in via ANALYZE=true so it never pollutes a
      // normal production build. Produces reports/bundle-stats.html.
      ...(isAnalyzeRun
        ? [
            visualizer({
              filename: "reports/bundle-stats.html",
              template: "treemap",
              gzipSize: true,
              brotliSize: true,
            }),
          ]
        : []),
    ],
    build: {
      minify: "esbuild",
      cssMinify: true,
      sourcemap: false,
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        treeshake: "recommended",
        output: {
          manualChunks: (id) => {
            const normalizedId = id.replace(/\\/g, "/");

            if (normalizedId.includes("/src/features/music-visualizer/")) {
              return "feature-visualizer";
            }

            if (normalizedId.includes("/src/features/app/")) {
              return "feature-app-runtime";
            }

            if (normalizedId.includes("/src/features/backend/")) {
              return "feature-backend-runtime";
            }

            if (normalizedId.includes("/src/components/metadata/")) {
              return "ui-metadata";
            }

            // The theme-parameter subsystem (catalogs + panel, ~14k LOC) is a
            // settings sub-panel opened on demand, not needed at first paint.
            // Splitting it out of the entry chunk keeps `index` within budget.
            if (normalizedId.includes("/src/components/theme-parameter/")) {
              return "ui-theme-parameter";
            }

            if (
              normalizedId.includes("/src/components/fullscreen/") ||
              normalizedId.includes("/src/components/MusicMainSection")
            ) {
              return "ui-media-playback";
            }

            if (!normalizedId.includes("/node_modules/")) {
              return undefined;
            }

            if (
              normalizedId.includes("/react/") ||
              normalizedId.includes("/react-dom/") ||
              normalizedId.includes("/zustand/")
            ) {
              return "vendor-react";
            }

            if (
              normalizedId.includes("/axios/") ||
              normalizedId.includes("/cheerio/") ||
              normalizedId.includes("/zod/")
            ) {
              return "vendor-data";
            }

            return "vendor-misc";
          },
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      globals: true,
      testTimeout: isCoverageRun ? 60000 : 15000,
      hookTimeout: isCoverageRun ? 60000 : 15000,
      teardownTimeout: isCoverageRun ? 60000 : 15000,
      // The heavy ThemeParameterPanel suite carries its own describe-level
      // timeout (60s) so both normal and coverage runs can stay parallel.
      // Coverage instrumentation adds per-test overhead that 60s comfortably
      // absorbs, while single-thread coverage would not finish in a reasonable
      // window.
      fileParallelism: true,
      maxWorkers: "50%",
      coverage: {
        provider: "v8",
        reporter: ["text", "html", "json-summary"],
        reportsDirectory: "./coverage",
        thresholds: {
          lines: 5,
          functions: 5,
          statements: 5,
          branches: 3,
        },
      },
    },
  };
});
