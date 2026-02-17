@echo off
echo Installing bcrypt package...
echo.

call C:\Users\deepa\anaconda3\Scripts\activate.bat civisense
pip install bcrypt

echo.
echo Done! Bcrypt installed successfully.
echo You can now restart the backend server.
pause
