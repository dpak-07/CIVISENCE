# Test registration with detailed error output
$uri = "http://127.0.0.1:8000/api/auth/register"
$body = @{
    email = "testuser@example.com"
    password = "Test@123456"
    full_name = "Test User"
    phone = "+919876543210"
    role = "citizen"
} | ConvertTo-Json

Write-Host "Testing registration endpoint..." -ForegroundColor Yellow
Write-Host "URL: $uri"
Write-Host "Body: $body"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $uri -Method POST -ContentType "application/json" -Body $body
    Write-Host "SUCCESS!" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "ERROR!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Status Description: $($_.Exception.Response.StatusDescription)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Full Error:" -ForegroundColor Yellow
    $_.Exception | Format-List -Force
    
    # Try to get response body
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host ""
        Write-Host "Response Body:" -ForegroundColor Yellow
        Write-Host $responseBody
    }
}
