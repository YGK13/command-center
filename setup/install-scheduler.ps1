# ============================================================
# install-scheduler.ps1
# Registers a Windows Task Scheduler job that runs the Command
# Center morning brief automatically, Sunday-Friday at 07:00
# local time. Saturday is skipped by default (your day off). Change
# the -DaysOfWeek and -At values below to fit your week.
#
# Run once from PowerShell:
#   powershell -ExecutionPolicy Bypass -File setup\install-scheduler.ps1
# ============================================================

$ErrorActionPreference = 'Stop'

# --- Resolve paths ------------------------------------------------
$ProjectDir = Split-Path -Parent $PSScriptRoot          # ...\command-center
$Script     = Join-Path $ProjectDir 'scripts\daily-brief.mjs'

# Find node.exe (works whether or not it's on PATH for the scheduler)
$NodeCmd = (Get-Command node -ErrorAction SilentlyContinue)
if ($null -eq $NodeCmd) {
  Write-Error "node.exe not found on PATH. Install Node.js or add it to PATH, then re-run."
  exit 1
}
$NodeExe = $NodeCmd.Source

$TaskName = 'CommandCenter-MorningBrief'

Write-Host "Project : $ProjectDir"
Write-Host "Node    : $NodeExe"
Write-Host "Script  : $Script"
Write-Host ""

# --- Build the action (run node against the script, in project dir) ---
$Action = New-ScheduledTaskAction -Execute $NodeExe `
  -Argument "`"$Script`"" `
  -WorkingDirectory $ProjectDir

# --- Trigger: 07:00 on the days you choose, via DaysOfWeek ---
# Default is Sunday through Friday (Saturday off). Add or remove days
# to fit your week.
$Trigger = New-ScheduledTaskTrigger -Weekly `
  -DaysOfWeek Sunday,Monday,Tuesday,Wednesday,Thursday,Friday `
  -At 7:00AM

# --- Settings: wake the machine, run if a scheduled start was missed ---
$Settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -WakeToRun `
  -DontStopOnIdleEnd `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
  -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 5)

# --- Run as the current user, only when logged on -----------------
$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

# --- Register (replace if it already exists) ----------------------
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Write-Host "Existing task found - replacing..."
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Register-ScheduledTask -TaskName $TaskName `
  -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal `
  -Description "Command Center: fetch feeds, refresh dashboard data, email the morning brief (Sun-Fri 07:00 by default)." | Out-Null

Write-Host ""
Write-Host "Installed scheduled task '$TaskName' (Sun-Fri 07:00 local)." -ForegroundColor Green
Write-Host ""
Write-Host "Test it right now with:"
Write-Host "    Start-ScheduledTask -TaskName $TaskName"
Write-Host "Check status with:"
Write-Host "    Get-ScheduledTaskInfo -TaskName $TaskName"
Write-Host ""
Write-Host "NOTE: Before the first run, create your .env file (copy .env.example)"
Write-Host "and add your Gmail App Password, or the email step will be skipped."
