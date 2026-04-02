# 📦 PRODUCTION DEPLOYMENT GUIDE
**Survey Routing Platform**

---

## Quick Reference

| Environment | Status | Est. Time | Complexity |
|-------------|--------|-----------|------------|
| Staging/QA | ✅ Ready | 2-4 hours | Medium |
| Production (Low Volume <10K/mo) | ✅ Ready | 4-8 hours | Medium |
| Production (Medium Volume 10K-100K/mo) | ✅ Ready + Redis | 1-2 days | Medium-High |
| Production (High Volume >100K/mo) | 🟡 Needs Optimizations | 2-3 days | High |

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [Application Deployment](#application-deployment)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Monitoring & Alerting](#monitoring--alerting)
7. [Rollback Procedure](#rollback-procedure)
8. [Troubleshooting](#troubleshooting)

---

## 1. Pre-Deployment Checklist

### 1.1 Infrastructure Requirements

✅ **Server**
- Linux (Ubuntu 22.04+, CentOS 8+, or similar)
- Node.js 18+ LTS
- npm 9+
- 2+ CPU cores
- 4+ GB RAM
- SSL certificate (for production HTTPS)

✅ **Database**
- PostgreSQL 14+ (recommended) or existing InsForge instance
- Connection pooling configured (PgBouncer recommended for high volume)
- Database credentials with create/alter/drop privileges for initial setup

✅ **Optional (High Volume)**
- Redis instance for caching (port 6379)
- Log aggregation service (Elasticsearch, Datadog, etc.)
- APM monitoring (New Relic, Sentry)

### 1.2 Configuration Prerequisites

Before starting, gather:
- [ ] PostgreSQL connection string
- [ ] Admin email and strong password
- [ ] [Optional] MaxMind GeoIP2 database file or ipinfo.io API token
- [ ] Domain name pointing to your server
- [ ] SSL certificate files (or use Let's Encrypt)

---

## 2. Environment Configuration

### 2.1 Production .env File

Create `.env` (or set environment variables on your hosting platform):

```bash
# ========================================
# REQUIRED: Database Configuration
# ========================================
NEXT_PUBLIC_INSFORGE_URL=postgresql://username:password@hostname:5432/database_name?sslmode=require

# For local SQLite development, leave empty:
# NEXT_PUBLIC_INSFORGE_URL=

# ========================================
# REQUIRED: Runtime Environment
# ========================================
NODE_ENV=production
NEXTAUTH_SECRET=$(openssl rand -base64 32)  # Generate random 32-byte string
ADMIN_MASTER_KEY=$(openssl rand -base64 32)  # For admin operations

# ========================================
# OPTIONAL BUT RECOMMENDED: GeoIP Configuration
# ========================================
# Choose one provider:

# Option A: MaxMind (Best performance, one-time purchase)
GEOIP_PROVIDER=maxmind
MAXMIND_DB_PATH=/path/to/GeoLite2-Country.mmdb

# Option B: ipinfo.io (Commercial API, $99/year)
GEOIP_PROVIDER=ipinfo
IPINFO_TOKEN=your_ipinfo_api_token_here

# Option C: Auto-detect (uses headers if available, falls back to free APIs)
GEOIP_PROVIDER=auto

# ========================================
# OPTIONAL: Email Configuration (if using email features)
# ========================================
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=username
SMTP_PASS=password
SMTP_FROM=noreply@yourdomain.com

# ========================================
# OPTIONAL: Monitoring
# ========================================
SENTRY_DSN=https://your-dsn@sentry.io/project-id
NEW_RELIC_LICENSE_KEY=your-license-key

# ========================================
# OPTIONAL: Redis Cache (for medium/high volume)
# ========================================
REDIS_URL=redis://localhost:6379

# ========================================
# APPLICATION SETTINGS
# ========================================
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 2.2 Generate Secrets

```bash
# Generate secure secrets
openssl rand -base64 32  # Use output for ADMIN_MASTER_KEY and NEXTAUTH_SECRET
```

### 2.3 Validate Configuration

```bash
# Test database connectivity
node -e "
const { createClient } = require('pg');
const client = new createClient({ connectionString: process.env.NEXT_PUBLIC_INSFORGE_URL });
client.connect().then(() => console.log('✅ DB connection OK')).catch(e => console.error('❌ DB connection failed:', e.message)).finally(() => client.end());
"

# Check GeoIP configuration (if using MaxMind)
ls -la \$MAXMIND_DB_PATH  # Should show .mmdb file exists

# Check Redis connectivity (if using)
redis-cli ping  # Should return PONG
```

---

## 3. Database Setup

### 3.1 Create PostgreSQL Database

```sql
-- Connect to PostgreSQL as superuser
createdb survey_router
createuser survey_user --password --interactive  # Set strong password

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE survey_router TO survey_user;
```

### 3.2 Run Migration Scripts

Execute in order:

```bash
# 1. Full schema migration (required)
psql postgresql://survey_user:password@localhost/survey_router -f scripts/migrate-full-schema.sql

# 2. Audit logs migration (idempotent, safe to run multiple times)
psql postgresql://survey_user:password@localhost/survey_router -f scripts/migrate-audit-log

# 3. S2S fields migration (if starting fresh, step 1 already covers this)
psql postgresql://survey_user:password@localhost/survey_router -f scripts/add-s2s-fields.sql

# 4. Callback logs migration
psql postgresql://survey_user:password@localhost/survey_router -f scripts/add-callback-logs.sql
```

### 3.3 Verify Schema

```bash
psql postgresql://survey_user:password@localhost/survey_router -c "\dt"
# Should list 9+ tables

psql postgresql://survey_user:password@localhost/survey_router -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"
```

### 3.4 (Optional) Seed Sample Data

For testing only, NOT for production:

```bash
# Only run on fresh database with sample data
psql postgresql://survey_user:password@localhost/survey_router -f scripts/seed-insforge.sql
```

---

## 4. Application Deployment

### 4.1 Server Setup

```bash
# 1. SSH into your server
ssh user@your-server.com

# 2. Navigate to app directory
cd /var/www/survey-router

# 3. Pull latest code
git pull origin main

# 4. Install dependencies
npm ci --only=production

# 5. Build the application
npm run build

# 6. Set environment variables
# Either edit .env file or use your hosting platform's env var interface
nano .env  # Paste environment configuration from section 2.1

# 7. Run database migrations (from section 3)
sudo -u postgres psql survey_router -f /var/www/survey-router/scripts/migrate-full-schema.sql
```

### 4.2 Start Application

**Option A: PM2 (Recommended for Production)**

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start npm --name "survey-router" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the output command
```

**Option B: Docker**

```dockerfile
# Dockerfile example (if using Docker)
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/next-env.d.ts ./
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t survey-router .
docker run -p 3000:3000 --env-file .env survey-router
```

**Option C: Systemd Service**

```ini
# /etc/systemd/system/survey-router.service
[Unit]
Description=Survey Router Application
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/survey-router
EnvironmentFile=/var/www/survey-router/.env
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.tar
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable survey-router
sudo systemctl start survey-router
sudo systemctl status survey-router
```

### 4.3 Configure Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/survey-router
upstream survey_router {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration (using Let's Encrypt or your cert)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;

    # Proxy configuration
    location / {
        proxy_pass http://survey_router;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint (no auth)
    location /api/health {
        proxy_pass http://survey_router;
        access_log off;
    }

    # Admin area - stricter caching
    location /admin {
        proxy_pass http://survey_router;
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/survey-router /etc/nginx/sites-enabled/

# Test nginx config
nginx -t

# Reload nginx
systemctl reload nginx
```

### 4.4 Create Admin User

```bash
# Run the admin creation script
cd /var/www/survey-router
node create-admin.js

# You will be prompted for:
# - Email address
# - Password (minimum 8 characters)
# - Full name

# Record credentials securely (password manager or encrypted storage)
```

### 4.5 Verify Application is Running

```bash
# Check PM2 status
pm2 status survey-router

# Check logs for errors
pm2 logs survey-router --lines 50

# Or use systemd
journalctl -u survey-router -f

# Check nginx access/error logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 5. Post-Deployment Verification

### 5.1 Health Check

```bash
# Should return 200 OK
curl -I https://yourdomain.com/api/health

# Expected output:
# HTTP/2 200
# content-type: application/json; charset=utf-8
# ...
```

### 5.2 Admin Login

1. Navigate to: `https://yourdomain.com/login`
2. Login with admin credentials created in step 4.4
3. Verify dashboard loads without errors
4. Check console for any JavaScript errors

### 5.3 Test Routing Flow

```bash
# 1. Generate a test link
# - Login to admin
# - Go to Projects
# - Select TEST_SINGLE (or your test project)
# - Click "Generate Link"
# - Copy link like: https://yourdomain.com/r/TEST_SINGLE/DYN01/UID123

# 2. Test the link in incognito/private browser
curl -I "https://yourdomain.com/r/TEST_SINGLE/DYN01/TESTUSER123"

# Expected: 302 redirect with cookies set
# Set-Cookie: last_uid=TESTUSER123
# Set-Cookie: last_sid=<uuid>
# Set-Cookie: last_pid=TEST_SINGLE

# 3. Verify response record created in database
psql $DATABASE_URL -c "
SELECT id, status, uid, ip, created_at
FROM responses
WHERE uid='TESTUSER123'
ORDER BY created_at DESC
LIMIT 1;
"

# Should see status = 'in_progress'
```

### 5.4 Test Callback Flow

```bash
# 1. Get the session token from the response record
SESSION=$(psql $DATABASE_URL -t -c "SELECT session_token FROM responses WHERE uid='TESTUSER123' ORDER BY created_at DESC LIMIT 1;" | xargs)

# 2. Get the project code
PROJECT_CODE=$(psql $DATABASE_URL -t -c "SELECT project_code FROM responses WHERE uid='TESTUSER123' ORDER BY created_at DESC LIMIT 1;" | xargs)

# 3. Get the S2S secret from s2s_config
SECRET=$(psql $DATABASE_URL -t -c "SELECT secret_key FROM s2s_config WHERE project_id=(SELECT id FROM projects WHERE project_code='$PROJECT_CODE');" | xargs)

# 4. Generate HMAC signature
NODE_JS="
const crypto = require('crypto');
const params = { pid: '$PROJECT_CODE', cid: '$SESSION', type: 'complete' };
const canonical = Object.keys(params).sort().map(k => \`\${k}=\${params[k]}\`).join('&');
console.log(crypto.createHmac('sha256', '$SECRET').update(canonical).digest('hex'));
"
SIGNATURE=$(node -e "$NODE_JS")

# 5. Test callback endpoint
curl -v "https://yourdomain.com/api/callback?pid=$PROJECT_CODE&cid=$SESSION&type=complete&sig=$SIGNATURE"

# Expected response: {"success":true,"status":"complete"}
# Status in database should change from 'in_progress' to 'complete'
```

### 5.5 Test Fraud Detection

```bash
# Test 1: Quota exceeded
# - Create supplier link with quota_allocated=1
# - Link supplier to project
# - Make 2 requests through routing (first succeeds, second should redirect to /quotafull)

# Test 2: Duplicate UID
# - Use same UID twice for same project (should redirect to /duplicate-string)

# Test 3: IP throttling
# - Make 3 requests from same IP within 1 minute (4th should redirect to /security-terminate)

# Test 4: Invalid project code (should redirect to /paused?title=PROJECT_NOT_FOUND)
# Test 5: Paused project (should redirect to /paused?title=PROJECT_PAUSED)
```

### 5.6 Review Audit Logs

```sql
-- Check recent fraud events
SELECT event_type, payload, ip, created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 20;

-- Check entry denials specifically
SELECT
    payload->>'reason' as reason,
    COUNT(*) as count
FROM audit_logs
WHERE event_type = 'entry_denied'
GROUP BY payload->>'reason'
ORDER BY count DESC;

-- Check callback logs
SELECT clickid, type, success, response_code, error_message
FROM callback_logs
ORDER BY created_at DESC
LIMIT 10;
```

---

## 6. Monitoring & Alerting

### 6.1 Essential Metrics to Monitor

| Metric | Threshold | Alert |
|--------|-----------|-------|
| **Health check failures** | > 0 | Immediate |
| **5xx error rate** | > 1% | Warning |
| **Response time (p95)** | > 2000ms | Warning |
| **Quota exceeded events** | Spike > 50% | Warning |
| **IP throttled events** | Spike > 100% | Warning |
| **Database connection pool** | > 80% utilization | Warning |
| **Memory usage** | > 85% | Warning |
| **Disk space** | > 90% full | Critical |

### 6.2 Health Check Endpoint

```
GET https://yourdomain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-03-30T12:00:00.000Z",
  "database": "connected",
  "uptime": 3600
}
```

### 6.3 Setting Up Monitoring (Examples)

**Using UptimeRobot / Pingdom:**
- Monitor `/api/health` every 1 minute
- Alert on non-200 response

**Using Grafana + Prometheus:**

```yaml
# prometheus.yml scrape config
scrape_configs:
  - job_name: 'survey-router'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics'  # You'll need to implement this endpoint
```

**Using Sentry for Error Tracking:**
```bash
npm install @sentry/nextjs
# Configure in next.config.ts with SENTRY_DSN
```

### 6.4 Log Management

**Option A: Local Logs with Logrotate**

```bash
# /etc/logrotate.d/survey-router
/var/www/survey-router/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        pm2 reload survey-router
    endscript
}
```

**Option B: ELK Stack**
- Filebeat → Logstash → Elasticsearch → Kibana
- Centralized log aggregation and search

**Option C: Cloud Logging (Datadog, Loggly, Papertrail)**
- Configure to tail PM2 logs or application logs directory

---

## 7. Rollback Procedure

### 7.1 Immediate Rollback (Code Issues)

```bash
# Using PM2
cd /var/www/survey-router
git log --oneline -5  # Find previous stable commit

# Rollback to previous commit
git reset --hard HEAD~1
npm ci --only=production
npm run build

# Restart application
pm2 restart survey-router

# Verify
pm2 logs survey-router --lines 50
```

### 7.2 Database Rollback (Migration Issues)

```bash
# If a migration caused issues, you may need to restore from backup

# 1. Stop application
pm2 stop survey-router

# 2. Restore database backup
# (Assuming you created a backup before migrations)
pg_restore -U survey_user -d survey_router backup_before_deploy.dump

# 3. Start application
pm2 start survey-router

# 4. Verify health
curl https://yourdomain.com/api/health
```

**⚠️ WARNING:** Database schema changes are often irreversible. Always backup before migrations:

```bash
# Create backup before deployment
pg_dump -U survey_user survey_router > backup_$(date +%Y%m%d_%H%M%S).dump
```

---

## 8. Troubleshooting

### 8.1 Common Issues

#### Issue: Application won't start (ports in use)

**Symptoms:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Check what's using port 3000
lsof -i :3000
# Kill process or change PORT in PM2 config
pm2 delete survey-router
PORT=3001 pm2 start npm --name "survey-router" -- start
```

#### Issue: Database connection failed

**Symptoms:** `Database unavailable` errors

**Solution:**
```bash
# Verify connection string
echo $NEXT_PUBLIC_INSFORGE_URL

# Test connection manually
node -e "
const { createClient } = require('pg');
const client = new createClient({ connectionString: process.env.NEXT_PUBLIC_INSFORGE_URL });
client.connect().then(() => console.log('OK')).catch(console.error).finally(() => client.end());
"

# Check PostgreSQL is running
systemctl status postgresql

# Verify network connectivity (firewall, VPC, etc.)
nc -zv postgres-host 5432
```

#### Issue: GeoIP returning 'Unknown' for all IPs

**Symptoms:** All requests show country as 'Unknown'

**Solution:**
1. Check which provider is configured: `echo $GEOIP_PROVIDER`
2. If using MaxMind: verify `$MAXMIND_DB_PATH` points to valid `.mmdb` file
3. If using ipinfo: verify `$IPINFO_TOKEN` is valid
4. Check logs: `pm2 logs survey-router | grep GeoIP`
5. Test with curl:
   ```bash
   curl "https://yourdomain.com/r/TEST/DYN01/UID123"
   # Logs should show geo lookup attempts
   ```

#### Issue: HMAC signature verification failing

**Symptoms:** Callbacks return `{"success":false,"error":"Invalid signature"}`

**Solution:**
1. Verify `s2s_config` table has secret for project:
   ```sql
   SELECT secret_key FROM s2s_config WHERE project_id = (SELECT id FROM projects WHERE project_code='YOUR_PROJECT');
   ```
2. Check canonical string generation matches on both sides
3. Ensure signature is computed over sorted keys: `pid`, `cid`, `type`
4. Check callback logs: `SELECT * FROM callback_logs WHERE clickid='xxx' ORDER BY created_at DESC LIMIT 1;`
5. Verify timestamp is within 5 minutes (check `timestamp` parameter)

#### Issue: Rate limiting too aggressive

**Symptoms:** Legitimate users getting throttled

**Solution:**
Adjust threshold in code (hard-coded 3/min) or implement per-project config:
```typescript
// In app/r/[code]/[...slug]/route.ts, line 234:
if (ipCount && ipCount >= 3) {  // Change 3 to desired threshold
```

For per-project configuration, add `ip_throttle_threshold` column to `projects` table.

#### Issue: Admin pages showing duplicate sidebar/header

**Symptoms:** Dashboard pages have doubled navigation

**Solution:** Fixed in latest code. Verify you're on latest commit:
```bash
git log --oneline -1
# Should show commit after "Fix: UI Layout bug fixed"
```

If issue persists, check `app/admin/audit-logs/page.tsx` for duplicate imports of AdminSidebar/AdminHeader.

#### Issue: Build fails with TypeScript errors

**Symptoms:** `npm run build` reports type errors

**Solution:**
```bash
# Clean and rebuild
rm -rf .next
npm ci
npx tsc --noEmit  # Check for errors
npm run build

# Common causes:
# - Missing @types package: npm install -D @types/package-name
# - Type mismatch in custom code: fix the type annotation
```

#### Issue: Memory leaks / high CPU

**Symptoms:** PM2 shows memory growing over time

**Solution:**
```bash
# Check PM2 metrics
pm2 monit

# Restart application
pm2 restart survey-router

# Enable garbage collection logging for investigation
pm2 restart survey-router --node-args="--expose-gc --max-old-space-size=4096"
```

Check for:
- Unclosed database connections (should use connection pooling)
- Unbounded in-memory caches (GeoIP cache could grow indefinitely - implement LRU)
- Memory leaks in custom code

### 8.2 Getting Support

1. **Check logs first:**
   ```bash
   pm2 logs survey-router --lines 100
   journalctl -u survey-router -f  # if using systemd
   tail -f /var/log/nginx/error.log
   ```

2. **Enable verbose logging:**
   ```bash
   # In .env
   DEBUG=*
   LOG_LEVEL=debug
   ```

3. **Run verification suite:**
   ```bash
   node verify-production-readiness.js
   ```

4. **Check test results:**
   - E2E_TEST_PLAN.md for manual test scenarios
   - TEST_RESULTS.md for previous test outcomes

---

## 9. Performance Optimization (Medium/High Volume)

### 9.1 Add Redis Cache

```javascript
// lib/redis-client.ts
import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const redisClient = createClient({ url: redisUrl });

export async function getCached(key: string) {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
}

export async function setCached(key: string, value: any, ttlSeconds = 300) {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
}
```

Then cache frequent queries:
```typescript
// In app/r/[code]/[...slug]/route.ts
const cacheKey = `project:${project.id}`;
const cached = await getCached(cacheKey);
if (cached) {
    project = cached;
} else {
    // fetch from DB
    await setCached(cacheKey, project, 300); // 5 min TTL
}
```

### 9.2 Database Connection Pooling

Already configured via pg library defaults. For high volume, use PgBouncer:
```ini
# /etc/pgbouncer/pgbouncer.ini
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
```

Update `DATABASE_URL` to point to PgBouncer: `postgresql://...@localhost:6432/...`

### 9.3 Move Audit Logs to Separate Database

```sql
-- Create dedicated database for logs
createdb survey_router_logs

-- Point application to differentDB for audit_logs, callback_logs, s2s_logs
-- Consider using schema separation or separate connection
```

---

## 10. Security Hardening Checklist

- [ ] All secrets stored in environment variables (never in code)
- [ ] Database uses SSL/TLS connection
- [ ] Firewall blocks all non-essential ports (only 80, 443)
- [ ] Server OS and packages regularly updated
- [ ] Fail2ban configured to block repeated failed attempts
- [ ] File permissions: app directory readable, not writable by web user
- [ ] Database password rotated every 90 days
- [ ] Admin users use strong passwords + 2FA if possible
- [ ] Rate limiting enabled (already in code)
- [ ] Audit logs cannot be modified or deleted
- [ ] HTTPS enforced (HSTS header)
- [ ] CSP headers configured
- [ ] Regular security scans with `npm audit` (fix vulnerabilities)

---

## 11. Backup Strategy

### 11.1 Automated Daily Backups

```bash
#!/bin/bash
# /etc/cron.daily/survey-router-backup

BACKUP_DIR="/var/backups/survey-router"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="survey_router"

mkdir -p $BACKUP_DIR

# Database backup
pg_dump $DB_NAME | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Keep last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp "$BACKUP_DIR/db_$DATE.sql.gz" s3://your-backup-bucket/survey-router/
```

### 11.2 Restore from Backup

```bash
gunzip -c backup_20260330_120000.sql.gz | psql survey_router
```

---

## 12. Success Metrics

After 1 week of production, verify:

- [ ] Health check shows 100% uptime
- [ ] No unhandled exceptions in logs
- [ ] Audit logs show expected fraud patterns (quota exceeded, duplicate UID, etc.)
- [ ] Callback success rate > 99%
- [ ] Database size growing at expected rate (~100-500 bytes per response)
- [ ] Response times < 500ms p95
- [ ] All critical alerts tested and working

---

## Appendix: Quick Commands Reference

```bash
# Start/stop/restart
pm2 restart survey-router
pm2 logs survey-router -f
pm2 monit

# Database
psql $DATABASE_URL -c "\dt"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM responses;"  # Total responses

# Nginx
nginx -t  # Test config
systemctl reload nginx
tail -f /var/log/nginx/access.log

# Updates
git pull origin main
npm ci --only=production
npm run build
pm2 restart survey-router

# Monitoring
pm2 show survey-router  # Memory, CPU, uptime
df -h  # Disk space
free -m  # Memory usage
```

---

**Deployment Guide Version:** 1.0
**Last Updated:** 2026-03-30
**Applicable To:** Survey Routing Platform v2.0+

---
