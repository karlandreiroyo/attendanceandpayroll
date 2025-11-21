# Quick script to check if backend is already running and using COM8

Write-Host "Checking for running backend processes..." -ForegroundColor Cyan
Write-Host ""

$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "Found Node.js processes:" -ForegroundColor Yellow
    foreach ($proc in $nodeProcesses) {
        $commandLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)").CommandLine
        Write-Host "  PID: $($proc.Id)" -ForegroundColor White
        Write-Host "    Command: $commandLine" -ForegroundColor Gray
        
        if ($commandLine -like "*nest*" -or $commandLine -like "*backend*" -or $commandLine -like "*attendance*") {
            Write-Host "    ⚠️  This looks like your backend!" -ForegroundColor Red
            Write-Host "    💡 Stop this process to free COM8" -ForegroundColor Yellow
        }
        Write-Host ""
    }
    
    Write-Host "To stop a specific process:" -ForegroundColor Cyan
    Write-Host "  Stop-Process -Id <PID> -Force" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Example: Stop-Process -Id $($nodeProcesses[0].Id) -Force" -ForegroundColor Gray
} else {
    Write-Host "No Node.js processes found." -ForegroundColor Green
    Write-Host "The port might be used by:" -ForegroundColor Yellow
    Write-Host "  - Arduino IDE Serial Monitor" -ForegroundColor White
    Write-Host "  - Another serial port tool" -ForegroundColor White
    Write-Host "  - Windows system process" -ForegroundColor White
}

Write-Host ""
Write-Host "Checking COM8 status..." -ForegroundColor Cyan
try {
    $port = Get-CimInstance Win32_SerialPort | Where-Object { $_.DeviceID -eq "COM8" }
    if ($port) {
        Write-Host "  COM8 found: $($port.Name)" -ForegroundColor Green
        Write-Host "  Description: $($port.Description)" -ForegroundColor Gray
    } else {
        Write-Host "  COM8 not found in system" -ForegroundColor Red
    }
} catch {
    Write-Host "  Could not check COM8 status" -ForegroundColor Yellow
}

