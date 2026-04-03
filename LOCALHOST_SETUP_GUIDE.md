# Localhost Setup Guide - Complete

## Problem Diagnosis

The original issue had **3 root causes**:

### ❌ 1. Wrong Route Format
- **Bad:** `/r/test23/gfgf` (missing UID)
- **Good:** `/r/test23/supplier1/uid_123456`

### ❌ 2. Incorrect base_url Configuration
- **Bad:** `http://localhost:3000/status?code=TEST&uid=` (status page)
- **Good:** `http://localhost:3000/mock-survey` (survey page)

### ❌ 3. Flow Broken
- User landed on status page directly → no survey → no callback → SERVER_ERROR

---

## What Was Fixed

✅ **Updated project `test23`** - Changed base_url from status page to mock-survey
- Old: `http://localhost:3000/status?code=TEST&uid=`
- New: `http://localhost:3000/mock-survey`

✅ **Verified routing logic** - The `/r/[code]/[slug]` route correctly extracts:
- Project code from URL param
- Supplier from slug[0]
- UID from slug[1]

✅ **Verified callback flow** - Mock survey correctly calls `/api/callback`

---

## How to Make It Live on Localhost

### Step 1: Start the Server

```bash
npm run dev
```

Server will start on `http://localhost:3000`

---

### Step 2: Test the Complete Flow

Open this URL in your browser:

```
http://localhost:3000/r/test23/supplier1/uid_123456
```

**Expected flow:**

1. ✅ **Routing** - `/r` route processes entry
   - Creates response record in DB (`status: in_progress`)
   - Generates session token (`oi_session`)
   - Redirects to survey

2. ✅ **Redirect** - You land on mock survey:
   ```
   http://localhost:3000/mock-survey?pid=test23&oi_session=xxx&oi_sig=yyy
   ```

3. ✅ **Completion** - Click "Finish Survey" button
   - POSTs to `/api/callback?pid=test23&cid=xxx&type=complete`
   - Updates response status to `complete`
   - Sets `completion_time`

4. ✅ **Final Status** - Redirects to status page:
   ```
   http://localhost:3000/status?code=test23&uid=uid_123456
   ```
   Shows success animation

---

## Testing Scripts Provided

### 1. `setup-localhost.js`
Connects to database and fixes project configuration.

**Run:**
```bash
node setup-localhost.js
```

**Output:**
- Lists all projects
- Updates `test23` base_url
- Provides test instructions

---

### 2. `test-complete-flow.js`
Full end-to-end automated test that simulates the entire flow.

**Run (with server running):**
```bash
node test-complete-flow.js
```

**Checks:**
- ✓ Project configuration
- ✓ Entry redirect (to mock-survey)
- ✓ Response record creation
- ✓ Callback success
- ✓ Status update in DB
- ✓ Status page loads

---

## Troubleshooting

### SERVER_ERROR still appearing?

Check the server console for errors. Common causes:

1. **Database connection failed**
   - Verify InsForge is running on localhost:5000
   - Check `.env.local` has correct `NEXT_PUBLIC_INSFORGE_URL` and `INSFORGE_API_KEY`

2. **Project not found**
   ```bash
   node setup-localhost.js
   ```
   Ensure `test23` project exists and is `active`

3. **base_url wrong**
   ```sql
   SELECT project_code, base_url FROM projects WHERE project_code='test23';
   ```
   Should return `http://localhost:3000/mock-survey`

4. **Mock survey not found**
   - Verify `app/mock-survey/page.tsx` exists
   - Should have "Finish Survey" button that calls callback

---

## Quick Verification Commands

```bash
# 1. Check database connection
node scripts/test-connection.ts

# 2. Check project setup
node setup-localhost.js

# 3. Run full flow test (with server running)
node test-complete-flow.js

# 4. View server logs (in terminal where npm run dev is running)
# Look for errors in [Track], [Callback], or [Routing] prefixes
```

---

## Route Reference

| Route | Purpose | Expected Parameters |
|-------|---------|---------------------|
| `/r/:code/:supplier/:uid` | Entry point | `code=projectCode`, `supplier=token`, `uid=userId` |
| `/mock-survey` | Survey form | Receives `oi_session`, `pid`, `oi_sig` |
| `/api/callback` | Completion | `pid`, `cid` (session), `type` |
| `/status?code=:code&uid=:uid` | Final status | Shows outcome based on response status |

---

## Environment Requirements

- Node.js 18+
- Next.js dev server: `npm run dev`
- InsForge local instance on port 5000 (or cloud)
- `.env.local` with:
  ```
  NEXT_PUBLIC_INSFORGE_URL=http://localhost:5000
  INSFORGE_API_KEY=your_key_here
  ```

---

## Status

✅ **Project is now correctly configured for localhost**
✅ **Routing works with proper UID format**
✅ **base_url points to actual survey**
✅ **Mock survey implements callback**
✅ **End-to-end flow validated**

**Everything is ready to go! Just run `npm run dev` and test the flow.**
