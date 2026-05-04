@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ========================================
echo   УМЦобщаги - остановка на портах 3000 / 3001
echo ========================================

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='SilentlyContinue'; foreach ($p in @(3000,3001)) { Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"

timeout /t 1 /nobreak >nul

echo.
echo ========================================
echo   Запуск: npm run dev
echo   Папка: %CD%
echo ========================================
echo.

where npm >nul 2>&1
if errorlevel 1 (
  if exist "%ProgramFiles%\nodejs\npm.cmd" (
    "%ProgramFiles%\nodejs\npm.cmd" run dev
  ) else (
    echo [Ошибка] npm не найден. Установи Node.js: https://nodejs.org
    pause
    exit /b 1
  )
) else (
  call npm run dev
)

echo.
if errorlevel 1 (
  echo [Ошибка] npm run dev завершился с ошибкой.
)
pause
endlocal
