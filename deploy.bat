@echo off
echo ===================================================
echo   Alraqi Store - Git Push ^& Deploy Script
echo ===================================================
echo.

echo [1] Checking Git Status...
git status
echo.

echo [2] Adding files to commit...
git add .
echo.

echo [3] Committing changes...
set /p commitMsg="Enter commit message (or press enter for 'Full improvement update'): "
IF "%commitMsg%"=="" set commitMsg=Full improvement update
git commit -m "%commitMsg%"
echo.

echo [4] Pushing to GitHub...
git push origin master
:: Or change 'master' to 'main' if your default branch is 'main'
echo.

echo ===================================================
echo   SUCCESS! The code has been pushed to GitHub.
echo   If your code is linked to Render or Vercel, 
echo   the deployment will start automatically.
echo ===================================================
pause
