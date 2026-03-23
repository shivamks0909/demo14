import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import path from 'path';

// Local SQLite Database Configuration
const DB_PATH = process.env.LOCAL_DB_PATH || './data/local.db';
const DB_USERNAME = process.env.LOCAL_DB_USERNAME || 'admin';
const DB_PASSWORD = process.env.LOCAL_DB_PASSWORD || 'admin123';

let db: Database.Database | null = null;

// Initialize database connection
export function getLocalDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeSchema();
  }
  return db;
}

// Initialize schema
function initializeSchema() {
  if (!db) return;

  // Admins table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Callback Events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS callback_events (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      clickid TEXT NOT NULL,
      project_code TEXT NOT NULL,
      incoming_status TEXT NOT NULL,
      update_result TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Clients table
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Projects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      client_id TEXT REFERENCES clients(id),
      project_code TEXT NOT NULL UNIQUE,
      project_name TEXT,
      base_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted')),
      has_prescreener INTEGER NOT NULL DEFAULT 0,
      prescreener_url TEXT,
      country TEXT DEFAULT 'Global',
      is_multi_country INTEGER NOT NULL DEFAULT 0,
      country_urls TEXT NOT NULL DEFAULT '[]',
      token_prefix TEXT,
      token_counter INTEGER DEFAULT 0,
      complete_cap INTEGER NOT NULL DEFAULT 0,
      complete_target INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      client_pid_param TEXT DEFAULT NULL,
      client_uid_param TEXT DEFAULT NULL,
      oi_prefix TEXT NOT NULL DEFAULT 'oi_'
    );
  `);

  // Responses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      project_id TEXT NOT NULL REFERENCES projects(id),
      project_code TEXT,
      project_name TEXT,
      uid TEXT,
      user_uid TEXT,
      supplier_token TEXT,
      session_token TEXT,
      supplier TEXT DEFAULT NULL,
      oi_session TEXT DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'started', 'complete', 'terminate', 'quota', 'security_terminate', 'duplicate_ip', 'duplicate_string', 'click', 'terminated', 'quota_full')),
      started_at DATETIME,
      completed_at DATETIME,
      duration_seconds INTEGER,
      revenue REAL DEFAULT 0,
      cost REAL DEFAULT 0,
      margin REAL DEFAULT 0,
      fraud_score INTEGER NOT NULL DEFAULT 0,
      ip TEXT,
      user_ip TEXT,
      user_agent TEXT,
      device_type TEXT,
      country_code TEXT,
      clickid TEXT UNIQUE,
      hash TEXT,
      last_landing_page TEXT,
      reason TEXT,
      geo_mismatch INTEGER DEFAULT 0,
      vpn_flag INTEGER DEFAULT 0,
      updated_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Postback Logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS postback_logs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      response_id TEXT REFERENCES responses(id),
      url TEXT NOT NULL,
      method TEXT DEFAULT 'GET',
      request_body TEXT,
      response_code INTEGER,
      response_body TEXT,
      update_result TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_responses_oi_session ON responses(oi_session);
    CREATE INDEX IF NOT EXISTS idx_responses_project_id ON responses(project_id);
    CREATE INDEX IF NOT EXISTS idx_responses_uid ON responses(uid);
    CREATE INDEX IF NOT EXISTS idx_responses_status ON responses(status);
    CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);
  `);

  // Insert default admin if not exists
  const adminExists = db.prepare('SELECT 1 FROM admins WHERE email = ?').get('admin@opinioninsights.com');
  if (!adminExists) {
    const passwordHash = bcrypt.hashSync(DB_PASSWORD, 10);
    db.prepare(`
      INSERT INTO admins (id, email, password_hash) 
      VALUES (?, ?, ?)
    `).run(randomUUID(), 'admin@opinioninsights.com', passwordHash);
  }
}

// Authentication functions
export async function authenticateAdmin(email: string, password: string): Promise<boolean> {
  const db = getLocalDb();
  const admin = db.prepare('SELECT password_hash FROM admins WHERE email = ?').get(email) as { password_hash: string } | undefined;
  
  if (!admin) return false;
  return bcrypt.compare(password, admin.password_hash);
}

export function createAdmin(email: string, password: string): { id: string; email: string } {
  const db = getLocalDb();
  const id = randomUUID();
  const passwordHash = bcrypt.hashSync(password, 10);
  
  db.prepare('INSERT INTO admins (id, email, password_hash) VALUES (?, ?, ?)')
    .run(id, email, passwordHash);
  
  return { id, email };
}

// Database helpers
export function queryOne<T>(sql: string, params: unknown[]): T | undefined {
  return getLocalDb().prepare(sql).get(...params) as T | undefined;
}

export function queryMany<T>(sql: string, params: unknown[]): T[] {
  return getLocalDb().prepare(sql).all(...params) as T[];
}

export function runQuery(sql: string, params: unknown[]): Database.RunResult {
  return getLocalDb().prepare(sql).run(...params);
}

export { DB_USERNAME, DB_PASSWORD };
