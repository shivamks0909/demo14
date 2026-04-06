$cookie = "admin_session=authenticated_admin_session"
$headers = @{ Cookie = $cookie }
try {
    $r = Invoke-WebRequest -Uri "http://localhost:3000/api/admin/suppliers" -Headers $headers -Method GET
    Write-Host "Status: $($r.StatusCode)"
    Write-Host "Content: $($r.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
}
