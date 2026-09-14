import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: { include: ['@techstark/opencv-js'] },   // pre-bundle: the UMD build has no ESM default export when served raw in dev
  worker: { format: 'es' },
  test: { environment: 'node', deps: { interopDefault: false }, include: ['tests/**/*.test.ts'], testTimeout: 60000, hookTimeout: 60000, fileParallelism: false },
})
