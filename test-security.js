#!/usr/bin/env node

/**
 * Security Headers Test
 * Tests that the middleware properly sets security headers on responses
 */

const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Required security headers and their expected values or patterns
const SECURITY_HEADERS = [
  {
    name: 'Content-Security-Policy',
    expected: /default-src 'self'/,
    description: 'CSP header should restrict resources to self'
  },
  {
    name: 'Strict-Transport-Security',
    expected: /max-age=31536000.*includeSubDomains.*preload/i,
    description: 'HSTS should enforce HTTPS with preload'
  },
  {
    name: 'X-Frame-Options',
    expected: /^DENY$/i,
    description: 'X-Frame-Options should be DENY to prevent clickjacking'
  },
  {
    name: 'X-Content-Type-Options',
    expected: /^nosniff$/i,
    description: 'X-Content-Type-Options should be nosniff'
  },
  {
    name: 'Referrer-Policy',
    expected: /^strict-origin-when-cross-origin$/i,
    description: 'Referrer-Policy should be strict-origin-when-cross-origin'
  },
  {
    name: 'X-XSS-Protection',
    expected: /^1.*mode=block$/i,
    description: 'X-XSS-Protection should be enabled'
  }
];

function request(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    http.get(url.toString(), (res) => {
      resolve({
        statusCode: res.statusCode,
        headers: res.headers
      });
    }).on('error', reject);
  });
}

async function testSecurityHeaders() {
  console.log('='.repeat(60));
  console.log('SECURITY HEADERS TEST');
  console.log('='.repeat(60));
  console.log(`Target: ${BASE_URL}`);
  console.log('');

  let passed = 0;
  let failed = 0;

  try {
    // We need to hit a route that triggers the middleware.
    // According to middleware.ts config, the matcher includes:
    // '/admin/:path*', '/api/admin/:path*', '/login'
    // We'll test the /admin route (it may redirect to login, but headers should still be set)
    const res = await request('/admin');

    console.log(`Response status: ${res.statusCode}`);
    console.log('Checking headers:');
    console.log('');

    for (const header of SECURITY_HEADERS) {
      const value = res.headers[header.name.toLowerCase()];
      if (value) {
        if (header.expected.test(value)) {
          console.log(`  ✅ ${header.name}: ${value}`);
          passed++;
        } else {
          console.log(`  ❌ ${header.name}: ${value} (expected pattern: ${header.expected})`);
          failed++;
        }
      } else {
        console.log(`  ❌ ${header.name}: Missing`);
        failed++;
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log(`RESULTS: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(60));

    if (failed > 0) {
      console.log('\n❌ Security headers test FAILED');
      process.exit(1);
    } else {
      console.log('\n✅ All security headers present and correctly configured');
      process.exit(0);
    }

  } catch (error) {
    console.error('Error during test:', error.message);
    console.log('\n❌ Test FAILED due to error');
    process.exit(1);
  }
}

// If server not ready, wait a bit
async function waitForServer(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await request('/');
      return true;
    } catch (error) {
      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  return false;
}

async function main() {
  console.log('Starting security headers test...\n');

  if (!await waitForServer()) {
    console.error('✗ Server is not running');
    console.error('Please start the dev server first: npm run dev');
    process.exit(1);
  }

  await testSecurityHeaders();
}

main().catch(console.error);
