# Quick Start Script for CiviSense AI Backend
# Run this to start training and deployment

Write-Host "=== CiviSense AI Backend - Quick Start ===" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is available
$dockerAvailable = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerAvailable) {
    Write-Host "✓ Docker detected" -ForegroundColor Green
    Write-Host ""
    Write-Host "Starting with Docker (Recommended)..." -ForegroundColor Yellow
    Write-Host ""
    
    # Start Docker Compose
    docker-compose up --build
} else {
    Write-Host "⚠ Docker not found. Starting manual setup..." -ForegroundColor Yellow
    Write-Host ""
    
    # Check Python
    $pythonAvailable = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pythonAvailable) {
        Write-Host "❌ Python not found. Please install Python 3.11+" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Python detected" -ForegroundColor Green
    Write-Host ""
    
    # Install backend dependencies
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location backend
    python -m pip install -r requirements.txt
    
    Write-Host ""
    Write-Host "Installing AI service dependencies..." -ForegroundColor Yellow
    Set-Location ../ai_service
    python -m pip install -r requirements_ai.txt
    
    Write-Host ""
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
    Write-Host ""
    
    # Start backend
    Write-Host "Starting backend server..." -ForegroundColor Yellow
    Write-Host "This will auto-train models if they don't exist" -ForegroundColor Cyan
    Write-Host ""
    
    Set-Location ../backend
    python -m app.main
}
