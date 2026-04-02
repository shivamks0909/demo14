# Survey Routing Platform Test Report

## Test Environment
- Server: http://localhost:3002
- Database: SQLite (./data/local.db)
- Date: Tue 2026-03-31

---

## TEST 1: Standard Route (/r/)

**URL:** http://localhost:3002/r/TEST_SINGLE/DYN01/TESTUSER_BROWSER_1

**Expected:** 302 redirect to survey URL with oi_session, oi_uid, oi_transaction_id params

**Actual:**

**Database Check:** After request, query responses table for clickid/uid

**Result:** ⏳ Pending execution

---

## TEST 2: Legacy Route (/track)

**URL:** http://localhost:3002/track?code=TEST_SINGLE&uid=TESTUSER_BROWSER_2&supplier=LUC01

**Expected:** 302 redirect to survey URL

**Actual:**

**Database Check:** 

**Result:** ⏳ Pending execution

---

## TEST 3: Custom Init Route (/init)

**URL:** http://localhost:3002/init/TESTUSER_BROWSER_3?transactionId=TEST_SINGLE&rid=TESTUSER_BROWSER_3&isManual=true

**Expected:** 302 redirect to survey URL

**Actual:**

**Database Check:** Should have is_manual=true, transaction_id set

**Result:** ⏳ Pending execution

---

## TEST 4: Multi-Country

**URL:** http://localhost:3002/r/TEST_MULTI/DYN01/TESTUSER_BROWSER_4?country=US

**Expected:** Redirect to US-specific URL if multi-country configured

**Actual:**

**Result:** ⏳ Pending execution

---

## TEST 5: Paused Project

**URL:** http://localhost:3002/r/TEST_PAUSED/DYN01/TESTUSER_BROWSER_5

**Expected:** Show paused page (not redirect)

**Actual:**

**Result:** ⏳ Pending execution

---

## TEST 6: Duplicate UID

**First request:**
URL: http://localhost:3002/r/TEST_SINGLE/DYN01/TESTUSER_DUPE_TEST

**Expected:** 302 redirect (first time OK)

**Second request:**
URL: http://localhost:3002/r/TEST_SINGLE/DYN01/TESTUSER_DUPE_TEST

**Expected:** Show duplicate detection page

**Actual:**

**Result:** ⏳ Pending execution

---

## TEST 7: Admin Dashboard

**URL:** http://localhost:3002/admin

**Expected:** Dashboard loads (check auth requirement)

**Actual:**

**Result:** ⏳ Pending execution

---

## TEST 8: Audit Logs

**URL:** http://localhost:3002/admin/audit-logs

**Expected:** Recent entries from our tests visible

**Actual:**

**Result:** ⏳ Pending execution

---

## Summary

- Tests run: 0/8
- Passed: 0
- Failed: 0
- Server port: 3002
- Issues encountered:
  - ⚠ WAL persistence errors (non-fatal)
  - Database schema needed column additions

**Next:** Execute tests sequentially, capture screenshots/data
