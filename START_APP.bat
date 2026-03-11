@echo off
title Barangay Water System
color 0B
setlocal EnableDelayedExpansion

set "ROOT=%~dp0"
if "!ROOT:~-1!"=="\" set "ROOT=!ROOT:~0,-1!"

echo.
echo  =========================================
echo   Barangay Water System - Starting...
echo  =========================================
echo.

set "BACKEND=!ROOT!\backend"
set "FRONTEND=!ROOT!\frontend"
set "VENV=!BACKEND!\venv"

if not exist "!BACKEND!" (
    echo [ERROR] Cannot find backend folder.
    echo Make sure START_APP.bat is inside Project-Water-Filter-System folder.
    pause
    exit /b 1
)

if not exist "!VENV!\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found.
    echo Please run SETUP.bat first!
    pause
    exit /b 1
)

echo [1/2] Starting Backend API...
start "Water System - Backend" cmd /k "cd /d "!BACKEND!" && "!VENV!\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo [INFO] Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo [2/2] Starting Frontend Dashboard...
start "Water System - Frontend" cmd /k "cd /d "!FRONTEND!" && npm run dev"

echo [INFO] Waiting for frontend to start...
timeout /t 4 /nobreak >nul

start http://localhost:5173

echo.
echo  =========================================
echo   App is running!
echo.
echo   Dashboard:  http://localhost:5173
echo   Backend:    http://localhost:8000
echo   API Docs:   http://localhost:8000/docs
echo.
echo   Login:  admin / admin123
echo.
echo   Close the Backend and Frontend
echo   terminal windows to stop the app.
echo  =========================================
echo.
pause
