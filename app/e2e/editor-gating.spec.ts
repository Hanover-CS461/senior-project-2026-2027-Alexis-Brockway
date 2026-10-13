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
