# Browser-Based Testing Guide

## Running Security Tests in Browser

To test the security improvements in your browser, follow these steps:

## 1. Start the Development Server

First, make sure your application is running:

```bash
npm run dev
```

Then visit `http://localhost:3000` in your browser.

## 2. Manual Browser Testing Steps

### A. Authentication Security Testing

1. **Login Page Testing**:
   - Navigate to `http://localhost:3000/login`
   - Test with invalid credentials to verify rate limiting
   - Test with valid credentials (admin@opinioninsights.com / admin123)
   - Verify security headers are present in network inspector

2. **Session Management**:
   - Login to the admin panel
   - Open browser developer tools (F12)
   - Check Network tab for security headers in responses
   - Verify session cookie properties (HttpOnly, Secure, SameSite)

### B. XSS Protection Testing

1. **Project Creation Test**:
   - Navigate to `/admin/projects`
   - Try creating a project with potentially dangerous content:
     - Project name: `<script>alert('XSS')</script>`
     - Project code: `TEST<script>alert("XSS")</script>`
   - Verify content is properly sanitized in the UI

2. **Data Display Testing**:
   - Create projects with special characters
   - Check that all content renders safely without executing scripts

### C. Form Validation Testing

1. **Input Validation**:
   - Try submitting forms with:
     - Empty required fields
     - Invalid email formats
     - Excessively long inputs
   - Verify proper error messages without information leakage

## 3. Browser Developer Tools Usage

### Network Tab Testing:
1. Open Developer Tools (F12)
2. Go to Network tab
3. Refresh the page
4. Check for security headers in response headers:
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - X-XSS-Protection: 1; mode=block
   - Strict-Transport-Security: max-age=31536000; includeSubDomains
   - Content-Security-Policy

### Console Testing:
1. Open Console tab in Developer Tools
2. Test JavaScript execution restrictions
3. Verify no security warnings or errors

## 4. Automated Browser Testing Tools

### Option 1: Playwright (Recommended)
Install Playwright for automated browser testing:

```bash
npm install @playwright/test
```

Create a basic test file (`test-security.spec.ts`):

```typescript
import { test, expect } from '@playwright/test';

test('should prevent XSS in project names', async ({ page }) => {
  await page.goto('http://localhost:3000/login');

  // Login
  await page.fill('#email', 'admin@opinioninsights.com');
  await page.fill('#password', 'admin123');
  await page.click('button[type="submit"]');

  // Navigate to projects
  await page.goto('http://localhost:3000/admin/projects');

  // Test XSS protection
  await page.fill('input[placeholder="e.g. Samsung Galaxy S24 Study"]', '<script>alert("XSS")</script>');
  await page.fill('input[placeholder="e.g. SAMSUNG_S24_01"]', 'TEST<script>alert("XSS")</script>');

  // Verify content is sanitized (should not contain actual script tags)
  const projectName = await page.inputValue('input[placeholder="e.g. Samsung Galaxy S24 Study"]');
  expect(projectName).not.toContain('<script>');
});
```

### Option 2: Cypress
Install Cypress:

```bash
npm install cypress --save-dev
```

Create a test in `cypress/e2e/security.cy.js`:

```javascript
describe('Security Testing', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/login');
    cy.get('#email').type('admin@opinioninsights.com');
    cy.get('#password').type('admin123');
    cy.get('button[type="submit"]').click();
  });

  it('should sanitize XSS in project names', () => {
    cy.visit('/admin/projects');

    // Try to inject XSS
    cy.get('input[placeholder="e.g. Samsung Galaxy S24 Study"]')
      .type('<script>alert("XSS")</script>');

    // Verify it's sanitized
    cy.get('input[placeholder="e.g. Samsung Galaxy S24 Study"]')
      .should('not.contain', '<script>');
  });
});
```

## 5. Security Testing Checklist

### Before Testing:
- [ ] Application is running with `npm run dev`
- [ ] All security improvements are implemented
- [ ] Environment variables are properly configured
- [ ] Browser developer tools are open

### During Testing:
- [ ] Verify all security headers are present
- [ ] Test authentication with rate limiting
- [ ] Check XSS protection in all UI components
- [ ] Validate input sanitization
- [ ] Confirm CSRF protection works
- [ ] Test session management

## 6. Security Testing Commands

### Run Playwright Tests:
```bash
npx playwright test
```

### Run Cypress Tests:
```bash
npx cypress run
```

### View Tests in Interactive Mode:
```bash
npx playwright test --ui
npx cypress open
```

## 7. Expected Test Results

Successful security testing should show:
- ✅ All security headers present in HTTP responses
- ✅ Rate limiting prevents brute force attacks
- ✅ XSS payloads are properly sanitized
- ✅ Form validation works correctly
- ✅ Session cookies have proper security flags
- ✅ No JavaScript execution from user inputs
- ✅ Error messages don't reveal system information

## 8. Troubleshooting Tips

If you encounter issues:
1. Clear browser cache and cookies
2. Check browser console for JavaScript errors
3. Verify application is running on correct port
4. Ensure all environment variables are set
5. Check network tab for security header presence

The application should now pass all security tests and be ready for production use with robust protection against common web vulnerabilities.