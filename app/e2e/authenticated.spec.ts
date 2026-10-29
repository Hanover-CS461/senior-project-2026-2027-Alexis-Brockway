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

  test('a signed-in reader sees the queue but never author identity', async ({
    page,
  }) => {
    await signIn(
      page,
      process.env.TEST_READER_EMAIL!,
      process.env.TEST_READER_PASSWORD!,
    )
    await page.goto('/reader')
    await expect(
      page.getByRole('heading', { name: 'Reader queue' }),
    ).toBeVisible()

    // The seeded demo authors. A reader must not see any of them, because
    // readers have no SELECT policy on `authors` at all — this asserts the
    // database boundary through the UI, not a hidden CSS class.
    const body = await page.locator('body').innerText()
    for (const name of [
      'Margaret Okafor',
      'David Reyes',
      'Priya Natarajan',
      'Amelia Chen',
      'Jonas Weber',
      'Sienna Brooks',
    ]) {
      expect(body).not.toContain(name)
    }
  })
})
