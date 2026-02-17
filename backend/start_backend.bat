@echo off
REM Start CiviSense Backend with Conda Environment

echo ========================================
echo Starting CiviSense Backend
echo ========================================

REM Activate conda environment
call C:\Users\deepa\anaconda3\Scripts\activate.bat civisense

REM Set environment variable for OpenMP
set KMP_DUPLICATE_LIB_OK=TRUE
set DEBUG=true
set LOG_LEVEL=DEBUG

echo.
echo Environment: civisense (activated)
echo Server: http://127.0.0.1:8000
echo Log Level: DEBUG
echo.
echo Starting server...
echo.

REM Start the server
uvicorn app.main:app --reload --log-level debug --access-log

pause
