/**
 * Global Rate Limiter
 * In-memory rate limiting for API endpoints
 */

interface RateLimitRecord {
    count: number
    resetAt: number
}

const rateLimitStore = new Map<string, RateLimitRecord>()

/**
 * Check if a request is within rate limits
 * @param key - Unique identifier (IP, session, etc.)
 * @param maxRequests - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(key: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now()
    const record = rateLimitStore.get(key)

    if (!record || now > record.resetAt) {
        rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
        return true
    }

    if (record.count >= maxRequests) {
        return false
    }

    record.count++
    return true
}

/**
 * Clean up expired rate limit records
 * Call periodically to prevent memory leaks
 */
export function cleanupRateLimits(): void {
    const now = Date.now()
    for (const [key, record] of rateLimitStore.entries()) {
        if (now > record.resetAt) {
            rateLimitStore.delete(key)
        }
    }
}

// Cleanup every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000)
