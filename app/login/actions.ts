'use server'

import { cookies } from 'next/headers'
import { getUnifiedDb } from '@/lib/unified-db'
import bcrypt from 'bcryptjs'
import { unstable_noStore as noStore } from 'next/cache'

export async function loginAction(formData: FormData) {
    noStore()

    const email = (formData.get('email') as string)?.trim().toLowerCase() ?? ''
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Email and password are required' }
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
                // Admins table uses 'username' column, users table uses 'email'
                const column = table === 'admins' ? 'username' : 'email'
                const { data, error } = await db.from(table).select('*').eq(column, email).maybeSingle()
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
            return { error: 'Invalid credentials' }
        }

        // Success
        const cookieStore = await cookies()
        cookieStore.set('admin_session', 'authenticated_admin_session', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7
        })
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