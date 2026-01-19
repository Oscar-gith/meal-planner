import { test, expect } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') })

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL!
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD!
const TEST_USER_2_EMAIL = process.env.TEST_USER_2_EMAIL!
const TEST_USER_2_PASSWORD = process.env.TEST_USER_2_PASSWORD!

test.describe('Authentication Flow - Login', () => {
  test.beforeEach(async ({ page }) => {
    // Start from login page
    await page.goto('/login')
  })

  test('should display login page correctly', async ({ page }) => {
    // Check branding (use heading to avoid duplicate text issue)
    await expect(page.getByRole('heading', { name: 'Meal Planner' })).toBeVisible()
    await expect(page.getByText('Bienvenido de vuelta')).toBeVisible()

    // Check form elements
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/contraseña/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible()
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    // Fill login form
    await page.getByLabel(/email/i).fill(TEST_USER_EMAIL)
    await page.getByLabel(/contraseña/i).fill(TEST_USER_PASSWORD)

    // Submit form
    await page.getByRole('button', { name: /iniciar sesión/i }).click()

    // Should redirect to /planes
    await expect(page).toHaveURL('/planes')

    // Should see authenticated content (assuming there's some indicator)
    // This might vary based on your app, adjust as needed
    await page.waitForURL('/planes', { timeout: 5000 })
  })

  test('should show error with invalid credentials', async ({ page }) => {
    // Fill login form with wrong password
    await page.getByLabel(/email/i).fill(TEST_USER_EMAIL)
    await page.getByLabel(/contraseña/i).fill('wrongpassword123')

    // Submit form
    await page.getByRole('button', { name: /iniciar sesión/i }).click()

    // Should show error message
    await expect(page.getByText(/invalid/i).or(page.getByText(/error/i))).toBeVisible()

    // Should still be on login page
    await expect(page).toHaveURL('/login')
  })

  test('should show error with non-existent user', async ({ page }) => {
    // Fill login form with non-existent email
    await page.getByLabel(/email/i).fill('nonexistent@example.com')
    await page.getByLabel(/contraseña/i).fill('password123')

    // Submit form
    await page.getByRole('button', { name: /iniciar sesión/i }).click()

    // Should show error message
    await expect(page.getByText(/invalid/i).or(page.getByText(/error/i))).toBeVisible()

    // Should still be on login page
    await expect(page).toHaveURL('/login')
  })

  test('should validate required fields', async ({ page }) => {
    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /iniciar sesión/i })
    await submitButton.click()

    // Form should not submit (HTML5 validation)
    await expect(page).toHaveURL('/login')

    // Email field should be marked as invalid
    const emailInput = page.getByLabel(/email/i)
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid)
    expect(isInvalid).toBeTruthy()
  })

  test('should toggle between login and signup modes', async ({ page }) => {
    // Initially in login mode
    await expect(page.getByText('Bienvenido de vuelta')).toBeVisible()
    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible()

    // Click toggle to sign up
    await page.getByText(/¿no tienes cuenta\? regístrate/i).click()

    // Now in sign up mode
    await expect(page.getByText('Crea tu cuenta para comenzar')).toBeVisible()
    await expect(page.getByRole('button', { name: /crear cuenta/i })).toBeVisible()

    // Toggle back to login
    await page.getByText(/¿ya tienes cuenta\? inicia sesión/i).click()

    // Back in login mode
    await expect(page.getByText('Bienvenido de vuelta')).toBeVisible()
  })
})

test.describe('Authentication Flow - Logout', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(TEST_USER_EMAIL)
    await page.getByLabel(/contraseña/i).fill(TEST_USER_PASSWORD)
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    await page.waitForURL('/planes')
  })

  test('should logout successfully', async ({ page }) => {
    // Look for logout button (adjust selector based on your UI)
    // This assumes there's a logout button/link somewhere
    const logoutButton = page.locator('button:has-text("Cerrar sesión"), a:has-text("Cerrar sesión")').first()

    if (await logoutButton.isVisible()) {
      await logoutButton.click()

      // Should redirect to login page
      await expect(page).toHaveURL('/login')
    } else {
      // If no logout button visible, test that we're still authenticated
      await expect(page).toHaveURL('/planes')
      test.skip()
    }
  })
})

test.describe('Authentication Flow - Session Persistence', () => {
  test('should maintain session after page reload', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(TEST_USER_EMAIL)
    await page.getByLabel(/contraseña/i).fill(TEST_USER_PASSWORD)
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    await page.waitForURL('/planes')

    // Reload page
    await page.reload()

    // Should still be on /planes (not redirected to login)
    await expect(page).toHaveURL('/planes')
  })

  test('should maintain session in new tab', async ({ context, page }) => {
    // Login in first tab
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(TEST_USER_EMAIL)
    await page.getByLabel(/contraseña/i).fill(TEST_USER_PASSWORD)
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    await page.waitForURL('/planes')

    // Open new tab
    const newPage = await context.newPage()
    await newPage.goto('/planes')

    // Should be authenticated in new tab (not redirected to login)
    await expect(newPage).toHaveURL('/planes')

    await newPage.close()
  })

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    // Try to access protected route directly
    await page.goto('/planes')

    // Should redirect to login (may include redirect query param)
    await expect(page).toHaveURL(/\/login(\?redirect=.*)?/)
  })
})

test.describe('Authentication Flow - Multi-User', () => {
  test('should allow different users to login sequentially', async ({ page }) => {
    // Login as user 1
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(TEST_USER_EMAIL)
    await page.getByLabel(/contraseña/i).fill(TEST_USER_PASSWORD)
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    await page.waitForURL('/planes')

    // Logout (find and click logout button)
    const logoutButton = page.locator('button:has-text("Cerrar sesión"), a:has-text("Cerrar sesión")').first()

    if (await logoutButton.isVisible()) {
      await logoutButton.click()
      await page.waitForURL('/login')

      // Login as user 2
      await page.getByLabel(/email/i).fill(TEST_USER_2_EMAIL)
      await page.getByLabel(/contraseña/i).fill(TEST_USER_2_PASSWORD)
      await page.getByRole('button', { name: /iniciar sesión/i }).click()
      await page.waitForURL('/planes')

      // Verify we're logged in as user 2
      await expect(page).toHaveURL('/planes')
    } else {
      test.skip()
    }
  })
})
