import { createClient as createInsForgeClient } from '@insforge/sdk'
import { cookies } from 'next/headers'

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL
const apiKey = process.env.INSFORGE_API_KEY

export async function createAdminClient() {
  if (!baseUrl || !apiKey) {
    console.error('InsForge configuration missing: NEXT_PUBLIC_INSFORGE_URL or INSFORGE_API_KEY not set')
    return null
  }

  return createInsForgeClient({
    baseUrl,
    anonKey: apiKey
  })
}

export async function createServerClient() {
  // Access cookies if needed
  const cookieStore = await cookies()
  
  if (!baseUrl || !apiKey) {
    console.error('InsForge configuration missing')
    return null
  }

  return createInsForgeClient({
    baseUrl,
    anonKey: apiKey
  })
}
