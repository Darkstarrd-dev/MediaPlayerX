import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Electron loads the production bundle via file://, so we need relative asset paths.
  base: command === "build" ? "./" : "/",
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
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

          if (normalizedId.includes("/src/components/fullscreen/")) {
            return "ui-fullscreen";
          }

          if (normalizedId.includes("/src/components/MusicMainSection")) {
            return "ui-music-main";
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

          if (normalizedId.includes("/three/")) {
            return "vendor-three";
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
}));
