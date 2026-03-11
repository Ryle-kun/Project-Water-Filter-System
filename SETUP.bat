@echo off
title Water System Setup
color 0A
setlocal EnableDelayedExpansion

set "ROOT=%~dp0"
if "!ROOT:~-1!"=="\" set "ROOT=!ROOT:~0,-1!"

set "BACKEND=!ROOT!\backend"
set "FRONTEND=!ROOT!\frontend"
set "VENV=!BACKEND!\venv"
set "DATA=!BACKEND!\data"

echo.
echo  =========================================
echo   Water System - First Time Setup
echo  =========================================
echo.

:: Check Python 3.12
echo [1/5] Checking Python 3.12...
py -3.12 --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python 3.12 not found!
    echo Run this in Command Prompt:
    echo   winget install Python.Python.3.12
    pause
    exit /b 1
)
echo [OK] Python 3.12 found.

:: Check Node
echo [2/5] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found! Download from https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js found.

:: Create data folder
if not exist "!DATA!" mkdir "!DATA!"
echo [OK] Data folder ready.

:: Delete old broken venv if exists
if exist "!VENV!" (
    echo [INFO] Removing old virtual environment...
    rmdir /s /q "!VENV!"
)

:: Create fresh virtual environment
echo [3/5] Creating Python virtual environment...
py -3.12 -m venv "!VENV!"
echo [OK] Virtual environment created.

:: Install Python packages
echo [4/5] Installing Python packages...
"!VENV!\Scripts\python.exe" -m pip install --upgrade pip --quiet
"!VENV!\Scripts\pip.exe" install -r "!BACKEND!\requirements.txt" --quiet
echo [OK] Python packages installed.

:: Install Node packages
echo [5/5] Installing Node packages...
cd /d "!FRONTEND!"
call npm install --silent
echo [OK] Node packages installed.

:: Seed database users
echo [SETUP] Creating default users...
cd /d "!BACKEND!"
"!VENV!\Scripts\python.exe" fix_users.py
echo [OK] Default users created.

echo.
echo  =========================================
echo   Setup Complete!
echo   Run START_APP.bat to launch the app.
echo  =========================================
echo.
pause
