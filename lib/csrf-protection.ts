/**
 * CSRF Protection Utilities
 * Provides CSRF token generation and validation for forms
 */

// In-memory storage for CSRF tokens (use Redis in production)
const csrfTokens = new Map<string, { token: string; createdAt: number }>()

// CSRF Token expiration time (5 minutes)
const CSRF_EXPIRATION = 5 * 60 * 1000

/**
 * Generate a CSRF token for a user session
 */
export function generateCsrfToken(sessionId: string): string {
  // Use cryptographically secure random generator
  const crypto = require('crypto')
  const token = crypto.randomBytes(32).toString('hex')

  // Store the token with timestamp
  csrfTokens.set(sessionId, {
    token,
    createdAt: Date.now()
  })

  return token
}

/**
 * Validate a CSRF token
 */
export function validateCsrfToken(sessionId: string, token: string): boolean {
  const stored = csrfTokens.get(sessionId)

  if (!stored) {
    return false
  }

  // Check if token has expired
  if (Date.now() - stored.createdAt > CSRF_EXPIRATION) {
    csrfTokens.delete(sessionId)
    return false
  }

  // Compare tokens securely
  return token === stored.token
}

/**
 * Clean up expired CSRF tokens
 */
export function cleanupExpiredCsrfTokens() {
  const now = Date.now()
  for (const [sessionId, stored] of csrfTokens.entries()) {
    if (now - stored.createdAt > CSRF_EXPIRATION) {
      csrfTokens.delete(sessionId)
    }
  }
}

// Set up periodic cleanup
setInterval(cleanupExpiredCsrfTokens, 60000) // Every minute

// Export for use in server actions
export const CSRF_CONFIG = {
  EXPIRATION: CSRF_EXPIRATION,
  MAX_TOKENS: 1000
}