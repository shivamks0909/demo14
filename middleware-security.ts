/**
 * Enhanced Security Middleware
 * Provides additional security layers beyond the basic middleware
 */

import { NextRequest, NextResponse } from 'next/server'
import { SECURITY_HEADERS } from '@/lib/security-config'

export async function securityMiddleware(request: NextRequest) {
  const response = NextResponse.next()

  // Apply security headers
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    response.headers.set(header, value)
  })

  // Add additional security headers
  response.headers.set('Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;"
  )

  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  response.headers.set('Expect-CT', 'max-age=86400, enforce')

  // For admin routes, add additional protections
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Add stricter session management for admin area
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
  }

  return response
}

// Export security configurations
export const SECURITY_CONFIG = {
  RATE_LIMITING: {
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_TIME: 15 * 60 * 1000,
    MAX_REQUESTS_PER_MINUTE: 100
  },

  INPUT_VALIDATION: {
    MAX_INPUT_LENGTH: 1000,
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    SANITIZE_HTML: true
  }
}