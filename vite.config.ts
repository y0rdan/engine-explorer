/// <reference types="vitest/config" />
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const engineModelRev = createHash('sha256')
  .update(readFileSync(new URL('./public/models/engine.glb', import.meta.url)))
  .digest('hex')
  .slice(0, 12)

// Project site: https://y0rdan.github.io/engine-explorer/
export default defineConfig({
  base: '/engine-explorer/',
  define: {
    __ENGINE_MODEL_REV__: JSON.stringify(engineModelRev),
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
