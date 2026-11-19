import { expect, test } from '@playwright/test'

test('a writer can find the right form for a genre', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Submittable replacement' }),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Submit a manuscript' }).click()
  await expect(
    page.getByRole('heading', { name: 'What are you submitting?' }),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Submit Fiction' }).click()
  await expect(
    page.getByRole('heading', { name: /Fiction.*Submission Rules/ }),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Continue to Fiction form' }).click()
  await expect(page).toHaveURL(/\/submit\?genre=fiction/)

  // The anon half of the same truth the authenticated spec checks from the
  // other side: a visitor who is not signed in gets the form, because the
  // public insert policies are granted to `anon`. This half runs in CI, where
  // the authenticated spec is skipped. Read-only — nothing is submitted.
  await expect(
    page.getByRole('button', { name: 'Submit', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: "You're signed in" }),
  ).toHaveCount(0)
})
