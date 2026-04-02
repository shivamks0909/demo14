import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'

// Mock the randomUUID function
import { randomUUID } from 'crypto'
const originalRandomUUID = randomUUID

describe('Middleware Security Headers', () => {
  const createRequest = (url: string, headers: Record<string, string> = {}): NextRequest => {
    return new NextRequest(url, {
      method: 'GET',
      headers: new Headers(headers),
    })
  }

  describe('Content Security Policy (CSP)', () => {
    it('should set CSP header with strict policies', async () => {
      const request = createRequest('https://example.com/admin')
      const response = await middleware(request)

      expect(response.headers.get('Content-Security-Policy')).toBeDefined()
      const csp = response.headers.get('Content-Security-Policy')!

      // Check required directives
      expect(csp).toContain("default-src 'self'")
      expect(csp).toContain("script-src 'self' 'nonce-")
      expect(csp).toContain("style-src 'self' 'nonce-")
      expect(csp).toContain("img-src 'self' data:")
      expect(csp).toContain("font-src 'self' data:")
      expect(csp).toContain("connect-src 'self'")
      expect(csp).toContain("frame-src 'none'")
      expect(csp).toContain("base-uri 'self'")
      expect(csp).toContain("form-action 'self'")
      expect(csp).toContain("upgrade-insecure-requests")

      // Should NOT contain wildcard https:
      expect(csp).not.toContain('https:')
    })

    it('should generate unique nonce for each request', async () => {
      const request1 = createRequest('https://example.com/admin')
      const response1 = await middleware(request1)
      const nonce1 = response1.headers.get('x-csp-nonce')

      const request2 = createRequest('https://example.com/admin')
      const response2 = await middleware(request2)
      const nonce2 = response2.headers.get('x-csp-nonce')

      expect(nonce1).toBeDefined()
      expect(nonce2).toBeDefined()
      expect(nonce1).not.toBe(nonce2)
    })
  })

  describe('HSTS (HTTP Strict Transport Security)', () => {
    it('should set HSTS header on HTTPS requests', async () => {
      const request = createRequest('https://example.com/admin', {
        'x-forwarded-proto': 'https',
      })
      const response = await middleware(request)

      expect(response.headers.get('Strict-Transport-Security')).toBe(
        'max-age=63072000; includeSubDomains; preload'
      )
    })

    it('should not set HSTS header on HTTP requests', async () => {
      const request = createRequest('http://example.com/admin')
      const response = await middleware(request)

      expect(response.headers.get('Strict-Transport-Security')).toBeNull()
    })
  })

  describe('Cross-Origin Security Headers', () => {
    it('should set Cross-Origin-Opener-Policy', async () => {
      const request = createRequest('https://example.com/admin')
      const response = await middleware(request)

      expect(response.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin')
    })

    it('should set Cross-Origin-Embedder-Policy', async () => {
      const request = createRequest('https://example.com/admin')
      const response = await middleware(request)

      expect(response.headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp')
    })
  })

  describe('Permissions Policy', () => {
    it('should set enhanced Permissions-Policy with all sensors disabled', async () => {
      const request = createRequest('https://example.com/admin')
      const response = await middleware(request)

      const policy = response.headers.get('Permissions-Policy')
      expect(policy).toBeDefined()
      expect(policy).toContain('geolocation=()')
      expect(policy).toContain('microphone=()')
      expect(policy).toContain('camera=()')
      expect(policy).toContain('magnetometer=()')
      expect(policy).toContain('gyroscope=()')
      expect(policy).toContain('accelerometer=()')
      expect(policy).toContain('ambient-light-sensor=()')
    })
  })

  describe('Standard Security Headers', () => {
    it('should set X-Content-Type-Options', async () => {
      const request = createRequest('https://example.com/admin')
      const response = await middleware(request)

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    })

    it('should set X-Frame-Options', async () => {
      const request = createRequest('https://example.com/admin')
      const response = await middleware(request)

      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    })

    it('should set Referrer-Policy', async () => {
      const request = createRequest('https://example.com/admin')
      const response = await middleware(request)

      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    })

    it('should set X-XSS-Protection', async () => {
      const request = createRequest('https://example.com/admin')
      const response = await middleware(request)

      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
    })
  })

  describe('CSP Nonce Exposure', () => {
    it('should expose nonce via x-csp-nonce header', async () => {
      const request = createRequest('https://example.com/admin')
      const response = await middleware(request)

      const nonce = response.headers.get('x-csp-nonce')
      expect(nonce).toBeDefined()
      expect(nonce!.length).toBe(32) // UUID without dashes
    })
  })
})
