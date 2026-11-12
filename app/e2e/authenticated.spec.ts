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

  // click() resolves the moment the event is dispatched, not when the
  // sign-in round-trip finishes — so a caller that navigates next can reload
  // the app before the session is persisted, and RequireAuth then bounces
  // (correctly) to /login. Wait for the post-login redirect instead.
  await expect(page).not.toHaveURL(/\/login$/)
}

test.describe('authenticated roles', () => {
  test.skip(!hasCreds, 'TEST_* credentials not set (see app/.env.test.example)')

  test('a reader lands in the queue, and is stopped at the editor door', async ({
    page,
  }) => {
    await signIn(
      page,
      process.env.TEST_READER_EMAIL!,
      process.env.TEST_READER_PASSWORD!,
    )

    // Sign-in routes by role. A Reader used to land on /editor and be told they
    // had no business there — correct, but a dead end on their first click.
    await expect(page).toHaveURL(/\/reader$/)

    await page.goto('/editor')
    await expect(
      page.getByText('You need an editor role to view this page.'),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Go to your reader queue →' }),
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

  test('the chief editor can export the submissions as CSV', async ({
    page,
  }) => {
    await signIn(
      page,
      process.env.TEST_CHIEF_EMAIL!,
      process.env.TEST_CHIEF_PASSWORD!,
    )
    await expect(
      page.getByRole('heading', { name: 'Editor dashboard' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Export' }).click()

    // Read-only: the export is a set of GETs through the signed-in session, so
    // this proves the club can get its data out without mutating anything.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download Submissions as CSV' }).click(),
    ])

    expect(download.suggestedFilename()).toMatch(
      /^kennings-submissions-\d{4}-\d{2}-\d{2}\.csv$/,
    )
    await expect(page.getByText(/Downloaded kennings-submissions-/)).toBeVisible()
  })
})
