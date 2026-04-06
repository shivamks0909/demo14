$cookie = "admin_session=authenticated_admin_session"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$c = New-Object System.Net.Cookie
$c.Name = "admin_session"
$c.Value = "authenticated_admin_session"
$c.Domain = "localhost"
$c.Path = "/"
$session.Cookies.Add($c)

# First trigger a track
Write-Host "=== Triggering track call ==="
try {
    $track = Invoke-WebRequest -Uri "http://localhost:3000/api/track?code=PROJ001&uid=debug_test_user_999" -Method GET -MaximumRedirection 0 -ErrorAction Stop
    Write-Host "Track status: $($track.StatusCode)"
} catch {
    Write-Host "Track status: $($_.Exception.Response.StatusCode)"
}

Start-Sleep -Seconds 2

# Check responses
Write-Host "`n=== Checking responses ==="
try {
    $resp = Invoke-RestMethod -Uri "http://localhost:3000/api/admin/responses" -WebSession $session -Method GET
    Write-Host "Success: $($resp.success)"
    Write-Host "Data type: $($resp.data.GetType().Name)"
    Write-Host "Data count: $($resp.data.Count)"
    if ($resp.data.Count -gt 0) {
        Write-Host "First record:"
        $resp.data[0] | Format-List *
    }
    # Look for our debug user
    $found = $resp.data | Where-Object { $_.uid -like "*debug*" }
    if ($found) {
        Write-Host "`nFound debug user:"
        $found | Format-List *
    } else {
        Write-Host "`nNo debug user found. Looking for e2e users..."
        $e2e = $resp.data | Where-Object { $_.uid -like "*e2e*" }
        if ($e2e) {
            Write-Host "Found $($e2e.Count) e2e users:"
            $e2e | Select-Object uid, status, oi_session | Format-Table
        } else {
            Write-Host "No e2e users either. Showing all UIDs:"
            $resp.data | Select-Object -First 10 uid | Format-Table
        }
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
