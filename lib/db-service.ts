import { getDb } from './db'
import { randomUUID } from 'crypto'

export interface Project {
  id: string
  project_code: string
  project_name: string
  base_url: string
  status: 'active' | 'paused'
  created_at: string
}

export interface Response {
  id: string
  project_id: string
  project_code: string
  uid?: string
  clickid?: string
  status: 'in_progress' | 'complete' | 'terminate' | 'quota_full' | 'security_terminate' | 'duplicate_ip' | 'duplicate_string'
  ip?: string
  user_agent?: string
  device_type?: string
  created_at: string
  updated_at?: string
}

// Project operations
export function createProject(data: Omit<Project, 'id' | 'created_at'>): Project {
  const db = getDb()
  const id = randomUUID()
  const created_at = new Date().toISOString()

  const stmt = db.prepare(`
    INSERT INTO projects (id, project_code, project_name, base_url, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  stmt.run(id, data.project_code, data.project_name, data.base_url, data.status, created_at)

  return { id, ...data, created_at }
}

export function getProjectByCode(code: string): Project | null {
  const db = getDb()
  const stmt = db.prepare('SELECT * FROM projects WHERE project_code = ?')
  return stmt.get(code) as Project | null
}

export function getAllProjects(): Project[] {
  const db = getDb()
  const stmt = db.prepare('SELECT * FROM projects ORDER BY created_at DESC')
  return stmt.all() as Project[]
}

export function updateProjectStatus(id: string, status: 'active' | 'paused'): void {
  const db = getDb()
  const stmt = db.prepare('UPDATE projects SET status = ? WHERE id = ?')
  stmt.run(status, id)
}

export function deleteProject(id: string): void {
  const db = getDb()
  const stmt = db.prepare('DELETE FROM projects WHERE id = ?')
  stmt.run(id)
}

// Response operations
export function createResponse(data: Omit<Response, 'id' | 'created_at'>): Response {
  const db = getDb()
  const id = randomUUID()
  const created_at = new Date().toISOString()

  const stmt = db.prepare(`
    INSERT INTO responses (id, project_id, project_code, uid, clickid, status, ip, user_agent, device_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    id,
    data.project_id,
    data.project_code,
    data.uid || null,
    data.clickid || null,
    data.status,
    data.ip || null,
    data.user_agent || null,
    data.device_type || null,
    created_at
  )

  return { id, ...data, created_at }
}

export function getResponseByClickId(clickid: string): Response | null {
  const db = getDb()
  const stmt = db.prepare('SELECT * FROM responses WHERE clickid = ?')
  return stmt.get(clickid) as Response | null
}

export function updateResponseStatus(
  clickid: string,
  status: Response['status']
): Response | null {
  const db = getDb()
  const updated_at = new Date().toISOString()

  const stmt = db.prepare(`
    UPDATE responses
    SET status = ?, updated_at = ?
    WHERE clickid = ? AND status = 'in_progress'
  `)

  const result = stmt.run(status, updated_at, clickid)

  if (result.changes === 0) return null

  return getResponseByClickId(clickid)
}

export function getResponsesByProject(projectId: string, limit = 100): Response[] {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT * FROM responses
    WHERE project_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `)
  return stmt.all(projectId, limit) as Response[]
}

export function getRecentResponses(limit = 100): Response[] {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT * FROM responses
    ORDER BY created_at DESC
    LIMIT ?
  `)
  return stmt.all(limit) as Response[]
}

export function getResponseStats(projectId?: string) {
  const db = getDb()

  let query = `
    SELECT
      status,
      COUNT(*) as count
    FROM responses
  `

  if (projectId) {
    query += ' WHERE project_id = ?'
  }

  query += ' GROUP BY status'

  const stmt = db.prepare(query)
  const results = projectId ? stmt.all(projectId) : stmt.all()

  const stats: Record<string, number> = {
    in_progress: 0,
    complete: 0,
    terminate: 0,
    quota_full: 0,
    security_terminate: 0,
    duplicate_ip: 0,
    duplicate_string: 0
  }

  for (const row of results as any[]) {
    stats[row.status] = row.count
  }

  return stats
}
