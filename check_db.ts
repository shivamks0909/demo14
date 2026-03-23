import { createAdminClient } from './lib/insforge-server'

async function checkTable() {
    const insforge = await createAdminClient()
    if (!insforge) {
        console.error('Supabase client not initialized')
        return
    }

    const { data, error } = await insforge.database.from('suppliers').select('count', { count: 'exact', head: true })
    if (error) {
        console.error('Error checking suppliers table:', error.message)
        if (error.message.includes('does not exist')) {
            console.log('CRITICAL: The suppliers table does not exist. Please run the migration.')
        }
    } else {
        console.log('Suppliers table exists. Count:', data)
    }
}

checkTable()
