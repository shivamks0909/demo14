import { test, expect } from '@playwright/test';

test.describe('Middleware Security Headers Validation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/logout');
    await page.waitForTimeout(500);
  });

  test('should set all required security headers on protected admin routes', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/.*\/login/);
    
    const response = await page.goto('/admin/dashboard');
    if (!response) throw new Error('Failed to get response from /admin/dashboard');
    const headers = response.headers();

    expect(headers['content-security-policy']).toBeDefined();
    expect(headers['content-security-policy']).toMatch(/default-src 'self'/);
    expect(headers['content-security-policy']).toMatch(/script-src 'self' 'nonce-/);
    expect(headers['content-security-policy']).toMatch(/style-src 'self' 'nonce-/);

    if (headers['strict-transport-security']) {
      expect(headers['strict-transport-security']).toContain('max-age=');
      expect(headers['strict-transport-security']).toContain('includeSubDomains');
      expect(headers['strict-transport-security']).toContain('preload');
    }

    expect(headers['permissions-policy']).toBeDefined();
    expect(headers['permissions-policy']).toContain('geolocation=()');
    expect(headers['permissions-policy']).toContain('microphone=()');
    expect(headers['permissions-policy']).toContain('camera=()');

    expect(headers['x-content-type-options']).toBeDefined();
    expect(headers['x-content-type-options'].toLowerCase()).toBe('nosniff');

    expect(headers['x-frame-options']).toBeDefined();
    expect(headers['x-frame-options'].toUpperCase()).toBe('DENY');

    expect(headers['referrer-policy']).toBeDefined();
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');

    expect(headers['x-xss-protection']).toBeDefined();
    expect(headers['x-xss-protection']).toBe('1; mode=block');

    expect(headers['x-csp-nonce']).toBeDefined();
  });

  test('should generate unique CSP nonce for each request', async ({ page }) => {
    const responses = [];
    for (let i = 0; i < 3; i++) {
      const response = await page.goto('/admin/dashboard');
      if (!response) continue;
      const nonce = response.headers()['x-csp-nonce'];
      if (nonce) responses.push(nonce);
      await page.waitForTimeout(100);
    }
    if (responses.length >= 2) {
      const uniqueNonces = new Set(responses);
      expect(uniqueNonces.size).toBe(responses.length);
    }
  });

  test('login page should also have security headers', async ({ page }) => {
    const response = await page.goto('/login');
    if (!response) throw new Error('Failed to get response from /login');
    const headers = response.headers();
    expect(headers['content-security-policy']).toBeDefined();
    expect(headers['x-frame-options']).toBeDefined();
    expect(headers['x-content-type-options']).toBeDefined();
    expect(headers['referrer-policy']).toBeDefined();
    expect(headers['permissions-policy']).toBeDefined();
  });

  test('should skip middleware for static assets and health checks', async ({ page }) => {
    const nextResponse = await page.goto('/_next/static/chunks/main-app.js');
    if (nextResponse) {
      expect(nextResponse.headers()['x-csp-nonce']).toBeUndefined();
    }

    const healthResponse = await page.goto('/api/health');
    if (healthResponse) {
      expect(healthResponse.headers()['x-csp-nonce']).toBeUndefined();
    }
  });

  test('CSP header blocks inline scripts without nonce', async ({ page }) => {
    const response = await page.goto('/admin/dashboard');
    if (!response) throw new Error('Failed to get response from /admin/dashboard');
    const csp = response.headers()['content-security-policy'];
    expect(csp).toContain("script-src 'self' 'nonce-");
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).toContain("frame-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain('upgrade-insecure-requests');
  });

  test('Permissions-Policy restricts dangerous browser features', async ({ page }) => {
    const response = await page.goto('/admin/dashboard');
    if (!response) throw new Error('Failed to get response from /admin/dashboard');
    const pp = response.headers()['permissions-policy'];
    expect(pp).toBeDefined();
    expect(pp).toContain('geolocation=()');
    expect(pp).toContain('microphone=()');
    expect(pp).toContain('camera=()');
    expect(pp).not.toMatch(/geolocation=\*/);
  });

  test('API admin routes maintain security headers on redirect', async ({ page }) => {
    const response = await page.goto('/api/admin/projects');
    if (!response) throw new Error('Failed to get response from /api/admin/projects');
    expect(response.status()).toBeGreaterThanOrEqual(300);
    const headers = response.headers();
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
  });
});
