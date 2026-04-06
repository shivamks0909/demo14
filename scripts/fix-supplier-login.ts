// Script to check supplier data and create supplier account in production
import { createClient } from '@insforge/sdk'
import bcrypt from 'bcryptjs'

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://jezv8m6h.us-east.insforge.app'
const INSFORGE_KEY = process.env.INSFORGE_API_KEY || 'ik_bb6cc5593f8309b8efa7790df62e501a'

async function main() {
  console.log('Connecting to InsForge:', INSFORGE_URL)
  
  const client = createClient({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_KEY
  })

  const db = client.database

  // 1. Check all suppliers and their login emails
  console.log('\n=== Checking suppliers table ===')
  const { data: suppliers, error: suppliersError } = await db
    .from('suppliers')
    .select('id, name, login_email, status')
  
  if (suppliersError) {
    console.error('Error querying suppliers:', suppliersError)
  } else {
    console.log('Found suppliers:', JSON.stringify(suppliers, null, 2))
  }

  // 2. Check if supplier_sessions table exists
  console.log('\n=== Checking supplier_sessions table ===')
  const { data: sessions, error: sessionsError } = await db
    .from('supplier_sessions')
    .select('id')
    .limit(1)
  
  if (sessionsError) {
    console.error('supplier_sessions table error:', sessionsError)
    console.log('Table may not exist - needs to be created')
  } else {
    console.log('supplier_sessions table exists')
  }

  // 3. Create supplier@test.com if it doesn't exist
  const existingSupplier = suppliers?.find((s: any) => s.login_email === 'supplier@test.com')
  
  if (!existingSupplier) {
    console.log('\n=== Creating supplier@test.com ===')
    const passwordHash = await bcrypt.hash('supplier123', 10)
    
    const { data: newSupplier, error: insertError } = await db
      .from('suppliers')
      .insert([{
        name: 'Test Supplier',
        login_email: 'supplier@test.com',
        password_hash: passwordHash,
        status: 'active',
        contact_email: 'supplier@test.com',
        contact_phone: '+1234567890',
        company_name: 'Test Supplier Inc.',
        created_at: new Date().toISOString()
      }])
      .select()
      .single()
    
    if (insertError) {
      console.error('Error creating supplier:', insertError)
    } else {
      console.log('Created supplier:', JSON.stringify(newSupplier, null, 2))
    }
  } else {
    console.log('\n=== supplier@test.com already exists ===')
    console.log('Supplier:', JSON.stringify(existingSupplier, null, 2))
    
    // Update password to known value
    console.log('Updating password to supplier123...')
    const passwordHash = await bcrypt.hash('supplier123', 10)
    
    const { data: updated, error: updateError } = await db
      .from('suppliers')
      .update({ password_hash: passwordHash })
      .eq('id', existingSupplier.id)
      .select()
    
    if (updateError) {
      console.error('Error updating password:', updateError)
    } else {
      console.log('Password updated successfully')
    }
  }

  console.log('\n=== Done ===')
}

main().catch(console.error)
