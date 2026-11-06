@echo off
title Dream Fashion POS Terminal - Windows
color 0b

echo =======================================================
echo          DREAM FASHION - ULTIMATE POS SYSTEM
echo          Connected to Next.js Engine and Hardware
echo =======================================================
echo.

cd /d "%~dp0"

:: 1. Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in your PATH!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: 2. Check if local server is already running on port 3141
powershell -NoProfile -Command "(New-Object Net.Sockets.TcpClient).Connect('127.0.0.1', 3141)" >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Next.js POS Server is already active on port 3141.
) else (
    echo [INFO] Starting Next.js POS Server on port 3141...
    start "DreamFashion POS Server" /min node server.js
    timeout /t 3 /nobreak >nul
)

:: 3. Launch the Electron Windows POS Application
echo [INFO] Launching Dream Fashion Desktop Application with 1-Click Silent Printing...
if exist "software\DreamFashion-POS.exe" (
    start "" "software\DreamFashion-POS.exe"
) else if exist "dist-electron\DreamFashion-POS-win-x64\DreamFashion-POS.exe" (
    start "" "dist-electron\DreamFashion-POS-win-x64\DreamFashion-POS.exe"
) else (
    npx electron ./electron/main.cjs
)

exit /b 0
