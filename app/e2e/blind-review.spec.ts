import { expect, test } from '@playwright/test'

// The reader queue is behind the login wall and reads real rows from Supabase,
// so what an anonymous visitor can prove here is the gate itself. The
// "no author identity" guarantee for a signed-in reader lives in
// authenticated.spec.ts, where a real reader session is available.

test('the reader queue is behind the login wall', async ({ page }) => {
  await page.goto('/reader')
  await expect(page).toHaveURL(/\/login$/)
  await expect(
    page.getByRole('heading', { name: 'Staff sign in' }),
  ).toBeVisible()
})

test('a reader submission page is behind the login wall too', async ({
  page,
}) => {
  // A well-formed but non-existent submission id: the gate must stop the
  // request before any database lookup happens.
  await page.goto('/reader/00000000-0000-4000-8000-000000000000')
  await expect(page).toHaveURL(/\/login$/)
})
