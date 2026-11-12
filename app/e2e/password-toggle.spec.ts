import { expect, test } from '@playwright/test'

// The Show/Hide toggle on a password field. Read-only: it types into the field
// and flips the input's type, but never submits, so no session is created and
// no row is written.

test('the sign-in password field can be revealed and hidden again', async ({
  page,
}) => {
  await page.goto('/login')

  const password = page.getByLabel('Password', { exact: true })
  await password.fill('correct-horse-battery-staple')
  await expect(password).toHaveAttribute('type', 'password')

  await page.getByRole('button', { name: 'Show password' }).click()
  await expect(password).toHaveAttribute('type', 'text')
  await expect(password).toHaveValue('correct-horse-battery-staple')

  await page.getByRole('button', { name: 'Hide password' }).click()
  await expect(password).toHaveAttribute('type', 'password')
})

test('revealing the password does not submit the form', async ({ page }) => {
  // A <button> inside a <form> submits unless it says type="button". If that
  // ever regresses, clicking Show would try to sign in with an empty password
  // and the page would show an error instead of the characters.
  await page.goto('/login')
  await page.getByRole('button', { name: 'Show password' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.locator('.error')).toHaveCount(0)
})
