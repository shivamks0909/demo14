import { test, expect } from '@playwright/test';

test.describe('Phase 2 & 3: Authentication and Dashboard', () => {

  test('Protected routes redirect to login and prevent unauthorized access', async ({ page }) => {
    // Attempting to access dashboard directly should yield a redirect to login
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/.*\/login\?redirect=%2Fadmin%2Fdashboard/);
    await expect(page.locator('h2', { hasText: 'Admin Login' })).toBeVisible();
  });

  test('Valid Login flows into Dashboard and sets secure admin_session', async ({ page }) => {
    await page.goto('/login');
    
    // Fill credentials corresponding to the mock 'seed' data or bypass. 
    // Assuming standard dummy setup or bcrypt comparison works natively
    await page.fill('input[name="email"]', 'admin@opinioninsights.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Upon successful server action processing, redirects to /admin/dashboard
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    // Verify session persistence token injected by Next.js Server Action
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'admin_session');
    expect(sessionCookie).toBeDefined();

    // PHASE 3.2 - Verify Navigation Layouts Load Successfully
    await expect(page.locator('h1', { hasText: 'Intelligence Command' })).toBeVisible();
  });

});
