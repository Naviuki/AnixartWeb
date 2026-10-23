@echo off
chcp 65001 >nul
cd /d "%~dp0"
title AniX - lokal'nyj server

where node >nul 2>nul
if errorlevel 1 (
  echo [AniX] Node.js ne najden. Ustanovite Node.js 18+ s https://nodejs.org i zapustite yarlyk snova.
  pause
  exit /b 1
)

node "%~dp0scripts\start-local.mjs"

echo.
echo [AniX] Server ostanovlen.
pause
