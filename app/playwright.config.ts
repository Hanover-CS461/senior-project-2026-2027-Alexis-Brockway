import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

for (const file of ['.env.test', '.env.test.local']) {
  if (existsSync(file)) process.loadEnvFile(file)
}

// When a separate test project is configured, run the app against it instead
// of the project in app/.env, and always boot a fresh dev server so the env
// actually takes effect.
const testProjectUrl = process.env.TEST_SUPABASE_URL
const testProjectKey = process.env.TEST_SUPABASE_ANON_KEY

const webServerEnv: Record<string, string> = {}
if (testProjectUrl) webServerEnv.VITE_SUPABASE_URL = testProjectUrl
if (testProjectKey) webServerEnv.VITE_SUPABASE_ANON_KEY = testProjectKey

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI && !testProjectUrl,
    timeout: 120000,
    env: webServerEnv,
  },
})
