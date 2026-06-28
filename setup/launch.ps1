# ============================================================
# launch.ps1 — start the Command Center desktop app reliably.
# Starts the localhost server (if not already running) and opens
# the dashboard in a clean Chrome app window (or the default browser).
# Called by "Command Center.bat".
# ============================================================

$ErrorActionPreference = 'SilentlyContinue'
$proj = Split-Path -Parent $PSScriptRoot      # ...\command-center
Set-Location $proj

$port = 4173

# Is the server already up?
$up = $false
try { $up = Test-NetConnection 127.0.0.1 -Port $port -InformationLevel Quiet } catch {}

if (-not $up) {
  # Resolve node's full path so this works regardless of PATH quirks.
  $node = (Get-Command node -ErrorAction SilentlyContinue).Source
  if (-not $node) { $node = 'node' }
  Start-Process -FilePath $node -ArgumentList 'scripts/serve.mjs' `
    -WorkingDirectory $proj -WindowStyle Minimized
  # Wait for it to start listening (up to ~8s)
  for ($i = 0; $i -lt 16; $i++) {
    Start-Sleep -Milliseconds 500
    if (Test-NetConnection 127.0.0.1 -Port $port -InformationLevel Quiet) { break }
  }
}

# Open the app window
$url = "http://localhost:$port"
$chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
$chromeX = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
if (Test-Path $chrome) {
  Start-Process $chrome -ArgumentList "--app=$url", '--window-size=1440,900'
} elseif (Test-Path $chromeX) {
  Start-Process $chromeX -ArgumentList "--app=$url", '--window-size=1440,900'
} else {
  Start-Process $url
}
