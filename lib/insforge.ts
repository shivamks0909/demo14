import { createClient as createInsForgeClient } from '@insforge/sdk'

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL
const anonKey = process.env.INSFORGE_API_KEY

if (!baseUrl) {
  throw new Error('Missing NEXT_PUBLIC_INSFORGE_URL environment variable')
}

// Client-side client for use in Client Components
export function createClient() {
  return createInsForgeClient({
    baseUrl,
    anonKey: anonKey || ''
  })
}

// Export singleton for convenience
export const insforge = createInsForgeClient({
  baseUrl: baseUrl || '',
  anonKey: anonKey || ''
})
