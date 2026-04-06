# Opinion Insights - Full E2E Test Script (Fixed v2)
# Runs all test phases from PowerShell

$baseUrl = "https://demo14-qzjihzvd8-cypher1446-oss-projects.vercel.app"
$passCount = 0
$failCount = 0
$totalTests = 0
# Admin session cookie value (set by login Server Action in app/login/actions.ts)
$adminCookie = "admin_session=authenticated_admin_session"

function Test-Result {
    param($name, $condition, $detail = "")
    $script:totalTests++
    if ($condition) {
        $script:passCount++
        Write-Host "[PASS] $name" -ForegroundColor Green
        if ($detail) { Write-Host "       $detail" -ForegroundColor DarkGray }
    } else {
        $script:failCount++
        Write-Host "[FAIL] $name" -ForegroundColor Red
        if ($detail) { Write-Host "       $detail" -ForegroundColor DarkGray }
    }
}

# Create a web session for admin requests with the session cookie
$adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$adminCookie = New-Object System.Net.Cookie
$adminCookie.Name = "admin_session"
$adminCookie.Value = "authenticated_admin_session"
$adminCookie.Domain = "demo14-qzjihzvd8-cypher1446-oss-projects.vercel.app"
$adminCookie.Path = "/"
$adminSession.Cookies.Add($adminCookie)

function Invoke-AdminApi {
    param($Uri, $Method = "GET", $Body = $null)
    $params = @{
        WebSession = $adminSession
        Uri = $Uri
        Method = $Method
        ContentType = "application/json"
        ErrorAction = "Stop"
    }
    if ($Body) { $params["Body"] = $Body }
    return Invoke-RestMethod @params
}

# ============================================================
# PHASE 1: Environment Health Check
# ============================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  PHASE 1: Environment Health Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Test 1: Health endpoint
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method GET -ErrorAction Stop
    Test-Result "Health endpoint returns 200" ($health -ne $null) "Status: $($health.status)"
} catch {
    Test-Result "Health endpoint returns 200" $false $_.Exception.Message
}

# Test 2: Track with missing params (should 400)
try {
    $track = Invoke-RestMethod -Uri "$baseUrl/api/track" -Method GET -ErrorAction Stop
    Test-Result "Track without params returns 400" $false "Unexpectedly succeeded"
} catch {
    $is400 = ($_.Exception.Response.StatusCode -eq 400)
    Test-Result "Track without params returns 400" $is400 "Status: $($_.Exception.Response.StatusCode)"
}

# Test 3: Track with invalid project (should 404)
try {
    $track = Invoke-RestMethod -Uri "$baseUrl/api/track?code=INVALID_PROJECT_XYZ&uid=test1" -Method GET -ErrorAction Stop
    Test-Result "Track with invalid project returns 404" $false "Unexpectedly succeeded"
} catch {
    $is404 = ($_.Exception.Response.StatusCode -eq 404)
    Test-Result "Track with invalid project returns 404" $is404 "Status: $($_.Exception.Response.StatusCode)"
}

# ============================================================
# PHASE 2: Admin Portal API Tests (No auth required)
# ============================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  PHASE 2: Admin Portal API Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Test 4: List suppliers
try {
    $suppliers = Invoke-AdminApi -Uri "$baseUrl/api/admin/suppliers" -Method GET
    Test-Result "List suppliers returns data" ($suppliers.suppliers -ne $null) "Count: $($suppliers.suppliers.Count)"
} catch {
    Test-Result "List suppliers returns data" $false $_.Exception.Message
}

# Test 5: Create new supplier
$newSupplier = @{
    name = "E2E Test Supplier"
    login_email = "e2esupplier@test.com"
    password = "TestPass123!"
} | ConvertTo-Json

try {
    $createResult = Invoke-AdminApi -Uri "$baseUrl/api/admin/suppliers" -Method POST -Body $newSupplier
    Test-Result "Create supplier succeeds" ($createResult.supplier -ne $null) "ID: $($createResult.supplier.id)"
    $newSupplierId = $createResult.supplier.id
} catch {
    # Check if already exists (409)
    $is409 = ($_.Exception.Response.StatusCode -eq 409)
    if ($is409) {
        Write-Host "       Supplier already exists, fetching ID..." -ForegroundColor Yellow
        $suppliers = Invoke-AdminApi -Uri "$baseUrl/api/admin/suppliers" -Method GET
        $found = $suppliers.suppliers | Where-Object { $_.login_email -eq "e2esupplier@test.com" }
        if ($found) {
            $newSupplierId = $found.id
            Test-Result "Create supplier succeeds (already exists)" $true "ID: $newSupplierId"
        } else {
            Test-Result "Create supplier succeeds" $false $_.Exception.Message
        }
    } else {
        Test-Result "Create supplier succeeds" $false $_.Exception.Message
    }
}

# Test 6: Verify supplier appears in list
try {
    $suppliers2 = Invoke-AdminApi -Uri "$baseUrl/api/admin/suppliers" -Method GET
    $found = $suppliers2.suppliers | Where-Object { $_.login_email -eq "e2esupplier@test.com" }
    Test-Result "New supplier appears in list" ($found -ne $null) "Found: $($found.name)"
} catch {
    Test-Result "New supplier appears in list" $false $_.Exception.Message
}

# ============================================================
# PHASE 3: Survey Tracking Flow
# ============================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  PHASE 3: Survey Tracking Flow" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Test 7: Track endpoint - create session
try {
    $trackResp = Invoke-WebRequest -Uri "$baseUrl/api/track?code=PROJ001&uid=e2e_test_user_001" -Method GET -MaximumRedirection 0 -ErrorAction Stop
    Test-Result "Track endpoint redirects" ($trackResp.StatusCode -eq 302 -or $trackResp.StatusCode -eq 307) "Status: $($trackResp.StatusCode)"
} catch {
    $isRedirect = ($_.Exception.Response.StatusCode -eq 302 -or $_.Exception.Response.StatusCode -eq 307)
    Test-Result "Track endpoint redirects" $isRedirect "Status: $($_.Exception.Response.StatusCode)"
}

# Test 8: Verify response record created in DB
Write-Host "  Checking DB for response record..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
try {
    $checkResponse = Invoke-AdminApi -Uri "$baseUrl/api/admin/responses" -Method GET
    if ($checkResponse.data) {
        $recentResp = $checkResponse.data | Where-Object { $_.uid -eq "e2e_test_user_001" } | Select-Object -First 1
        Test-Result "Response record created for track call" ($recentResp -ne $null) "Status: $($recentResp.status), Session: $($recentResp.oi_session)"
        $testSessionId = $recentResp.oi_session
    } else {
        Test-Result "Response record created for track call" $false "No data array in response"
        $testSessionId = $null
    }
} catch {
    Test-Result "Response record created for track call" $false $_.Exception.Message
    $testSessionId = $null
}

# Test 9: Callback - complete
if ($testSessionId) {
    try {
        $callbackResp = Invoke-WebRequest -Uri "$baseUrl/api/callback?pid=PROJ001&cid=$testSessionId&type=complete" -Method GET -MaximumRedirection 0 -ErrorAction Stop
        Test-Result "Callback complete returns redirect" ($callbackResp.StatusCode -eq 302 -or $callbackResp.StatusCode -eq 307) "Status: $($callbackResp.StatusCode)"
    } catch {
        $isRedirect = ($_.Exception.Response.StatusCode -eq 302 -or $_.Exception.Response.StatusCode -eq 307)
        Test-Result "Callback complete returns redirect" $isRedirect "Status: $($_.Exception.Response.StatusCode)"
    }

    # Test 10: Verify status updated in DB
    Start-Sleep -Seconds 2
    try {
        $checkUpdated = Invoke-AdminApi -Uri "$baseUrl/api/admin/responses" -Method GET
        if ($checkUpdated.data) {
            $updatedResp = $checkUpdated.data | Where-Object { $_.oi_session -eq $testSessionId } | Select-Object -First 1
            Test-Result "Response status updated to complete" ($updatedResp.status -eq "complete") "Status: $($updatedResp.status)"
        } else {
            Test-Result "Response status updated to complete" $false "No data array"
        }
    } catch {
        Test-Result "Response status updated to complete" $false $_.Exception.Message
    }
} else {
    Test-Result "Callback complete test skipped" $false "No session ID from track"
    Test-Result "Response status updated to complete" $false "No session ID from track"
}

# Test 11: Track with paused project
try {
    $pausedTrack = Invoke-WebRequest -Uri "$baseUrl/api/track?code=PROJ003&uid=e2e_test_user_002" -Method GET -MaximumRedirection 0 -ErrorAction Stop
    $isPausedRedirect = ($pausedTrack.StatusCode -eq 302 -or $pausedTrack.StatusCode -eq 307)
    Test-Result "Track with paused project redirects" $isPausedRedirect "Status: $($pausedTrack.StatusCode)"
} catch {
    $isPausedRedirect = ($_.Exception.Response.StatusCode -eq 302 -or $_.Exception.Response.StatusCode -eq 307)
    Test-Result "Track with paused project redirects" $isPausedRedirect "Status: $($_.Exception.Response.StatusCode)"
}

# Test 12: Callback with invalid type
try {
    $badCallback = Invoke-RestMethod -Uri "$baseUrl/api/callback?pid=PROJ001&cid=test123&type=invalid_type" -Method GET -ErrorAction Stop
    Test-Result "Callback with invalid type returns 400" $false "Unexpectedly succeeded"
} catch {
    $is400 = ($_.Exception.Response.StatusCode -eq 400)
    Test-Result "Callback with invalid type returns 400" $is400 "Status: $($_.Exception.Response.StatusCode)"
}

# ============================================================
# PHASE 4: Supplier Portal API Tests
# ============================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  PHASE 4: Supplier Portal API Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Test 13: Supplier login
try {
    $supplierLogin = Invoke-RestMethod -Uri "$baseUrl/api/supplier/login" -Method POST -ContentType "application/json" -Body '{"email":"testsupplier@demo.com","password":"password"}' -ErrorAction Stop
    Test-Result "Supplier login succeeds" ($supplierLogin.success -eq $true) "Supplier: $($supplierLogin.supplier.name)"
} catch {
    Test-Result "Supplier login succeeds" $false $_.Exception.Message
}

# Test 14: Supplier login with wrong password
try {
    $badLogin = Invoke-RestMethod -Uri "$baseUrl/api/supplier/login" -Method POST -ContentType "application/json" -Body '{"email":"testsupplier@demo.com","password":"wrongpassword"}' -ErrorAction Stop
    Test-Result "Supplier login with wrong password fails" $false "Unexpectedly succeeded"
} catch {
    $is401 = ($_.Exception.Response.StatusCode -eq 401)
    Test-Result "Supplier login with wrong password returns 401" $is401 "Status: $($_.Exception.Response.StatusCode)"
}

# Test 15: Supplier login with non-existent email
try {
    $noEmail = Invoke-RestMethod -Uri "$baseUrl/api/supplier/login" -Method POST -ContentType "application/json" -Body '{"email":"nonexistent@test.com","password":"password"}' -ErrorAction Stop
    Test-Result "Supplier login with non-existent email fails" $false "Unexpectedly succeeded"
} catch {
    $is401 = ($_.Exception.Response.StatusCode -eq 401)
    Test-Result "Supplier login with non-existent email returns 401" $is401 "Status: $($_.Exception.Response.StatusCode)"
}

# Test 16: E2E supplier login (newly created)
if ($newSupplierId) {
    try {
        $e2eLogin = Invoke-RestMethod -Uri "$baseUrl/api/supplier/login" -Method POST -ContentType "application/json" -Body '{"email":"e2esupplier@test.com","password":"TestPass123!"}' -ErrorAction Stop
        Test-Result "E2E supplier login succeeds" ($e2eLogin.success -eq $true) "Supplier: $($e2eLogin.supplier.name)"
    } catch {
        Test-Result "E2E supplier login succeeds" $false $_.Exception.Message
    }
} else {
    Test-Result "E2E supplier login skipped" $false "Supplier was not created"
}

# ============================================================
# PHASE 5: Integration Tests
# ============================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  PHASE 5: Integration Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Test 17: Assign project to supplier
if ($newSupplierId) {
    $assignment = @{
        supplier_id = $newSupplierId
        project_id = "proj_001"
        quota_allocated = 100
    } | ConvertTo-Json

    try {
        $assignResult = Invoke-AdminApi -Uri "$baseUrl/api/admin/supplier-assignments" -Method POST -Body $assignment
        Test-Result "Project assignment succeeds" ($assignResult.success -eq $true) "Supplier: $newSupplierId, Project: proj_001"
    } catch {
        Test-Result "Project assignment succeeds" $false $_.Exception.Message
    }
} else {
    Test-Result "Project assignment skipped" $false "No supplier ID"
}

# Test 18: Multiple track calls simulation
Write-Host "  Simulating 5 track calls..." -ForegroundColor Yellow
$runId = (Get-Date).ToString("HHmmss")
$trackSuccess = 0
for ($i = 1; $i -le 5; $i++) {
    try {
        $t = Invoke-WebRequest -Uri "$baseUrl/api/track?code=PROJ001&uid=e2e_multi_${runId}_$i" -Method GET -MaximumRedirection 0 -ErrorAction Stop
        if ($t.StatusCode -eq 302 -or $t.StatusCode -eq 307) { $trackSuccess++ }
    } catch {
        if ($_.Exception.Response.StatusCode -eq 302 -or $_.Exception.Response.StatusCode -eq 307) { $trackSuccess++ }
    }
}
Test-Result "5 track calls succeed" ($trackSuccess -eq 5) "Success: $trackSuccess/5"

# Test 19: Multiple callbacks simulation
Write-Host "  Simulating callbacks for multi-user test..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
try {
    $multiResponses = Invoke-AdminApi -Uri "$baseUrl/api/admin/responses" -Method GET
    $multiSessions = @()
    if ($multiResponses.data) {
        $multiSessions = $multiResponses.data | Where-Object { $_.uid -like "e2e_multi_${runId}_*" } | Select-Object -First 5
    }

    if ($multiSessions.Count -ge 5) {
        # 3 completes
        for ($i = 0; $i -lt 3; $i++) {
            $sid = $multiSessions[$i].oi_session
            try {
                Invoke-WebRequest -Uri "$baseUrl/api/callback?pid=PROJ001&cid=$sid&type=complete" -Method GET -MaximumRedirection 0 -ErrorAction Stop | Out-Null
            } catch { }
            Start-Sleep -Milliseconds 500
        }
        # 1 terminate
        $sid = $multiSessions[3].oi_session
        try {
            Invoke-WebRequest -Uri "$baseUrl/api/callback?pid=PROJ001&cid=$sid&type=terminate" -Method GET -MaximumRedirection 0 -ErrorAction Stop | Out-Null
        } catch { }
        Start-Sleep -Milliseconds 500

        # 1 quota_full
        $sid = $multiSessions[4].oi_session
        try {
            Invoke-WebRequest -Uri "$baseUrl/api/callback?pid=PROJ001&cid=$sid&type=quota" -Method GET -MaximumRedirection 0 -ErrorAction Stop | Out-Null
        } catch { }
        Start-Sleep -Milliseconds 500
    }

    Start-Sleep -Seconds 3
    $finalResponses = Invoke-AdminApi -Uri "$baseUrl/api/admin/responses" -Method GET
    $multiFinal = @()
    if ($finalResponses.data) {
        $multiFinal = $finalResponses.data | Where-Object { $_.uid -like "e2e_multi_${runId}_*" }
    }

    $completeCount = @($multiFinal | Where-Object { $_.status -eq "complete" }).Count
    $terminateCount = @($multiFinal | Where-Object { $_.status -eq "terminate" }).Count
    $quotaCount = @($multiFinal | Where-Object { $_.status -eq "quota_full" }).Count
    
    Write-Host "    Debug - All statuses: $($multiFinal.status -join ', ')" -ForegroundColor DarkGray

    Test-Result "Multi-user: 3 completes recorded" ($completeCount -eq 3) "Complete: $completeCount/3"
    Test-Result "Multi-user: 1 terminate recorded" ($terminateCount -ge 1) "Terminate: $terminateCount/1"
    Test-Result "Multi-user: 1 quota_full recorded" ($quotaCount -ge 1) "Quota: $quotaCount/1"
    Test-Result "Multi-user: Total 5 responses" ($multiFinal.Count -eq 5) "Total: $($multiFinal.Count)/5"
} catch {
    Test-Result "Multi-user: 3 completes recorded" $false $_.Exception.Message
    Test-Result "Multi-user: 1 terminate recorded" $false $_.Exception.Message
    Test-Result "Multi-user: 1 quota_full recorded" $false $_.Exception.Message
    Test-Result "Multi-user: Total 5 responses" $false $_.Exception.Message
}

# ============================================================
# PHASE 6: Error Handling
# ============================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  PHASE 6: Error Handling" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Test 20: Track with missing uid
try {
    $noUid = Invoke-RestMethod -Uri "$baseUrl/api/track?code=PROJ001" -Method GET -ErrorAction Stop
    Test-Result "Track without uid returns 400" $false "Unexpectedly succeeded"
} catch {
    $is400 = ($_.Exception.Response.StatusCode -eq 400)
    Test-Result "Track without uid returns 400" $is400 "Status: $($_.Exception.Response.StatusCode)"
}

# Test 21: Callback without params
try {
    $noParams = Invoke-RestMethod -Uri "$baseUrl/api/callback" -Method GET -ErrorAction Stop
    Test-Result "Callback without params returns 400" $false "Unexpectedly succeeded"
} catch {
    $is400 = ($_.Exception.Response.StatusCode -eq 400)
    Test-Result "Callback without params returns 400" $is400 "Status: $($_.Exception.Response.StatusCode)"
}

# Test 22: Idempotency - send same callback twice
if ($testSessionId) {
    try {
        $idempotent = Invoke-RestMethod -Uri "$baseUrl/api/callback?pid=PROJ001&cid=$testSessionId&type=complete" -Method GET -ErrorAction Stop
        Test-Result "Idempotent callback returns success" ($idempotent.success -eq $true -or $idempotent.idempotent -eq $true) "Idempotent: $($idempotent.idempotent)"
    } catch {
        Test-Result "Idempotent callback returns success" $false $_.Exception.Message
    }
} else {
    Test-Result "Idempotent callback skipped" $false "No session ID"
}

# ============================================================
# PHASE 7: Production Readiness Check
# ============================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  PHASE 7: Production Readiness" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Test 23: Check production URL
try {
    $prodHealth = Invoke-RestMethod -Uri "https://track.opinioninsights.in/api/health" -Method GET -ErrorAction Stop
    Test-Result "Production health endpoint responds" ($prodHealth -ne $null) "Status: $($prodHealth.status)"
} catch {
    Test-Result "Production health endpoint responds" $false $_.Exception.Message
}

# Test 24: Verify env vars exist in .env.local
$envFile = Get-Content "$PSScriptRoot\.env.local" -ErrorAction SilentlyContinue
Test-Result "NEXT_PUBLIC_INSFORGE_URL configured" ($envFile -match "NEXT_PUBLIC_INSFORGE_URL") ""
Test-Result "INSFORGE_API_KEY configured" ($envFile -match "INSFORGE_API_KEY") ""
Test-Result "INSFORGE_DB_URL configured" ($envFile -match "INSFORGE_DB_URL") ""

# ============================================================
# SUMMARY
# ============================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Total Tests: $totalTests" -ForegroundColor White
Write-Host "  Passed:      $passCount" -ForegroundColor Green
Write-Host "  Failed:      $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })
$passRate = [math]::Round(($passCount / $totalTests) * 100, 1)
Write-Host "  Pass Rate:   $passRate%" -ForegroundColor $(if ($passRate -ge 80) { "Green" } else { "Yellow" })
Write-Host "========================================" -ForegroundColor Cyan

if ($failCount -eq 0) {
    Write-Host "`n  ALL TESTS PASSED! System is ready for production." -ForegroundColor Green
} else {
    Write-Host "`n  $failCount test(s) failed. Review results above." -ForegroundColor Yellow
}
