import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Electron loads the production bundle via file://, so we need relative asset paths.
  base: command === 'build' ? './' : '/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/zustand/')) {
            return 'vendor-react'
          }

          if (id.includes('/three/')) {
            return 'vendor-three'
          }

          if (id.includes('/axios/') || id.includes('/cheerio/') || id.includes('/zod/')) {
            return 'vendor-data'
          }

          return 'vendor-misc'
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 5,
        functions: 5,
        statements: 5,
        branches: 3,
      },
    },
  },
}))
