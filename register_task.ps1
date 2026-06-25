# PowerShell Script to register the Daily Nifty Screener in Windows Task Scheduler
# Run this script to schedule the screener to run automatically every weekday at 4:00 PM IST (after market close).

$BatchPath = "C:\Users\compas laptop\.gemini\antigravity\scratch\nifty_screener_project\run_screener.bat"
$TaskName = "NiftyScreenerDaily"
$TriggerTime = "16:00" # 4:00 PM

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "     Registering Nifty Screener Daily Task Scheduler" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""

# Verify the batch file exists
if (-not (Test-Path $BatchPath)) {
    Write-Error "Error: run_screener.bat not found at target path: $BatchPath"
    exit 1
}

Write-Host "[1/2] Creating daily scheduled task to run at $TriggerTime..." -ForegroundColor Yellow

# Use schtasks.exe to create a task that runs every weekday (Mon-Fri) at 4:00 PM (16:00)
# We pass the --headless argument so that the batch script does not pause for user interaction.
& schtasks /create /tn $TaskName /tr "\`"$BatchPath\`" --headless" /sc weekly /d MON,TUE,WED,THU,FRI /st $TriggerTime /f

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=========================================================" -ForegroundColor Green
    Write-Host "[SUCCESS] Task '$TaskName' registered successfully!" -ForegroundColor Green
    Write-Host "The screener will run automatically every day at $TriggerTime." -ForegroundColor Green
    Write-Host "You can view, edit, or delete this task anytime in the Windows 'Task Scheduler' app." -ForegroundColor Green
    Write-Host "=========================================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "=========================================================" -ForegroundColor Red
    Write-Host "[ERROR] Failed to register task. You may need to run this command in an Administrator PowerShell window." -ForegroundColor Red
    Write-Host "=========================================================" -ForegroundColor Red
}
