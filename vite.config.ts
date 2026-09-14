import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: { exclude: ['@techstark/opencv-js'] },
  worker: { format: 'es' },
  test: { environment: 'node', include: ['tests/**/*.test.ts'], testTimeout: 60000, hookTimeout: 60000 },
})
