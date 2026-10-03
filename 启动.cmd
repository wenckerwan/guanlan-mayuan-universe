@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 未找到 Node.js，请直接打开 dist\马原知识宇宙.html 使用离线版。
  pause
  exit /b 1
)
start "" "http://127.0.0.1:4178"
node scripts\serve.cjs
pause
