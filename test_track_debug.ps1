$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$c = New-Object System.Net.Cookie
$c.Name = "admin_session"
$c.Value = "authenticated_admin_session"
$c.Domain = "localhost"
$c.Path = "/"
$session.Cookies.Add($c)

# Test track
Write-Host "=== Testing track ==="
try {
    $track = Invoke-WebRequest -Uri "http://localhost:3000/api/track?code=PROJ001&uid=test_track_debug_001" -Method GET -MaximumRedirection 0 -ErrorAction Stop
    Write-Host "Track status: $($track.StatusCode)"
} catch {
    Write-Host "Track status: $($_.Exception.Response.StatusCode)"
}

Start-Sleep -Seconds 3

# Check responses
Write-Host "`n=== Checking responses ==="
try {
    $resp = Invoke-RestMethod -Uri "http://localhost:3000/api/admin/responses" -WebSession $session -Method GET
    Write-Host "Success: $($resp.success)"
    Write-Host "Data count: $($resp.data.Count)"
    
    # Look for our test user
    $found = $resp.data | Where-Object { $_.uid -eq "test_track_debug_001" }
    if ($found) {
        Write-Host "Found test user!"
        $found | Format-List uid, status, oi_session, project_code
    } else {
        Write-Host "Test user NOT found. Showing last 3 records:"
        $resp.data | Select-Object -Last 3 uid, status, oi_session, project_code, created_at | Format-Table
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
