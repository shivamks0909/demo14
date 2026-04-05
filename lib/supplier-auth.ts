import { randomBytes, createHash } from 'crypto'
import bcrypt from 'bcryptjs'
import { getUnifiedDb } from './unified-db'

const SESSION_DURATION_HOURS = 24
const SALT_ROUNDS = 10

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSupplierSession(supplierId: string): Promise<{ token: string; expiresAt: string }> {
  const { database: db } = await getUnifiedDb()
  const token = randomBytes(48).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000).toISOString()

  const { error } = await db.from('supplier_sessions').insert([{
    supplier_id: supplierId,
    token: createHash('sha256').update(token).digest('hex'),
    expires_at: expiresAt
  }])

  if (error) {
    console.error('[createSupplierSession] DB insert error:', error)
    throw new Error(`Failed to create session: ${error.message}`)
  }

  return { token, expiresAt }
}

export async function validateSupplierSession(token: string): Promise<{ valid: boolean; supplierId?: string }> {
  const { database: db } = await getUnifiedDb()
  const hashedToken = createHash('sha256').update(token).digest('hex')

  const { data: session } = await db
    .from('supplier_sessions')
    .select('supplier_id, expires_at')
    .eq('token', hashedToken)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) {
    return { valid: false }
  }

  return { valid: true, supplierId: session.supplier_id }
}

export async function destroySupplierSession(token: string): Promise<void> {
  const { database: db } = await getUnifiedDb()
  const hashedToken = createHash('sha256').update(token).digest('hex')

  await db.from('supplier_sessions').delete().eq('token', hashedToken)
}

export async function cleanupExpiredSessions(): Promise<number> {
  const { database: db } = await getUnifiedDb()
  const now = new Date().toISOString()

  await db.from('supplier_sessions').delete().lte('expires_at', now)

  return 0
}

export async function updateSupplierLastLogin(supplierId: string): Promise<void> {
  const { database: db } = await getUnifiedDb()
  await db.from('suppliers').update({ last_login: new Date().toISOString() }).eq('id', supplierId)
}
