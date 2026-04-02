import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
// Admin routes that require authentication
const ADMIN_ROUTES = ['/admin', '/api/admin']
const LOGIN_ROUTE = '/login'

export async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname

    // Check if this is an admin route
    const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route))

    // Skip middleware for login page and static assets
    if (pathname === LOGIN_ROUTE || pathname.startsWith('/_next') || pathname.startsWith('/api/health')) {
        return NextResponse.next()
    }

    // If accessing admin route, check for session cookie
    if (isAdminRoute) {
        const adminSession = request.cookies.get('admin_session')

        if (!adminSession || !adminSession.value) {
            // No session found - redirect to login
            const loginUrl = new URL(LOGIN_ROUTE, request.url)
            loginUrl.searchParams.set('redirect', pathname)
            const response = NextResponse.redirect(loginUrl)
            applySecurityHeaders(response, request)
            return response
        }

        // Basic sanity check: prevent malformed sessions
        if (adminSession.value.length < 10) {
            console.warn('[Middleware] Malformed session cookie detected')
            const response = NextResponse.redirect(new URL(LOGIN_ROUTE, request.url))
            response.cookies.delete('admin_session')
            applySecurityHeaders(response, request)
            return response
        }

        // Defer deeper database validation to server components where Node.js APIs are available.
    }

    const response = NextResponse.next()
    applySecurityHeaders(response, request)
    return response
}

// Extracted security header application for reuse
function applySecurityHeaders(response: NextResponse, request: NextRequest) {
    // Generate cryptographically secure random nonces for CSP
    const nonce = crypto.randomUUID().replace(/-/g, '')

    // HSTS (HTTP Strict Transport Security) - only on HTTPS
    const forwardedProto = request.headers.get('x-forwarded-proto')
    const isHttps = forwardedProto === 'https' || request.headers.get('x-forwarded-ssl') === 'on' || request.url.startsWith('https://')
    if (isHttps) {
        response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
    }

    // Content Security Policy (CSP) - strict, XSS protection
    const csp = [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}'`,
        `style-src 'self' 'nonce-${nonce}'`,
        "img-src 'self' data:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "frame-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests"
    ].join('; ')

    response.headers.set('Content-Security-Policy', csp)

    // Additional Security Headers
    response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('X-XSS-Protection', '1; mode=block')

    // Expose nonce to downstream handlers via header for template injection
    response.headers.set('x-csp-nonce', nonce)

    // Modern Security Headers for Spectre/Meltdown protection
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')

    // Enhanced Permissions Policy - restrict all sensors
    response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=()')
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
