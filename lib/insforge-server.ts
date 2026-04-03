import { createClient as createInsForgeClient } from '@insforge/sdk'
import { cookies } from 'next/headers'

export async function createAdminClient() {
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || process.env.INSFORGE_URL
  const apiKey = process.env.INSFORGE_API_KEY || process.env.NEXT_PUBLIC_ANON_KEY

  if (!baseUrl || !apiKey) {
    // Only log error if we're not in a test environment to avoid noise
    if (process.env.NODE_ENV !== 'test') {
      console.error(`[InsForge] Configuration missing: URL=${baseUrl || 'MISSING'}, KEY=${apiKey ? 'PRESENT' : 'MISSING'}`)
    }
    return null
  }

  try {
    return createInsForgeClient({
      baseUrl,
      anonKey: apiKey
    })
  } catch (err) {
    console.error('[InsForge] Failed to create client:', err)
    return null
  }
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
