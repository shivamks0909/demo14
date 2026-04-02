import { createClient as createInsForgeClient } from '@insforge/sdk'
import { cookies } from 'next/headers'

export async function createAdminClient() {
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL
  const apiKey = process.env.INSFORGE_API_KEY || process.env.NEXT_PUBLIC_ANON_KEY

  if (!baseUrl || !apiKey) {
    console.error('InsForge configuration missing: URL=', baseUrl, ' KEY=', !!apiKey)
    return null
  }

  return createInsForgeClient({
    baseUrl,
    anonKey: apiKey
  })
}

export async function createServerClient() {
  const cookieStore = await cookies()
  
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL
  const apiKey = process.env.INSFORGE_API_KEY || process.env.NEXT_PUBLIC_ANON_KEY
  
  if (!baseUrl || !apiKey) {
    console.error('InsForge server configuration missing: URL=', baseUrl, ' KEY=', !!apiKey)
    return null
  }

  return createInsForgeClient({
    baseUrl,
    anonKey: apiKey
  })
}
