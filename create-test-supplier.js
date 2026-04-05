// Create a test supplier directly in InsForge cloud DB
const { createClient } = require('@insforge/sdk')
const { hashPassword } = require('./lib/supplier-auth')

async function main() {
  const client = createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://jezv8m6h.us-east.insforge.app',
    anonKey: process.env.INSFORGE_API_KEY || 'ik_bb6cc5593f8309b8efa7790df62e501a'
  })

  const email = 'testsupplier@demo.com'
  const password = 'Test1234!'
  const passwordHash = await hashPassword(password)
  const id = 'sup_test_' + Date.now()
  const now = new Date().toISOString()

  console.log('Creating test supplier...')
  console.log('Email:', email)
  console.log('Password:', password)

  const { data, error } = await client.database
    .from('suppliers')
    .insert([{
      id,
      name: 'Test Supplier Demo',
      login_email: email,
      password_hash: passwordHash,
      status: 'active',
      created_at: now
    }])
    .select()
    .single()

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Supplier created successfully!')
  console.log('ID:', data.id)
  console.log('Login with:', email, '/', password)
}

main()
