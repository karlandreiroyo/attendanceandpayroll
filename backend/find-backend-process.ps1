# Find the actual backend process

Write-Host "Searching for backend process..." -ForegroundColor Cyan
Write-Host ""

# Get all node processes with full command line
$allProcesses = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq "node.exe" -or $_.CommandLine -like "*node*"
}

$backendFound = $false

foreach ($proc in $allProcesses) {
    $cmdLine = $proc.CommandLine
    $pid = $proc.ProcessId
    
    # Check if it's the backend (NestJS)
    if ($cmdLine -like "*nest*" -or 
        $cmdLine -like "*backend*" -or 
        $cmdLine -like "*main.js*" -or
        ($cmdLine -like "*node*" -and $cmdLine -like "*dist/main*") -or
        ($cmdLine -like "*ts-node*" -and $cmdLine -like "*main.ts*")) {
        
        $backendFound = $true
        Write-Host "Found BACKEND process:" -ForegroundColor Green
        Write-Host "  PID: $pid" -ForegroundColor Yellow
        Write-Host "  Command: $cmdLine" -ForegroundColor Gray
        Write-Host ""
        Write-Host "To stop this backend process:" -ForegroundColor Cyan
        Write-Host "  Stop-Process -Id $pid -Force" -ForegroundColor White
        Write-Host ""
    }
}

if (-not $backendFound) {
    Write-Host "No backend process found in running Node processes." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "However, COM8 might still be locked. Try:" -ForegroundColor Cyan
    Write-Host "  1. Check if Arduino IDE Serial Monitor is open" -ForegroundColor White
    Write-Host "  2. Check Task Manager for any serial port tools" -ForegroundColor White
    Write-Host "  3. Restart your computer" -ForegroundColor White
    Write-Host ""
    Write-Host "All Node processes:" -ForegroundColor Yellow
    foreach ($proc in $allProcesses) {
        Write-Host "  PID: $($proc.ProcessId) - $($proc.CommandLine)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Quick fix - Stop ALL Node processes (WARNING: Stops frontend too):" -ForegroundColor Red
Write-Host "  Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force" -ForegroundColor Yellow

