import { expect, test } from '@playwright/test'

// Browser-level proof that role gating holds once someone is signed in:
// a Reader is stopped at the editor door, the Chief Editor walks through.
//
// Credentials come from app/.env.test (see .env.test.example). When they are
// absent, the spec is skipped.

const hasCreds = Boolean(
  process.env.TEST_READER_EMAIL &&
    process.env.TEST_READER_PASSWORD &&
    process.env.TEST_CHIEF_EMAIL &&
    process.env.TEST_CHIEF_PASSWORD,
)

async function signIn(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.locator('form button[type="submit"]').click()
}

test.describe('authenticated roles', () => {
  test.skip(!hasCreds, 'TEST_* credentials not set (see app/.env.test.example)')

  test('a reader is blocked from the editor dashboard', async ({ page }) => {
    await signIn(
      page,
      process.env.TEST_READER_EMAIL!,
      process.env.TEST_READER_PASSWORD!,
    )
    await expect(
      page.getByText('You need an editor role to view this page.'),
    ).toBeVisible()
  })

  test('the chief editor reaches the dashboard', async ({ page }) => {
    await signIn(
      page,
      process.env.TEST_CHIEF_EMAIL!,
      process.env.TEST_CHIEF_PASSWORD!,
    )
    await expect(
      page.getByRole('heading', { name: 'Editor dashboard' }),
    ).toBeVisible()
  })
})
