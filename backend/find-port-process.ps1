# PowerShell script to find what process is using a COM port
# Usage: .\find-port-process.ps1 COM8

param(
    [Parameter(Mandatory=$true)]
    [string]$PortName
)

Write-Host "Searching for processes using $PortName..." -ForegroundColor Cyan
Write-Host ""

# Method 1: Check using Get-Process and handle information
$found = $false

# Get all processes that might be using serial ports
$processes = Get-Process | Where-Object {
    $_.ProcessName -like "*arduino*" -or
    $_.ProcessName -like "*serial*" -or
    $_.ProcessName -like "*node*" -or
    $_.ProcessName -like "*nest*"
}

Write-Host "Checking common processes that might use serial ports:" -ForegroundColor Yellow
foreach ($proc in $processes) {
    Write-Host "  - $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Common solutions:" -ForegroundColor Green
Write-Host "  1. Close Arduino IDE Serial Monitor if open" -ForegroundColor White
Write-Host "  2. Check if your backend is already running:" -ForegroundColor White
Write-Host "     - Look for 'nest' or 'node' processes in Task Manager" -ForegroundColor Gray
Write-Host "     - Stop the backend if it's running, then restart" -ForegroundColor Gray
Write-Host "  3. Close any other serial port tools:" -ForegroundColor White
Write-Host "     - PuTTY, Tera Term, Serial Monitor, etc." -ForegroundColor Gray
Write-Host "  4. Restart your computer if nothing else works" -ForegroundColor White

Write-Host ""
Write-Host "To check if backend is running:" -ForegroundColor Cyan
Write-Host "  Get-Process | Where-Object { `$_.ProcessName -like '*node*' -or `$_.ProcessName -like '*nest*' }" -ForegroundColor Gray

Write-Host ""
Write-Host "To stop all Node processes (WARNING: This will stop ALL Node.js apps):" -ForegroundColor Yellow
Write-Host "  Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force" -ForegroundColor Red

