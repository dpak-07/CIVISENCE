@echo off
REM Setup script for CiviSense Anaconda Environment

echo ========================================
echo CiviSense Backend - Environment Setup
echo ========================================

REM Activate the conda environment
call C:\Users\deepa\anaconda3\Scripts\activate.bat civisense

echo.
echo Installing core dependencies...
pip install fastapi uvicorn python-multipart pymongo motor beanie python-jose passlib pydantic pydantic-settings boto3 python-decouple websockets python-socketio httpx aiohttp email-validator

echo.
echo Installing AI dependencies...
pip install openai-whisper langgraph langchain-core langdetect pytesseract Pillow sentence-transformers faiss-cpu spacy transformers torch

echo.
echo Downloading spaCy model...
python -m spacy download en_core_web_sm

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo To activate the environment, run:
echo   conda activate civisense
echo.
echo To start the backend, run:
echo   cd backend
echo   set KMP_DUPLICATE_LIB_OK=TRUE
echo   uvicorn app.main:app --reload
echo.
pause
