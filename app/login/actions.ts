'use server'

import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/insforge-server'
import bcrypt from 'bcrypt'

const DEV_BYPASS_EMAIL = 'dev@localhost'
const DEV_BYPASS_PASSWORD = 'dev'

function setAdminSessionCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
    cookieStore.set('admin_session', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 1 week
    })
}

export async function loginAction(formData: FormData) {
    const email = (formData.get('email') as string)?.trim() ?? ''
    const password = formData.get('password') as string

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
            error: 'InsForge is not configured. Add NEXT_PUBLIC_INSFORGE_URL and INSFORGE_API_KEY to .env.local, or sign in with dev@localhost / dev in development.'
        }
    }

    try {
        console.log(`[Login] Attempt for email: ${email}`);
        const { data: admin, error: dbError } = await db.database
            .from('admins')
            .select('password_hash')
            .eq('email', email)
            .single()

        if (dbError || !admin) {
            console.error(`[Login] User not found or DB error: ${dbError?.message || 'Not found'}`);
            return { error: 'Invalid credentials' }
        }

        console.log(`[Login] User found, comparing password...`);
        const passwordMatch = await bcrypt.compare(password, admin.password_hash)
        console.log(`[Login] Password match result: ${passwordMatch}`);

        if (passwordMatch) {
            const cookieStore = await cookies()
            setAdminSessionCookie(cookieStore)
            console.log(`[Login] Success for ${email}`);
            return { success: true }
        }
    } catch (err) {
        console.error('Login error:', err)
        return { error: 'Authentication service unavailable' }
    }

    return { error: 'Invalid credentials' }
}

export async function logoutAction() {
    const cookieStore = await cookies()
    cookieStore.delete('admin_session')
    return { success: true }
}
