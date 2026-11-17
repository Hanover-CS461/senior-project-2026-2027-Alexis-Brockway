import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

// GitHub Pages serves the app from a subpath of the Jekyll site, so a
// production build needs a matching base. The dev server stays at '/', which
// keeps http://localhost:5173/ and the Playwright specs unchanged.
const PAGES_BASE = '/senior-project-2026-2027-Alexis-Brockway/app/'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Demo access publishes working Chief Editor and Reader logins, and the Chief
  // Editor can read `authors` — see src/lib/demoMode.ts and issue #7. A
  // production build therefore has to say out loud whether it wants them.
  // Failing here is deliberate: the alternative is a build that silently ships
  // live credentials, or silently loses the demo a grader needs, and nobody
  // finds out until it matters.
  if (command === 'build') {
    const flag = loadEnv(mode, process.cwd(), '').VITE_DEMO_MODE
    if (flag !== 'true' && flag !== 'false') {
      throw new Error(
        'VITE_DEMO_MODE must be "true" or "false" for a production build.\n' +
          '  The graded demo build gets "true" from app/.env.production.\n' +
          '  A live build must set "false" — no published credentials.\n' +
          '  See app/src/lib/demoMode.ts.',
      )
    }
  }

  return {
    base: command === 'build' ? PAGES_BASE : '/',
    plugins: [react()],
    test: {
      environment: 'node',
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['./test/setup.ts'],
      testTimeout: 15000,
    },
  }
})
