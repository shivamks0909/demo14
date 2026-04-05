/**
 * Enhanced Security Middleware
 * Provides additional security layers beyond the basic middleware
 */

import { NextRequest, NextResponse } from 'next/server'
import { SECURITY_HEADERS } from '@/lib/security-config'

import { randomUUID } from 'crypto'

export async function securityMiddleware(request: NextRequest) {
  const response = NextResponse.next()
  const nonce = randomUUID().replace(/-/g, '')

  // Apply base security headers from config
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    response.headers.set(header, value)
  })

  // Content Security Policy with nonce
  response.headers.set('Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests`
  )
  response.headers.set('x-csp-nonce', nonce)

  // HSTS - only on HTTPS requests
  const proto = request.headers.get('x-forwarded-proto')
  if (proto === 'https') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  // Cross-Origin Security Headers
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')

  // Permissions Policy
  response.headers.set('Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=()'
  )

  // Standard Security Headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')

  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  response.headers.set('Expect-CT', 'max-age=86400, enforce')

  // For admin routes, add additional protections
  if (request.nextUrl.pathname.startsWith('/admin')) {
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