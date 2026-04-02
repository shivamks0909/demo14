'use server'

import { cookies } from 'next/headers'
import { getUnifiedDb } from '@/lib/unified-db'
import bcrypt from 'bcryptjs'
import { unstable_noStore as noStore } from 'next/cache'

// Rate limiting (in-memory; use Redis in production)
const loginAttempts = new Map<string, { attempts: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000

function setAdminSessionCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
    cookieStore.set('admin_session', 'authenticated_admin_session', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 1 week
    })
}

export async function loginAction(formData: FormData) {
    noStore()

    const email = (formData.get('email') as string)?.trim().toLowerCase() ?? ''
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Email and password are required' }
    }

    // Rate limiting
    const now = Date.now()
    const key = email
    const attempt = loginAttempts.get(key)
    if (attempt && (now - attempt.lastAttempt) < LOCKOUT_MS && attempt.attempts >= MAX_ATTEMPTS) {
        return { error: 'Too many failed login attempts. Please try again in 15 minutes.' }
    }

    function recordFailure() {
        const a = loginAttempts.get(key)
        loginAttempts.set(key, { attempts: (a?.attempts ?? 0) + 1, lastAttempt: now })
    }

    try {
        console.log('[Login action] Attempting to connect to unified DB...')
        const { database: db, source } = await getUnifiedDb()
        console.log('[Login action] Connected to unified DB. Source:', source)

        // Try 'admins' table first (local SQLite), then 'users' (InsForge/Postgres)
        let user: any = null
        for (const table of ['admins', 'users']) {
            try {
                console.log(`[Login action] Querying table ${table}...`)
                const { data, error } = await db.from(table).select('*').eq('email', email).maybeSingle()
                if (error) console.log(`[Login action] Query error on ${table}:`, error.message)
                if (data) { 
                    user = data
                    console.log(`[Login action] User found in ${table}`)
                    break 
                }
            } catch (err: any) { 
                console.log(`[Login action] Query thrown error on ${table}:`, err.message)
            }
        }

        if (!user) {
            console.log('[Login action] No user found in any tables')
            recordFailure()
            return { error: 'Invalid credentials' }
        }

        // Password comparison — supports both bcrypt hash and plain text (legacy)
        const storedPwd = user.password_hash || user.password || ''
        let match = false
        if (storedPwd.startsWith('$2b$') || storedPwd.startsWith('$2a$')) {
            match = await bcrypt.compare(password, storedPwd)
        } else {
            match = storedPwd === password
        }

        if (!match) {
            recordFailure()
            return { error: 'Invalid credentials' }
        }

        // Success
        loginAttempts.delete(key)
        const cookieStore = await cookies()
        setAdminSessionCookie(cookieStore)
        return { success: true }

    } catch (err: any) {
        console.error('[Login] Error:', err?.message)
        return { error: 'Authentication service unavailable. Please try again.' }
    }
}

export async function logoutAction() {
    const cookieStore = await cookies()
    cookieStore.delete({
        name: 'admin_session',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
    })
    return { success: true }
}