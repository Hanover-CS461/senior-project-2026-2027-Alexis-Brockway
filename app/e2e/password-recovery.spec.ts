import { expect, test } from '@playwright/test'

// Password recovery, minus the email. Nothing here sends mail or writes a row:
// the request form is never submitted (that would consume the free tier's
// mailer quota and, for a real address, send a real link), and the reset page
// is visited with no session, which is exactly what an expired link looks like.
// The round trip needs an inbox, so it is checked by hand — see AGENTS.md §7.

test('the sign-in page offers a way back in', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('link', { name: 'Forgot your password?' }).click()
  await expect(page).toHaveURL(/\/forgot-password$/)
  await expect(
    page.getByRole('heading', { name: 'Forgot your password?' }),
  ).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
})

test('a reset link with no session explains that it expired', async ({ page }) => {
  await page.goto('/reset-password')
  await expect(
    page.getByRole('heading', { name: 'That link has expired' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Send a new reset link' }),
  ).toHaveAttribute('href', /\/forgot-password$/)
})

test('the reset form is reachable and goes back to sign in', async ({ page }) => {
  await page.goto('/forgot-password')
  await page.getByRole('link', { name: '← Back to sign in' }).click()
  await expect(page).toHaveURL(/\/login$/)
})
