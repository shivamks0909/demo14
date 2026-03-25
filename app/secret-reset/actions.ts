'use server'

import { createAdminClient } from '@/lib/insforge-server'
import bcrypt from 'bcrypt'

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

    const insforge = await createAdminClient()
    if (!insforge) {
        return { success: false, error: 'Database is not configured. Add Supabase credentials to .env.local.' }
    }

    try {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return { success: false, error: 'Invalid email format' }
        }

        // Validate password strength
        if (password.length < 8) {
            return { success: false, error: 'Password must be at least 8 characters long' }
        }

        const hashedPassword = await bcrypt.hash(password, 12)

        // Check if admin exists
        const { data: existingAdmin } = await insforge.database
            .from('admins')
            .select('id')
            .eq('email', email)
            .single()

        let error
        if (existingAdmin) {
            // Update existing
            const { error: updateError } = await insforge.database
                .from('admins')
                .update({ password_hash: hashedPassword })
                .eq('id', existingAdmin.id)
            error = updateError
        } else {
            // Create new
            const { error: insertError } = await insforge.database
                .from('admins')
                .insert({
                    email,
                    password_hash: hashedPassword
                })
            error = insertError
        }

        if (error) throw error

        return { success: true }
    } catch (err) {
        console.error('Reset error:', err)
        return { success: false, error: 'Database error occurred' }
    }
}
