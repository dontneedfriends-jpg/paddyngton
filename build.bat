@echo off
title Paddyngton Build

echo 🚀 Building Paddyngton...
echo.

echo [1/2] Building frontend (Vite)...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Frontend build failed
    pause
    exit /b 1
)
echo ✅ Frontend built
echo.

echo [2/2] Building Tauri app...
call npm run tauri build
if %errorlevel% neq 0 (
    echo ❌ Tauri build failed
    pause
    exit /b 1
)

echo.
echo ✅ Build complete!
echo 📦 Binary: src-tauri\target\release\Paddyngton.exe
echo 📦 Installer: src-tauri\target\release\bundle\nsis\
echo.
pause
