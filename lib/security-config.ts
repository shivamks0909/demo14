/**
 * Security Configuration Module
 * Centralized security settings and utilities for the application
 */

// Security headers configuration
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};

// Rate limiting configuration
export const RATE_LIMITING_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_TIME: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS_PER_MINUTE: 100,
  WINDOW_SIZE: 60 * 1000 // 1 minute
};

// Input validation rules
export const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  PROJECT_CODE_MAX_LENGTH: 100,
  CLIENT_NAME_MAX_LENGTH: 255,
  SUPPLIER_TOKEN_MAX_LENGTH: 50
};

// Security middleware configuration
export const SECURITY_MIDDLEWARE = {
  // CSRF protection enabled
  CSRF_ENABLED: true,
  // Session timeout in minutes
  SESSION_TIMEOUT: 60,
  // Minimum password strength score (0-100)
  MIN_PASSWORD_STRENGTH: 60
};

// Audit logging configuration
export const AUDIT_LOGGING = {
  ENABLED: true,
  LOG_LEVEL: 'INFO',
  EXCLUDED_ENDPOINTS: ['/health', '/ping']
};

// Security scan configuration
export const SECURITY_SCAN = {
  SCAN_INTERVAL: 300000, // 5 minutes
  MAX_SCAN_RESULTS: 1000,
  ENABLED: true
};