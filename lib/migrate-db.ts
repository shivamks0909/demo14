import { getDb } from './db'

export function migrateDatabase() {
    const db = getDb()

    console.log('[Migration] Starting database migration...')

    try {
        // Check if source column exists in projects
        const projectColumns = db.pragma('table_info(projects)')
        const hasProjectSource = (projectColumns as any[]).some(col => col.name === 'source')

        if (!hasProjectSource) {
            console.log('[Migration] Adding source column to projects table...')
            db.exec(`ALTER TABLE projects ADD COLUMN source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'external', 'auto'))`)
        }

        // Check if new columns exist in responses
        const responseColumns = db.pragma('table_info(responses)')
        const columnNames = (responseColumns as any[]).map(col => col.name)

        if (!columnNames.includes('raw_url')) {
            console.log('[Migration] Adding raw_url column to responses table...')
            db.exec(`ALTER TABLE responses ADD COLUMN raw_url TEXT`)
        }

        if (!columnNames.includes('source')) {
            console.log('[Migration] Adding source column to responses table...')
            db.exec(`ALTER TABLE responses ADD COLUMN source TEXT NOT NULL DEFAULT 'project' CHECK (source IN ('project', 'external'))`)
        }

        if (!columnNames.includes('entry_time')) {
            console.log('[Migration] Adding entry_time column to responses table...')
            db.exec(`ALTER TABLE responses ADD COLUMN entry_time TEXT NOT NULL DEFAULT (datetime('now'))`)
        }

        if (!columnNames.includes('completion_time')) {
            console.log('[Migration] Adding completion_time column to responses table...')
            db.exec(`ALTER TABLE responses ADD COLUMN completion_time TEXT`)
        }

        // Make project_id nullable by recreating the table
        console.log('[Migration] Updating responses table to make project_id nullable...')

        db.exec(`
            CREATE TABLE IF NOT EXISTS responses_new (
                id TEXT PRIMARY KEY,
                project_id TEXT,
                project_code TEXT,
                uid TEXT,
                clickid TEXT UNIQUE NOT NULL,
                status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'complete', 'terminate', 'quota_full', 'security_terminate', 'duplicate_ip', 'duplicate_string')),
                ip TEXT,
                user_agent TEXT,
                device_type TEXT,
                raw_url TEXT,
                source TEXT NOT NULL DEFAULT 'project' CHECK (source IN ('project', 'external')),
                entry_time TEXT NOT NULL DEFAULT (datetime('now')),
                completion_time TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
            )
        `)

        // Copy data from old table to new table
        db.exec(`
            INSERT INTO responses_new (id, project_id, project_code, uid, clickid, status, ip, user_agent, device_type, created_at, updated_at)
            SELECT id, project_id, project_code, uid, clickid, status, ip, user_agent, device_type, created_at, updated_at
            FROM responses
        `)

        // Drop old table and rename new one
        db.exec(`DROP TABLE responses`)
        db.exec(`ALTER TABLE responses_new RENAME TO responses`)

        // Recreate indexes
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_responses_project_id ON responses(project_id);
            CREATE INDEX IF NOT EXISTS idx_responses_clickid ON responses(clickid);
            CREATE INDEX IF NOT EXISTS idx_responses_status ON responses(status);
            CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);
            CREATE INDEX IF NOT EXISTS idx_responses_source ON responses(source);
        `)

        // Create index on projects.source
        db.exec(`CREATE INDEX IF NOT EXISTS idx_projects_source ON projects(source)`)

        // Create fallback project if not exists
        const fallbackProject = db.prepare(`
            SELECT id FROM projects WHERE project_code = 'external_traffic'
        `).get()

        if (!fallbackProject) {
            const fallbackId = `proj_fallback_${Date.now()}`
            db.prepare(`
                INSERT INTO projects (id, project_code, project_name, base_url, source, status)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                fallbackId,
                'external_traffic',
                'External Traffic Bucket',
                'https://external.fallback',
                'auto',
                'active'
            )
            console.log('[Migration] Created fallback project: external_traffic')
        }

        console.log('[Migration] ✅ Database migration completed successfully!')
        return { success: true }

    } catch (error) {
        console.error('[Migration] ❌ Migration failed:', error)
        return { success: false, error }
    }
}
