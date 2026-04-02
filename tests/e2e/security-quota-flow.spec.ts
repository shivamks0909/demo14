import { test, expect } from '@playwright/test';

test.describe('Security & Quota Enforcement E2E', () => {

  test.beforeAll(async ({ browser }) => {
    // Standard setup: ensure we are logged in and DB is ready
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@opinioninsights.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.goto('/admin/projects'); 
    await context.close();
  });

  test('Duplicate UID rejection redirects to /duplicate-string', async ({ page }) => {
    const mockUid = `DUPE_TEST_${Date.now()}`;
    const projectCode = 'DEMO001';
    const trackingUrl = `/r/${projectCode}/SUP001/${mockUid}`;
    
    // First entry: success redirect to target
    await page.goto(trackingUrl);
    expect(page.url()).not.toContain('/duplicate-string');
    
    // Second entry with same UID: block
    await page.goto(trackingUrl);
    expect(page.url()).toContain('/duplicate-string');
  });

  test('IP Throttling blocks the 4th request within 1 minute', async ({ page }) => {
    const projectCode = 'DEMO002';
    
    // Perform 3 rapid entries (the limit is 3)
    for (let i = 1; i <= 3; i++) {
        const uid = `IP_THROTTLE_${i}_${Date.now()}`;
        await page.goto(`/r/${projectCode}/SUP001/${uid}`);
        expect(page.url()).not.toContain('/security-terminate');
    }
    
    // 4th entry: should be throttled
    const finalUid = `IP_THROTTLE_4_${Date.now()}`;
    await page.goto(`/r/${projectCode}/SUP001/${finalUid}`);
    expect(page.url()).toContain('/security-terminate');
  });

  test('Project Paused enforcement', async ({ page }) => {
    // DEMO003 is 'paused' in seed-db.js
    const projectCode = 'DEMO003';
    const uid = `PAUSE_TEST_${Date.now()}`;
    
    await page.goto(`/r/${projectCode}/SUP001/${uid}`);
    expect(page.url()).toContain('/paused');
    expect(page.url()).toContain('title=PROJECT_PAUSED');
  });

});
