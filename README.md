# OpinionInsights — Survey Routing Platform

A production-grade Next.js survey routing platform with intelligent respondent tracking, multi-supplier quota management, GeoIP validation, HMAC-secured callbacks, and a full admin dashboard.

## Features

- ✅ **Unified routing** (`/r/{code}/{supplier}/{uid}`) — multi-country, prescreener, PID generation
- ✅ **Custom init endpoint** (`/init/{transactionId}/{rid}`) — TrustSample integration
- ✅ **IP throttling** — 3 requests/min per project per IP
- ✅ **Duplicate UID detection** — per-project deduplication
- ✅ **HMAC-secured callbacks** — S2S verification via `/api/callback`
- ✅ **Quota enforcement** — per supplier-project link
- ✅ **GeoIP routing** — Vercel/Cloudflare/IPInfo/MaxMind support
- ✅ **Audit logging** — every routing decision logged
- ✅ **Admin dashboard** — projects, suppliers, responses, audit logs
- ✅ **Dual-mode DB** — InsForge PostgreSQL (production) + SQLite (local)

---

## Getting Started (Local Dev)

### 1. Install Dependencies
```bash
npm install
npm rebuild better-sqlite3
```

### 2. Create Admin User
```bash
node create-admin.js
# Default: admin@opinioninsights.com / admin123
# Custom: node create-admin.js myemail@example.com mypassword
```

### 3. Seed Test Database (Optional)
```bash
node scripts/reset-local-db.js
```

### 4. Run Dev Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)  
Admin dashboard: [http://localhost:3000/admin](http://localhost:3000/admin)  
Login: [http://localhost:3000/login](http://localhost:3000/login)

---

## Routing Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/r/{code}/{supplier}/{uid}` | Unified routing (recommended) |
| GET | `/r/{code}/{uid}?supplier=XXX` | Single-segment routing |
| GET | `/track?code=XXX&uid=YYY` | Legacy tracking endpoint |
| GET | `/init/{transactionId}/{rid}` | TrustSample custom init |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check (returns db_source, latency_ms) |
| GET | `/api/callback?pid=X&cid=Y&type=Z` | Survey outcome callback (HMAC verified) |
| POST | `/api/s2s/callback` | S2S session verification |
| GET | `/api/respondent-stats/{session}` | Respondent session stats |
| GET | `/api/admin/projects` | List all projects |
| POST | `/api/admin/projects` | Create project |
| GET | `/api/admin/responses` | List responses |
| GET | `/api/admin/suppliers` | List suppliers |
| GET | `/api/admin/audit-logs` | Audit log trail |

---

## Environment Variables

```env
# Database (leave empty for local SQLite fallback)
NEXT_PUBLIC_INSFORGE_URL=
INSFORGE_API_KEY=

# GeoIP (optional)
GEOIP_PROVIDER=auto
MAXMIND_DB_PATH=./data/GeoLite2-Country.mmdb
IPINFO_TOKEN=your-ipinfo-token

# Security
ADMIN_MASTER_KEY=your-master-key-here
NODE_ENV=development
```

---

## Production Deployment

### 1. Run Database Migration
```bash
psql -U <user> -d <database> -f scripts/migrate-full-schema.sql
```

### 2. Configure Environment in Vercel
Set all environment variables from above in Vercel project settings.

### 3. Deploy
```bash
git push origin main
# Vercel auto-deploys on push
```

### 4. Create Admin (Production)
```bash
node scripts/create-admin-user.js admin@example.com SecurePass123 "System Admin"
```

### 5. Verify Deployment
```bash
curl https://your-app.vercel.app/api/health
```

---

## Project Structure

```
app/
├── api/
│   ├── health/           # Health check
│   ├── callback/         # HMAC-verified outcome callback
│   ├── s2s/callback/     # S2S session verification
│   ├── respondent-stats/ # Per-session respondent stats
│   └── admin/            # Admin CRUD APIs
├── r/[code]/[...slug]/   # Unified router (main entry point)
├── track/                # Legacy routing endpoint
├── init/[txId]/[rid]/    # TrustSample custom init
├── admin/                # Admin dashboard UI
├── login/                # Auth
└── [complete|terminate|quotafull|...]/  # Status pages

lib/
├── unified-db.ts         # DB abstraction (InsForge + SQLite)
├── db.ts                 # Local SQLite schema
├── geoip-service.ts      # GeoIP detection
├── audit-service.ts      # Audit logging
└── tracking-service.ts   # Response tracking helpers

scripts/
├── migrate-full-schema.sql   # PostgreSQL production schema
├── reset-local-db.js         # Seed test data
├── create-admin-user.js      # Production admin creation
└── automated-test-runner.js  # E2E tests
```

---

## Security

- HMAC SHA-256 signature on all callbacks
- IP-based rate limiting (3/min per project)
- Duplicate UID detection per project
- Admin session cookies (HttpOnly, Secure, SameSite)
- Audit logs on every routing decision
- GeoIP mismatch detection

---

## Default Test Credentials (Local)

- **Email:** admin@opinioninsights.com
- **Password:** admin123

---

## License
MIT
