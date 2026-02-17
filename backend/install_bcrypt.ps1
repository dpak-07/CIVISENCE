# Install bcrypt for CiviSense backend
Write-Host "Installing bcrypt package..." -ForegroundColor Yellow
Write-Host ""

# Activate conda environment and install bcrypt
& C:\Users\deepa\anaconda3\Scripts\activate.bat civisense
pip install bcrypt

Write-Host ""
Write-Host "Done! Bcrypt installed successfully." -ForegroundColor Green
Write-Host "Please restart the backend server now." -ForegroundColor Cyan
