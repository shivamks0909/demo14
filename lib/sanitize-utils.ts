/**
 * Sanitization Utilities
 * Provides functions to sanitize user input and prevent XSS attacks
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return '';

  // Convert special characters to HTML entities
  return input
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Sanitize text content (remove potentially dangerous characters)
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return '';

  // Remove potentially dangerous characters
  return input
    .toString()
    .replace(/[<>'"&]/g, '') // Remove common HTML/XML dangerous characters
    .trim();
}

/**
 * Sanitize URL content
 */
export function sanitizeUrl(input: string | null | undefined): string {
  if (!input) return '';

  // Allow only safe URL characters
  return input
    .toString()
    .replace(/[^a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]/g, '')
    .trim();
}

/**
 * Validate and sanitize project code
 */
export function sanitizeProjectCode(input: string | null | undefined): string {
  if (!input) return '';

  // Allow alphanumeric, hyphens, underscores, and periods
  return input
    .toString()
    .replace(/[^a-zA-Z0-9\-_.]/g, '')
    .substring(0, 100); // Limit length
}

/**
 * Validate and sanitize client name
 */
export function sanitizeClientName(input: string | null | undefined): string {
  if (!input) return '';

  // Allow alphanumeric, spaces, hyphens, and periods
  return input
    .toString()
    .replace(/[^a-zA-Z0-9\s\-_.]/g, '')
    .substring(0, 255); // Limit length
}

/**
 * Validate country code
 */
export function sanitizeCountryCode(input: string | null | undefined): string {
  if (!input) return '';

  // Allow only 2-character uppercase country codes
  return input
    .toString()
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .substring(0, 2); // Limit to 2 characters
}