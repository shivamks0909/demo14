'use server'

import { getUnifiedDb } from '@/lib/unified-db'
import bcrypt from 'bcryptjs'

// Require master key to be set in environment
const MASTER_KEY = process.env.ADMIN_MASTER_KEY

export async function resetAdminCredentials(formData: FormData) {
    // Check if master key is configured
    if (!MASTER_KEY) {
        return { success: false, error: 'Master key not configured. Contact administrator.' }
    }

    const masterKey = formData.get('masterKey') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    // Secure comparison to prevent timing attacks
    // Note: MASTER_KEY should be stored as a bcrypt hash in environment
    const isValidMasterKey = MASTER_KEY.startsWith('$2')
        ? bcrypt.compareSync(masterKey, MASTER_KEY)
        : masterKey === MASTER_KEY

    if (!masterKey || !isValidMasterKey) {
        return { success: false, error: 'Invalid Master Key' }
    }

    if (!email || !password) {
        return { success: false, error: 'Email and Password are required' }
    }

    const insforge = await getUnifiedDb()
    if (!insforge) {
        return { success: false, error: 'Database is not configured.' }
    }
    const db = insforge.database

    try {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return { success: false, error: 'Invalid email format' }
        }
        if (password.length < 8) {
            return { success: false, error: 'Password must be at least 8 characters long' }
        }

        const hashedPassword = await bcrypt.hash(password, 12)

        const { data: existingAdmin } = await db
            .from('admins')
            .select('id')
            .eq('email', email)
            .maybeSingle()

        let error
        if (existingAdmin) {
            const { error: updateError } = await db
                .from('admins')
                .update({ password_hash: hashedPassword })
                .eq('id', existingAdmin.id)
            error = updateError
        } else {
            const { error: insertError } = await db
                .from('admins')
                .insert([{ id: `adm_${Date.now()}`, email, password_hash: hashedPassword, created_at: new Date().toISOString() }])
            error = insertError
        }

        if (error) throw error
        return { success: true }
    } catch (err) {
        console.error('Reset error:', err)
        return { success: false, error: 'Database error occurred' }
    }
}

