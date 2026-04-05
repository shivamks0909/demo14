import { randomBytes, createHash } from 'crypto'
import bcrypt from 'bcryptjs'
import { getDb } from './db'

const SESSION_DURATION_HOURS = 24
const SALT_ROUNDS = 10

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSupplierSession(supplierId: string): Promise<{ token: string; expiresAt: string }> {
  const db = getDb()
  const token = randomBytes(48).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000).toISOString()

  db.prepare(`
    INSERT INTO supplier_sessions (id, supplier_id, token, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(
    `ss_${Date.now()}_${randomBytes(8).toString('hex')}`,
    supplierId,
    createHash('sha256').update(token).digest('hex'),
    expiresAt
  )

  return { token, expiresAt }
}

export async function validateSupplierSession(token: string): Promise<{ valid: boolean; supplierId?: string }> {
  const db = getDb()
  const hashedToken = createHash('sha256').update(token).digest('hex')

  const session = db.prepare(`
    SELECT supplier_id, expires_at FROM supplier_sessions
    WHERE token = ? AND expires_at > datetime('now')
  `).get(hashedToken) as { supplier_id: string; expires_at: string } | undefined

  if (!session) {
    return { valid: false }
  }

  return { valid: true, supplierId: session.supplier_id }
}

export async function destroySupplierSession(token: string): Promise<void> {
  const db = getDb()
  const hashedToken = createHash('sha256').update(token).digest('hex')

  db.prepare(`DELETE FROM supplier_sessions WHERE token = ?`).run(hashedToken)
}

export async function cleanupExpiredSessions(): Promise<number> {
  const db = getDb()
  const result = db.prepare(`
    DELETE FROM supplier_sessions WHERE expires_at <= datetime('now')
  `).run()

  return result.changes
}

export async function updateSupplierLastLogin(supplierId: string): Promise<void> {
  const db = getDb()
  db.prepare(`
    UPDATE suppliers SET last_login = datetime('now') WHERE id = ?
  `).run(supplierId)
}
