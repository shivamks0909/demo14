/**
 * Input Validation Utilities
 * Sanitize and validate user inputs across the application
 */

/**
 * Validate a string input against length and pattern constraints
 */
export function validateInput(input: string, maxLength: number = 255, pattern: RegExp = /^[a-zA-Z0-9_-]+$/): boolean {
    if (!input || typeof input !== 'string') return false
    if (input.length > maxLength) return false
    return pattern.test(input)
}

/**
 * Sanitize a string by removing potentially dangerous characters
 */
export function sanitizeString(input: string): string {
    return input
        .replace(/[<>'"&]/g, '') // Remove HTML/script tags
        .replace(/[;\\]/g, '') // Remove SQL injection chars
        .trim()
}

/**
 * Validate project code format
 */
export function validateProjectCode(code: string): boolean {
    return validateInput(code, 50, /^[a-zA-Z0-9_-]+$/)
}

/**
 * Validate clickid/session ID format
 */
export function validateSessionId(id: string): boolean {
    // Allow UUIDs and custom IDs
    return validateInput(id, 255, /^[a-zA-Z0-9_-]+$/)
}

/**
 * Validate callback type
 */
export function validateCallbackType(type: string): boolean {
    const validTypes = ['complete', 'terminate', 'quota_full', 'security_terminate']
    return validTypes.includes(type)
}

/**
 * Detect device type from user agent
 */
export function detectDevice(userAgent: string): string {
    const ua = userAgent.toLowerCase()
    if (/mobile|android|iphone|ipod/i.test(ua)) return 'mobile'
    if (/tablet|ipad/i.test(ua)) return 'tablet'
    return 'desktop'
}

/**
 * Sanitize log data - remove sensitive fields
 */
export function sanitizeLogData(data: Record<string, any>): Record<string, any> {
    const sanitized = { ...data }
    const sensitiveFields = ['password', 'secret', 'token', 'api_key', 'authorization']
    
    for (const field of sensitiveFields) {
        delete sanitized[field]
    }
    
    return sanitized
}
