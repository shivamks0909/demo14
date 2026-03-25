import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function middleware(request: NextRequest) {
    const response = NextResponse.next()

    // Protected Admin Routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
        const adminSession = request.cookies.get('admin_session')?.value

        if (!adminSession) {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        // Enhanced session validation
        // In a production environment, you might want to validate the session against a database
        // or check for session expiry, etc.

        // Add security headers for admin pages
        response.headers.set('X-Content-Type-Options', 'nosniff')
        response.headers.set('X-Frame-Options', 'DENY')
        response.headers.set('X-XSS-Protection', '1; mode=block')
    }

    // Redirect to dashboard if already logged in
    if (request.nextUrl.pathname === '/login') {
        const adminSession = request.cookies.get('admin_session')?.value
        if (adminSession) {
            return NextResponse.redirect(new URL('/admin/dashboard', request.url))
        }
    }

    // Add security headers for all responses
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
