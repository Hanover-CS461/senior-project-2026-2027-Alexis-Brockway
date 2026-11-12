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
