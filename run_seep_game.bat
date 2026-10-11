@echo off
title SEEP (सीप) - Traditional North Indian Card Game
echo ==============================================================
echo        Starting SEEP (सीप) Indian Card Game Hub...
echo ==============================================================
echo.
cd /d "%~dp0"

set PYTHON_CMD=python
where python >nul 2>nul
if errorlevel 1 (
    if exist "C:\Users\dutt_\AppData\Local\Python\bin\python.exe" (
        set PYTHON_CMD="C:\Users\dutt_\AppData\Local\Python\bin\python.exe"
    )
)

%PYTHON_CMD% server.py

if errorlevel 1 (
    echo.
    echo Launching index.html directly in browser...
    start "" "%~dp0index.html"
)
pause
