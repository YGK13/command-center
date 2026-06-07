# ============================================================
# uninstall-scheduler.ps1
# Removes the Command Center morning-brief scheduled task.
#   powershell -ExecutionPolicy Bypass -File setup\uninstall-scheduler.ps1
# ============================================================

$TaskName = 'CommandCenter-MorningBrief'

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "Removed scheduled task '$TaskName'." -ForegroundColor Green
} else {
  Write-Host "No scheduled task named '$TaskName' was found."
}
