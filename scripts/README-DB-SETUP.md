# InsForge Production Database Setup

## 🚀 Quick Start (3 Steps)

### Step 1: Choose Your Method

**Option A: Node.js script (Recommended)**
```bash
node scripts/setup-insforge.js postgresql://user:pass@host:5432/dbname
```

**Option B: Direct SQL (Manual)**
```bash
# Run these in order:
psql postgresql://... -f scripts/migrate-full-schema.sql
psql postgresql://... -f scripts/seed-insforge.sql
```

**Option C: Windows Batch**
```cmd
scripts\set-insforge-db.bat postgresql://user:pass@host:5432/dbname
```

### Step 2: Verify Tables Created

```sql
-- Connect to your database and run:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected tables:
- clients
- projects
- suppliers
- supplier_project_links
- responses
- audit_logs
- s2s_config
- s2s_logs

### Step 3: Test the System

```bash
# Set environment to use InsForge
export NEXT_PUBLIC_INSFORGE_URL=postgresql://user:pass@host:5432/dbname

# Start dev server
npm run dev

# Test routing (should redirect to survey)
curl -v "http://localhost:3000/r/TEST_SINGLE/DYN01/UID123"

# Check audit logs
curl -v "http://localhost:3000/api/admin/audit-logs"  # if admin endpoint exists
```

---

## 📋 What This Creates

### Full Schema (8 Tables)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `clients` | Client hierarchy | `id`, `name` |
| `projects` | Survey configuration | `project_code`, `base_url`, `status`, `country_urls` |
| `suppliers` | Vendor config | `supplier_token`, `complete_redirect_url` |
| `supplier_project_links` | Assignment + quota | `supplier_id`, `project_id`, `quota_allocated`, `quota_used` |
| `responses` | **Core tracking** | `session_token`, `oi_session`, `clickid`, `status` |
| `audit_logs` | Activity trail | `event_type`, `payload`, `ip`, `created_at` |
| `s2s_config` | Verification secrets | `project_id`, `secret_key`, `require_s2s_for_complete` |
| `s2s_logs` | Callback verification | `response_id`, `hash_match`, `verified_at` |

### Indexes for Performance

All critical query patterns have indexes:
- `idx_supplier_project_links_quota` - for quota checks (uses 5 columns!)
- `idx_responses_clickid` - for callback lookup
- `idx_responses_oi_session` - for session tracking
- `idx_audit_logs_created_at` - for log queries
- GIN index on `audit_logs.payload` - for JSON payload search

### Sample Data

Inserts test data similar to local DB:
- Client: "Test Client"
- Projects: `TEST_SINGLE`, `TEST_MULTI`, `TEST_PAUSED`
- Suppliers: `DYN01`, `LUC01`, `CIN01`
- Links with quotas: unlimited, 50, 100

---

## 🔒 Security & Compliance

### By Default:

✅ All status values constrained with CHECK constraints
✅ UUID primary keys (no sequential IDs)
✅ Timestamps with `created_at` and `updated_at`
✅ Foreign keys with proper ON DELETE behavior
✅ JSONB for flexible payloads (audit_logs, country_urls)
✅ Indexes on all query paths (IP, session, status, timestamps)
✅ UUID extension enabled for secure ID generation

### Audit Trail:

Every routing decision logs to `audit_logs` with:
- `event_type` (12 types)
- `payload` (JSON with full context)
- `ip` and `user_agent`
- `created_at` (auto)

---

## ⚙️ Configuration After Setup

### 1. Set InsForge URL in .env

```env
NEXT_PUBLIC_INSFORGE_URL=postgresql://user:pass@host:5432/dbname
```

### 2. (Optional) Configure S2S Secrets

For each project that needs server-to-server verification:

```sql
INSERT INTO s2s_config (project_id, secret_key, require_s2s_for_complete)
VALUES (
    (SELECT id FROM projects WHERE project_code = 'YOUR_PROJECT'),
    'your-hmac-secret-key-here',
    TRUE
);
```

### 3. (Optional) Update Supplier Callback URLs

```sql
UPDATE suppliers
SET complete_redirect_url = 'https://your-supplier.com/complete?uid={uid}',
    terminate_redirect_url = 'https://your-supplier.com/terminate?uid={uid}'
WHERE supplier_token = 'SUPPLIER_TOKEN';
```

---

## 🧪 Testing Checklist

- [ ] All 8 tables exist
- [ ] Indexes created (check with `\di` in psql)
- [ ] Sample projects visible
- [ ] `supplier_project_links.quota_used` column exists
- [ ] Application connects without errors
- [ ] `/r/TEST_SINGLE/DYN01/UID123` redirects successfully
- [ ] Audit logs are being written
- [ ] Quota increments on each entry

---

## 🚨 Important Notes

### What's Safe:
- ✅ Scripts use `IF NOT EXISTS` - can run multiple times
- ✅ Sample data uses `ON CONFLICT DO NOTHING` - safe re-run
- ✅ No destructive DROP statements (tables preserved)

### What's NOT Safe:
- ❌ **Don't** run on production without backup
- ❌ **Don't** modify `responses` table structure after data exists
- ❌ **Don't** delete audit logs if you need compliance

### Migration from Existing:
If you already have data, you may need to:
1. Add `quota_used` column to `supplier_project_links` (has default 0)
2. Add `audit_logs` table (completely new)
3. Add `s2s_config` and `s2s_logs` tables (new)
4. Add missing indexes (safe to add anytime)

---

## 📊 Post-Setup Queries

### Check Quota Usage
```sql
SELECT
    s.supplier_token,
    p.project_code,
    sl.quota_allocated,
    sl.quota_used,
    sl.quota_allocated - sl.quota_used as remaining
FROM supplier_project_links sl
JOIN suppliers s ON sl.supplier_id = s.id
JOIN projects p ON sl.project_id = p.id
WHERE sl.status = 'active';
```

### Recent Activity
```sql
SELECT
    event_type,
    COUNT(*) as count
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY count DESC;
```

### Active Responses
```sql
SELECT
    project_code,
    status,
    COUNT(*) as count
FROM responses
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY project_code, status;
```

---

## 🆘 Troubleshooting

**"relation does not exist" error**
→ Tables not created yet. Run migration script first.

**"permission denied"**
→ Database user lacks CREATE/INSERT rights. Grant appropriate permissions.

**"connection refused"**
→ Check DATABASE_URL is correct and database is accessible from your network.

**Index creation fails**
→ Ensure `btree_gin` extension exists (used for GIN index on JSONB).

---

## 📞 Support

For issues:
1. Check logs from setup script
2. Query `information_schema.tables` to verify
3. Test connection with: `psql DATABASE_URL -c "\dt"`
4. Review migration SQL files for syntax errors

---

**Last Updated:** 2026-03-29
**Version:** 1.0
**Compatible with:** InsForge (PostgreSQL)
