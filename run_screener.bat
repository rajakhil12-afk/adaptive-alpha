@echo off
:: Premium Command-Line Automation Runner for Nifty Relative Strength Screener
:: Designed for Windows Command Prompt / Task Scheduler

title Nifty Screener Automator
color 0B
echo =================================================================
echo        NIFTY RELATIVE STRENGTH SCREENER AUTOMATION
echo =================================================================
echo.

:: Get current directory of this batch file
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

:: Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Node.js detected. Running JavaScript Screener (v8.1)...
    echo.
    
    echo Running Nifty 50 Screener...
    node nifty_screener_v8.js --nifty50
    echo.
    
    echo Running Nifty 100 Screener...
    node nifty_screener_v8.js --nifty100
    echo.
    goto end
)

:: Check for Python as fallback
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Node.js not found. Python detected. Running Python Screener...
    echo.
    
    echo Running Nifty 50 Screener...
    python nifty_screener.py --nifty50
    echo.
    
    echo Running Nifty 100 Screener...
    python nifty_screener.py --nifty100
    echo.
    goto end
)

:error_no_runtime
color 0C
echo [ERROR] Neither Node.js nor Python was detected in your system PATH.
echo.
echo Please install Node.js (recommended) to automate this script:
echo 1. Download and install from: https://nodejs.org/
echo 2. Restart your terminal/computer.
echo 3. Run this batch file again.
echo.
pause
exit /b 1

:end
echo =================================================================
echo [SUCCESS] Daily Nifty screening completed!
echo Results are saved in the project scratch folder.
echo =================================================================
echo.
:: Only pause if run manually (not via Task Scheduler/non-interactive)
if "%1" neq "--headless" (
    pause
)
