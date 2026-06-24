# MongoDB now runs as the Windows service (auto-starts on boot, data on D:\mongodb).
# This script just checks it's up — it does NOT start a second instance, because
# two MongoDB instances fighting over port 27017 caused data to "change" between runs.
#
# If you haven't repointed the service to D: yet, run (as Administrator):
#   powershell -ExecutionPolicy Bypass -File D:\Projects\Med\fix-mongo-service.ps1

$ok = (Test-NetConnection localhost -Port 27017 -WarningAction SilentlyContinue).TcpTestSucceeded
if ($ok) {
  Write-Host "MongoDB is up on localhost:27017." -ForegroundColor Green
} else {
  Write-Host "MongoDB is not running. Start the service (as Administrator):" -ForegroundColor Yellow
  Write-Host "  net start MongoDB"
}
