import { expect, test } from '@playwright/test'

test('signed-out visitors are redirected from the editor dashboard', async ({
  page,
}) => {
  await page.goto('/editor')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Staff sign in' })).toBeVisible()
})

test('signed-out visitors are redirected from an editor submission', async ({
  page,
}) => {
  await page.goto('/editor/sub-1')
  await expect(page).toHaveURL(/\/login$/)
})

// The demo box is a build-time switch (src/lib/demoMode.ts). It is on in dev by
// default and must be off for a build serving real manuscripts, where the
// credentials do not reach the bundle at all — so this spec skips rather than
// demanding a login that is deliberately absent. playwright.config.ts sets
// E2E_DEMO_ACCESS from the same env the dev server reads.
test.skip(
  process.env.E2E_DEMO_ACCESS === 'off',
  'demo access is disabled in this build (VITE_DEMO_MODE=false)',
)

test('the sign-in page hands a visitor a working demo account', async ({
  page,
}) => {
  await page.goto('/login')

  await expect(page.getByRole('heading', { name: 'Demo access' })).toBeVisible()
  await expect(page.getByText('kennings.chief@example.com')).toBeVisible()
  await expect(page.getByText('kennings.reader@example.com')).toBeVisible()

  // Present but not exercised here: the authenticated spec signs in for real.
  await expect(
    page.getByRole('button', { name: 'Sign in as Chief Editor' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Sign in as Reader' }),
  ).toBeVisible()
})
