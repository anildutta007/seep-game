@echo off
title Push Seep Game to GitHub
cd /d "%~dp0"
echo ========================================================
echo        Pushing Seep Card Game to GitHub
echo ========================================================
echo.
echo Remote target: https://github.com/anildutta007/seep-game.git
echo.

git init -b main 2>nul
git add .
git commit -m "Initial commit: Seep (Sweep / Shiv) Traditional North Indian Card Game" 2>nul
git branch -M main

git remote get-url origin >nul 2>nul
if errorlevel 1 (
    git remote add origin https://github.com/anildutta007/seep-game.git
) else (
    git remote set-url origin https://github.com/anildutta007/seep-game.git
)

git push -u origin main
if errorlevel 1 (
    echo.
    echo ========================================================
    echo [ACTION REQUIRED ON GITHUB]
    echo 1. Open your browser and go to: https://github.com/new
    echo 2. Repository name: seep-game
    echo 3. Keep it Public (or Private)
    echo 4. Leave "Add a README file" UNCHECKED (keep repo empty)
    echo 5. Click "Create repository"
    echo 6. Run this push_to_github.bat script again!
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo  SUCCESS! Your code has been pushed to GitHub:
    echo  https://github.com/anildutta007/seep-game
    echo ========================================================
)
pause
