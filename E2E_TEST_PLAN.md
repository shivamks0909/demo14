# END-TO-END TEST PLAN - Survey Routing Platform

**Test Date:** 2026-03-30
**Tester:** QA Engineer (Antigravity)
**Objective:** Full system validation - frontend, backend, database, fraud detection, callbacks

---

## PHASE 1: SYSTEM HEALTH CHECK

### 1.1 Verify Database
- [ ] Confirm test database exists at `./data/test_local.db`
- [ ] Verify all tables present: clients, projects, suppliers, supplier_project_links, responses, audit_logs
- [ ] Check indexes exist
- [ ] Verify sample data loaded

### 1.2 TypeScript Compilation
- [ ] Run `npx tsc --noEmit`
- [ ] Confirm no errors or warnings

### 1.3 Environment Configuration
- [ ] Check `.env.local` has `NEXT_PUBLIC_INSFORGE_URL` empty or unset
- [ ] Confirm local SQLite mode is active

### 1.4 Start Dev Server
- [ ] Run `npm run dev`
- [ ] Verify server starts on http://localhost:3000
- [ ] Check for runtime errors in console

---

## PHASE 2: AUTHENTICATION TEST

### 2.1 Login Page
- [ ] Navigate to http://localhost:3000/login
- [ ] Verify login form loads correctly
- [ ] Check no 500 errors

### 2.2 Valid Login
- [ ] Enter test credentials (from seed data)
- [ ] Submit login
- [ ] Verify redirect to admin dashboard
- [ ] Check session cookie is set

### 2.3 Invalid Login
- [ ] Logout
- [ ] Try invalid credentials
- [ ] Verify error message displayed
- [ ] Confirm no redirect

### 2.4 Session Persistence
- [ ] Login successfully
- [ ] Refresh page
- [ ] Verify still logged in

### 2.5 Protected Routes
- [ ] Logout
- [ ] Try accessing `/admin` directly
- [ ] Verify redirect to login

---

## PHASE 3: DASHBOARD VALIDATION

### 3.1 Dashboard Load
- [ ] Navigate to `/admin`
- [ ] Verify KPI cards display (Total Projects, Responses, etc.)
- [ ] Check charts render
- [ ] Confirm activity feed shows data

### 3.2 Navigation
- [ ] Test all sidebar links:
  - [ ] Dashboard
  - [ ] Projects
  - [ ] Responses
  - [ ] Suppliers
  - [ ] Audit Logs
  - [ ] Settings

### 3.3 Quick Actions
- [ ] Test all buttons in quick actions panel
- [ ] Verify each button triggers expected action

---

## PHASE 4: PROJECT MANAGEMENT

### 4.1 Create Project
- [ ] Navigate to Projects page
- [ ] Click "New Project"
- [ ] Fill form with test data
- [ ] Submit
- [ ] Verify project appears in list
- [ ] Check database: `SELECT * FROM projects WHERE project_code = 'TEST_NEW'`

### 4.2 Edit Project
- [ ] Click edit on existing project
- [ ] Modify fields
- [ ] Save
- [ ] Verify changes persist after refresh

### 4.3 Status Change
- [ ] Pause a project
- [ ] Verify status changes in UI
- [ ] Resume project
- [ ] Verify status updates

### 4.4 Country Routing (Multi-Country)
- [ ] Create/Edit multi-country project
- [ ] Add country URLs
- [ ] Save
- [ ] Verify in database
- [ ] Edit country settings
- [ ] Delete country
- [ ] Verify persistence

---

## PHASE 5: SUPPLIER MANAGEMENT

### 5.1 Create Supplier
- [ ] Navigate to Suppliers page
- [ ] Click "New Supplier"
- [ ] Fill form (name, token, platform, redirect URLs)
- [ ] Submit
- [ ] Verify supplier appears in list
- [ ] Check database entry

### 5.2 Edit Supplier
- [ ] Click edit on supplier
- [ ] Modify fields
- [ ] Save
- [ ] Verify changes persist

### 5.3 Supplier-Project Linking
- [ ] Navigate to supplier edit
- [ ] Add project link with quota
- [ ] Save
- [ ] Verify `supplier_project_links` table updated
- [ ] Check quota_allocated and quota_used values

### 5.4 Delete Supplier
- [ ] Delete test supplier
- [ ] Verify removed from UI
- [ ] Check database foreign key constraints

---

## PHASE 6: LINK GENERATION

### 6.1 Generate Tracking Link
- [ ] Navigate to Projects page
- [ ] Select project
- [ ] Click "Generate Link" or similar
- [ ] Choose supplier
- [ ] Copy generated link

### 6.2 Verify Link Format
- [ ] Check link format: `/r/{project_code}/{supplier_token}/{uid}`
- [ ] OR legacy: `/track?code={project_code}&uid={uid}`
- [ ] Verify all parameters present

---

## PHASE 7: TRACK FLOW (CORE USER JOURNEY)

### 7.1 Access Tracking Link
- [ ] Open generated link in new browser/incognito
- [ ] URL: `http://localhost:3000/r/TEST_SINGLE/DYN01/TESTUSER123`
- [ ] Verify:
  - [ ] Response 302 redirect
  - [ ] Cookies set: `last_uid`, `last_sid`, `last_pid`
  - [ ] Redirect to project base_url with injected params

### 7.2 Database Verification
- [ ] Check `responses` table:
  - [ ] New entry created
  - [ ] `clickid` matches session token
  - [ ] `oi_session` populated
  - [ ] `status` = 'in_progress'
  - [ ] `uid` = TESTUSER123
  - [ ] `supplier_token` = DYN01
  - [ ] `project_code` = TEST_SINGLE
  - [ ] `ip` recorded
  - [ ] `user_agent` recorded
  - [ ] `device_type` detected
  - [ ] `created_at` timestamp

### 7.3 Audit Log
- [ ] Check `audit_logs` table:
  - [ ] Entry with `event_type` = 'entry_created'
  - [ ] Payload contains project_code, supplier_token, uid
  - [ ] IP address logged
  - [ ] User agent logged

### 7.4 Quota Increment
- [ ] Check `supplier_project_links`:
  - [ ] `quota_used` incremented by 1
  - [ ] Timestamp updated

---

## PHASE 8: CALLBACK SYSTEM

### 8.1 Complete Callback
- [ ] From redirect response, capture `last_sid` cookie
- [ ] Call: `GET http://localhost:3000/api/callback?session={last_sid}&type=complete`
- [ ] Verify API response: `{ "success": true, "updated": true }`
- [ ] Check `responses` table:
  - [ ] `status` changed to 'complete'
  - [ ] `completion_time` set
  - [ ] `updated_at` updated

### 8.2 Audit Log for Callback
- [ ] Check `audit_logs`:
  - [ ] Entry with `event_type` = 'callback_success'
  - [ ] Payload contains session, type, response_id

### 8.3 Idempotent Callback
- [ ] Call same callback URL again
- [ ] Verify response: `{ "success": true, "idempotent": true }`
- [ ] Confirm no duplicate updates

### 8.4 Other Callback Types
- [ ] Test `type=terminate`
- [ ] Test `type=quota` (quota_full)
- [ ] Test `type=security` (security_terminate)
- [ ] Verify each updates status correctly

### 8.5 Duplicate Callback Prevention
- [ ] After terminal status reached, try callback again
- [ ] Verify no further updates occur

---

## PHASE 9: S2S (Server-to-Server) VERIFICATION

### 9.1 S2S Callback Endpoint
- [ ] Call `/api/s2s/callback` with proper signature
- [ ] Verify:
  - [ ] Response success
  - [ ] `s2s_verified` flag set to true on response
  - [ ] Entry created in `s2s_logs` table

### 9.2 Invalid Signature
- [ ] Call with incorrect signature
- [ ] Verify rejection (401 or 400)
- [ ] Check `s2s_verified` remains false

### 9.3 Expired Timestamp
- [ ] Call with old timestamp
- [ ] Verify rejection

### 9.4 IP Whitelisting (if configured)
- [ ] Call from unauthorized IP
- [ ] Verify rejection

---

## PHASE 10: FRAUD DETECTION SYSTEM

### 10.1 Fraud Trigger Conditions
- [ ] Simulate complete callback WITHOUT S2S verification (if required by config)
- [ ] Check `responses.is_fake_suspected` flag
- [ ] Verify status override if configured
- [ ] Check `audit_logs` for `fraud_detected` event

### 10.2 Quota Exceeded Fraud
- [ ] Set quota to 1 on a supplier link
- [ ] Make 2 entries
- [ ] Verify second triggers quota exceeded
- [ ] Check redirect to `/quotafull`
- [ ] Verify audit log entry

### 10.3 IP Throttling
- [ ] Make 4 requests from same IP within 60 seconds
- [ ] Verify 4th redirects to `/security-terminate`
- [ ] Check audit log for `ip_throttled`

### 10.4 Duplicate UID
- [ ] Use same UID twice for same project
- [ ] Verify second redirects to `/duplicate-string`
- [ ] Check audit log for `duplicate_uid`

---

## PHASE 11: RESPONSE TABLE UI

### 11.1 Responses Page
- [ ] Navigate to Responses page
- [ ] Verify all entries visible
- [ ] Check pagination works
- [ ] Test search/filter functionality
- [ ] Verify sortable columns

### 11.2 Response Details
- [ ] Click on a response row
- [ ] Open detail view
- [ ] Verify all fields:
  - [ ] clickid
  - [ ] oi_session
  - [ ] status
  - [ ] timestamps (created_at, updated_at, completion_time)
  - [ ] IP, user_agent, device_type
  - [ ] country_code
  - [ ] supplier info
  - [ ] project info

### 11.3 Status Updates Reflect
- [ ] Trigger callback from API
- [ ] Refresh Responses page
- [ ] Verify status change visible

---

## PHASE 12: AUDIT LOGS UI

### 12.1 Audit Logs Page
- [ ] Navigate to Audit Logs
- [ ] Verify entries from test actions present
- [ ] Check event types displayed correctly
- [ ] Verify timestamps in correct timezone
- [ ] Test pagination

### 12.2 Filter by Event Type
- [ ] Filter for 'entry_created'
- [ ] Filter for 'callback_success'
- [ ] Filter for 'entry_denied'
- [ ] Verify filtered results correct

### 12.3 Payload Details
- [ ] Click to expand audit log entry
- [ ] Verify JSON payload shows full context
- [ ] Check IP and user_agent present

---

## PHASE 13: FULL WORKFLOW TEST

### 13.1 Complete User Journey
1. [ ] Create new project (via UI)
2. [ ] Create new supplier (via UI)
3. [ ] Link supplier to project with quota (via UI)
4. [ ] Generate tracking link (via UI)
5. [ ] Open link in browser → verify entry created
6. [ ] Trigger S2S callback (simulate supplier)
7. [ ] Trigger completion callback
8. [ ] Verify response status updated
9. [ ] Check audit logs for all events
10. [ ] Verify dashboard metrics updated

### 13.2 Database Consistency
- [ ] No duplicate clickid values
- [ ] Status transitions valid (in_progress → complete/terminate/etc)
- [ ] Timestamps consistent (created_at ≤ updated_at)
- [ ] Foreign keys intact (project_id, supplier_id)
- [ ] No orphan records

---

## PHASE 14: ERROR CASES & EDGE CONDITIONS

### 14.1 Invalid Project Code
- [ ] Access `/r/INVALID_PROJECT/ANY/ANY`
- [ ] Verify redirect to `/paused?title=PROJECT_NOT_FOUND`
- [ ] Check audit log entry

### 14.2 Paused Project
- [ ] Access `/r/TEST_PAUSED/ANY/ANY`
- [ ] Verify redirect to `/paused?title=PROJECT_PAUSED`
- [ ] Check audit log

### 14.3 Missing Parameters
- [ ] Access `/r/TEST_SINGLE/DYN01` (missing UID)
- [ ] Verify proper error handling
- [ ] No crash

### 14.4 Invalid Callback Type
- [ ] Call `/api/callback?session=xxx&type=invalid`
- [ ] Verify error response
- [ ] No database corruption

### 14.5 Duplicate Request Handling
- [ ] Rapid-fire multiple requests to same endpoint
- [ ] Verify no race conditions
- [ ] Check database consistency

---

## PHASE 15: BUTTON TESTING (ALL UI CONTROLS)

### 15.1 Project Page Buttons
- [ ] "New Project" button → opens form
- [ ] "Save" button → creates/updates
- [ ] "Edit" button → loads data
- [ ] "Delete" button → confirms and removes
- [ ] "Generate Link" → shows link
- [ ] "Copy" → copies to clipboard
- [ ] "Export" → downloads data
- [ ] "Filter" → filters list
- [ ] "Pagination" → navigates pages

### 15.2 Response Page Buttons
- [ ] "Refresh" → reloads data
- [ ] "Search" → filters results
- [ ] "View Details" → opens modal/page
- [ ] "Retry Callback" → resends callback
- [ ] "Block/Unblock" → changes status

### 15.3 Supplier Page Buttons
- [ ] All CRUD buttons functional
- [ ] "Link Project" → opens linking dialog
- [ ] "Manage Quota" → adjusts quota

---

## PHASE 16: PERFORMANCE & STRESS

### 16.1 Load Testing (Basic)
- [ ] Make 10 concurrent track requests
- [ ] Verify all succeed
- [ ] Check no database locks

### 16.2 Database Performance
- [ ] Check query response times
- [ ] Verify indexes being used (no full table scans)
- [ ] Confirm no N+1 queries in UI

---

## PHASE 17: SECURITY CHECKS

### 17.1 SQL Injection
- [ ] Try SQL injection in UID parameter
- [ ] Verify parameterized queries prevent injection

### 17.2 XSS Prevention
- [ ] Try XSS payload in UID
- [ ] Verify proper escaping in UI

### 17.3 Authentication Bypass
- [ ] Try accessing admin routes without session
- [ ] Verify blocked

### 17.4 Rate Limiting
- [ ] Verify IP throttle active
- [ ] Test threshold enforcement

---

## FINAL REPORT

After all tests complete, compile:

1. ✅ **Working Features** - List all passing tests
2. ❌ **Broken Features** - List all failures with steps to reproduce
3. ⚠️ **Partial Issues** - Features that work but with limitations
4. 🔥 **Critical Bugs** - Showstoppers requiring immediate fix
5. 📊 **Data Consistency Issues** - Any data integrity problems
6. 🚫 **Non-Functional Buttons** - UI controls that don't work
7. 🧠 **Suggested Fixes** - Prioritized by severity

---

## TEST EXECUTION LOG

**Start Time:** TBD
**End Time:** TBD
**Total Duration:** TBD
**Tests Passed:** 0 / 150+
**Tests Failed:** 0
**Status:** READY TO BEGIN

---

**Ready to start systematic testing.**
