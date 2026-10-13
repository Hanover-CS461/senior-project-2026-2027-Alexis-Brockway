import { expect, test } from '@playwright/test'

const AUTHOR_NAMES = [
  'Margaret Okafor',
  'David Reyes',
  'Priya Natarajan',
  'Amelia Chen',
  'Jonas Weber',
  'Sienna Brooks',
]

test('the reader queue never reveals author identity', async ({ page }) => {
  await page.goto('/reader')
  await expect(page.getByRole('heading', { name: 'Reader queue' })).toBeVisible()
  await expect(page.getByText('Never the author')).toBeVisible()

  await expect(page.locator('.queue-author')).toHaveCount(0)

  const body = await page.locator('body').innerText()
  for (const name of AUTHOR_NAMES) {
    expect(body).not.toContain(name)
  }
})

test('the reader detail page shows the manuscript but no author', async ({
  page,
}) => {
  await page.goto('/reader/sub-1')
  await expect(
    page.getByRole('heading', { name: 'The Last Ferry' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your notes' })).toBeVisible()

  const body = await page.locator('body').innerText()
  for (const name of AUTHOR_NAMES) {
    expect(body).not.toContain(name)
  }
})
