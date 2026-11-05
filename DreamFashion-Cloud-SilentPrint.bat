@echo off
title Dream Fashion Cloud Terminal - Kiosk Silent Print
color 0a

echo ===============================================================
echo          DREAM FASHION CLOUD POS - 1-CLICK SILENT PRINT
echo              https://hakim.qzz.io (No Print Dialogs)
echo ===============================================================
echo.

:: 1. Try launching Google Chrome with --kiosk-printing
set CHROME_PATH=""
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set CHROME_PATH="%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

if not %CHROME_PATH%=="" (
    echo [INFO] Launching Google Chrome in Kiosk Silent Printing Mode...
    start "" %CHROME_PATH% --app="https://hakim.qzz.io" --kiosk-printing --disable-print-preview
    exit /b 0
)

:: 2. Fallback to Microsoft Edge with --kiosk-printing
set EDGE_PATH=""
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" set EDGE_PATH="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" set EDGE_PATH="C:\Program Files\Microsoft\Edge\Application\msedge.exe"

if not %EDGE_PATH%=="" (
    echo [INFO] Launching Microsoft Edge in Kiosk Silent Printing Mode...
    start "" %EDGE_PATH% --app="https://hakim.qzz.io" --kiosk-printing --disable-print-preview
    exit /b 0
)

echo [WARNING] Neither Chrome nor Edge found at standard locations. Opening default browser...
start https://hakim.qzz.io
exit /b 0
