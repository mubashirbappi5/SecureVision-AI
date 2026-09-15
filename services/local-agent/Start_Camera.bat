@echo off
setlocal enabledelayedexpansion
title SecureVision AI - Camera Agent

cd /d "%~dp0"

echo ===================================================
echo       🛡️ SecureVision AI - Local Camera Agent
echo ===================================================
echo.

:: Check if camera_config.txt exists
if not exist "camera_config.txt" (
    echo [Setup Mode] No Camera ID found.
    echo Please go to your SecureVision Dashboard, add a camera, and copy the Camera ID.
    echo.
    set /p CAM_ID="Paste your Camera ID here: "
    
    :: Save it to the file
    echo !CAM_ID! > camera_config.txt
    echo.
    echo ✅ Camera ID saved successfully!
)

:: Read the ID from the file
set /p CAM_ID=<camera_config.txt

echo 🟢 Starting Camera Agent for ID: %CAM_ID%
echo 🕒 Please wait while the AI model loads...
echo.

:: Activate virtual environment and run the python script
call .venv\Scripts\activate
python main.py --source 0 --camera-id "%CAM_ID%"

pause
