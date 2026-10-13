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
})
