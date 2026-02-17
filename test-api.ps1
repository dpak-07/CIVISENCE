# CiviSense API Testing Script for PowerShell
# Save this as test-api.ps1 and run: .\test-api.ps1

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "CiviSense API Testing Script" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Root Endpoint
Write-Host "Test 1: Root Endpoint" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/" -Method GET
    Write-Host "✓ SUCCESS" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json) -ForegroundColor Gray
} catch {
    Write-Host "✗ FAILED: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: Health Check
Write-Host "Test 2: Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method GET
    Write-Host "✓ SUCCESS" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json) -ForegroundColor Gray
} catch {
    Write-Host "✗ FAILED: $_" -ForegroundColor Red
}
Write-Host ""

# Test 3: Register User
Write-Host "Test 3: Register New User" -ForegroundColor Yellow
$registerBody = @{
    email = "testuser$(Get-Random -Maximum 9999)@example.com"
    password = "password123"
    full_name = "Test User"
    phone = "+1234567890"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $registerBody
    
    Write-Host "✓ SUCCESS - User registered!" -ForegroundColor Green
    Write-Host "Access Token: $($response.access_token.Substring(0,50))..." -ForegroundColor Gray
    Write-Host "User ID: $($response.user.id)" -ForegroundColor Gray
    Write-Host "Email: $($response.user.email)" -ForegroundColor Gray
    
    # Save token for next tests
    $global:accessToken = $response.access_token
    $global:userEmail = $response.user.email
} catch {
    Write-Host "✗ FAILED: $_" -ForegroundColor Red
    Write-Host "Note: This might fail if MongoDB is not running" -ForegroundColor Yellow
}
Write-Host ""

# Test 4: Login (if registration succeeded)
if ($global:userEmail) {
    Write-Host "Test 4: Login with Registered User" -ForegroundColor Yellow
    $loginBody = @{
        email = $global:userEmail
        password = "password123"
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" `
            -Method POST `
            -ContentType "application/json" `
            -Body $loginBody
        
        Write-Host "✓ SUCCESS - Login successful!" -ForegroundColor Green
        $global:accessToken = $response.access_token
    } catch {
        Write-Host "✗ FAILED: $_" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 5: Get Current User (if we have a token)
if ($global:accessToken) {
    Write-Host "Test 5: Get Current User Profile" -ForegroundColor Yellow
    try {
        $headers = @{
            "Authorization" = "Bearer $global:accessToken"
        }
        $response = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/me" `
            -Method GET `
            -Headers $headers
        
        Write-Host "✓ SUCCESS" -ForegroundColor Green
        Write-Host ($response | ConvertTo-Json) -ForegroundColor Gray
    } catch {
        Write-Host "✗ FAILED: $_" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 6: AI Service
Write-Host "Test 6: AI Service Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8001/" -Method GET
    Write-Host "✓ SUCCESS" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json) -ForegroundColor Gray
} catch {
    Write-Host "✗ FAILED: $_" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Testing Complete!" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Yellow
Write-Host "  Backend API: http://localhost:8000" -ForegroundColor Gray
Write-Host "  API Docs: http://localhost:8000/docs" -ForegroundColor Gray
Write-Host "  AI Service: http://localhost:8001" -ForegroundColor Gray
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Gray
Write-Host ""
