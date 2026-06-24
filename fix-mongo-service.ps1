# Repoint the Windows MongoDB service to use D:\mongodb\data, so there is ONE
# MongoDB instance (auto-starting on boot) with data safely on D:.
#
# RUN THIS AS ADMINISTRATOR:
#   Right-click Start > "Terminal (Admin)" / "PowerShell (Admin)", then:
#   powershell -ExecutionPolicy Bypass -File D:\Projects\Med\fix-mongo-service.ps1

$ErrorActionPreference = "Stop"

# Self-elevate: if not running as Administrator, relaunch with a UAC prompt.
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
         ).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $admin) {
  Write-Host "Requesting administrator rights (click YES on the prompt)..." -ForegroundColor Yellow
  Start-Process powershell -Verb RunAs -ArgumentList @(
    "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$PSCommandPath`""
  )
  exit
}

$cfg = "C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg"
$src = "C:\Program Files\MongoDB\Server\8.2\data"
$dst = "D:\mongodb\data"

Write-Host "1) Stopping MongoDB service..." -ForegroundColor Cyan
Stop-Service MongoDB -Force
# also stop any manual mongod that might hold the D: data
Get-Process mongod -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 2

Write-Host "2) Copying current data ($src) -> $dst ..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $dst, "D:\mongodb\log" | Out-Null
robocopy $src $dst /MIR /NFL /NDL /NJH /NJS /R:1 /W:1 | Out-Null

Write-Host "3) Repointing service config to D: ..." -ForegroundColor Cyan
Copy-Item $cfg "$cfg.bak" -Force
(Get-Content $cfg) `
  -replace 'dbPath:\s*.*', 'dbPath: D:\mongodb\data' `
  -replace 'path:\s*.*mongod\.log', 'path: D:\mongodb\log\mongod.log' |
  Set-Content $cfg -Encoding ascii

Write-Host "4) Starting MongoDB service (now on D:) ..." -ForegroundColor Cyan
Start-Service MongoDB
Start-Sleep 4

$svc = (Get-Service MongoDB).Status
$ok  = (Test-NetConnection localhost -Port 27017 -WarningAction SilentlyContinue).TcpTestSucceeded
Write-Host "`nDone. Service: $svc | Port 27017 reachable: $ok" -ForegroundColor Green
Write-Host "From now on MongoDB auto-starts on boot with data on D:\mongodb\data."
Write-Host "You no longer need start-mongo.ps1."
