@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install it from https://nodejs.org/ then retry.
  pause
  exit /b 1
)
node portable/server.mjs --root ../dist --lan
pause
