import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// GitHub Pages serves the app from a subpath of the Jekyll site, so a
// production build needs a matching base. The dev server stays at '/', which
// keeps http://localhost:5173/ and the Playwright specs unchanged.
const PAGES_BASE = '/senior-project-2026-2027-Alexis-Brockway/app/'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? PAGES_BASE : '/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./test/setup.ts'],
    testTimeout: 15000,
  },
}))
