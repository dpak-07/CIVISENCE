@echo off
setlocal

cd /d %~dp0

if not exist .env (
  copy /Y .env.example .env >nul
)

echo Installing Node dependencies...
call npm install
if errorlevel 1 exit /b 1

echo Starting main backend (will auto-start ai_service)...
call npm start
