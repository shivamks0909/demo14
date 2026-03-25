'use server'

import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/insforge-server'
import bcrypt from 'bcrypt'
import { unstable_noStore as noStore } from 'next/cache'

const DEV_BYPASS_EMAIL = 'dev@localhost'
const DEV_BYPASS_PASSWORD = 'dev'

// Rate limiting configuration
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_TIME = 15 * 60 * 1000 // 15 minutes

// In-memory rate limiting (use Redis in production)
const loginAttempts = new Map<string, { attempts: number; lastAttempt: number }>()

function setAdminSessionCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
    cookieStore.set('admin_session', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 1 week
    })
}

// Helper function to safely compare passwords (prevents timing attacks)
function safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false
    }
    let result = 0
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    return result === 0
}

export async function loginAction(formData: FormData) {
    // Prevent caching of login page
    noStore()

    const email = (formData.get('email') as string)?.trim() ?? ''
    const password = formData.get('password') as string

    // Validate input
    if (!email || !password) {
        return { error: 'Email and password are required' }
    }

    // Input sanitization
    if (email.length > 255 || password.length > 100) {
        return { error: 'Invalid input length' }
    }

    // Rate limiting
    const clientIP = 'unknown' // In a real implementation, get actual IP
    const attemptKey = `${clientIP}:${email}`
    const attemptData = loginAttempts.get(attemptKey)

    const now = Date.now()
    if (attemptData && (now - attemptData.lastAttempt) < LOCKOUT_TIME) {
        if (attemptData.attempts >= MAX_LOGIN_ATTEMPTS) {
            return { error: 'Too many failed login attempts. Please try again later.' }
        }
    }

    // Dev bypass when InsForge is not configured (local development only)
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_INSFORGE_URL) {
        if (email === DEV_BYPASS_EMAIL && password === DEV_BYPASS_PASSWORD) {
            const cookieStore = await cookies()
            setAdminSessionCookie(cookieStore)
            return { success: true }
        }
    }

    const db = await createAdminClient()
    if (!db) {
        return {
            error: 'Authentication service temporarily unavailable. Please try again later.'
        }
    }

    try {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return { error: 'Invalid email format' }
        }

        console.log(`[Login] Attempt for email: ${email}`);

        const { data: admin, error: dbError } = await db.database
            .from('admins')
            .select('password_hash, id')
            .eq('email', email)
            .single()

        if (dbError || !admin) {
            console.error(`[Login] User not found or DB error: ${dbError?.message || 'Not found'}`);
            // Update rate limiting even on failed attempts
            if (attemptData) {
                attemptData.attempts++
                attemptData.lastAttempt = now
                loginAttempts.set(attemptKey, attemptData)
            } else {
                loginAttempts.set(attemptKey, { attempts: 1, lastAttempt: now })
            }
            return { error: 'Invalid credentials' }
        }

        console.log(`[Login] User found, comparing password...`);

        // Use safe comparison to prevent timing attacks
        const passwordMatch = await bcrypt.compare(password, admin.password_hash)
        console.log(`[Login] Password match result: ${passwordMatch}`);

        if (passwordMatch) {
            // Reset rate limiting on successful login
            loginAttempts.delete(attemptKey)

            const cookieStore = await cookies()
            setAdminSessionCookie(cookieStore)
            console.log(`[Login] Success for ${email}`);
            return { success: true }
        } else {
            // Update rate limiting on failed attempt
            if (attemptData) {
                attemptData.attempts++
                attemptData.lastAttempt = now
                loginAttempts.set(attemptKey, attemptData)
            } else {
                loginAttempts.set(attemptKey, { attempts: 1, lastAttempt: now })
            }
            return { error: 'Invalid credentials' }
        }
    } catch (err) {
        console.error('Login error:', err)
        return { error: 'Authentication service unavailable' }
    }
}

export async function logoutAction() {
    const cookieStore = await cookies()
    cookieStore.delete('admin_session')
    return { success: true }
}