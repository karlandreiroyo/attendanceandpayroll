# Find what's using a COM port
param([string]$PortName = "COM8")

Write-Host "Checking what's using $PortName..." -ForegroundColor Cyan
Write-Host ""

# Check for Arduino IDE
$arduinoProcesses = Get-Process -Name "arduino*" -ErrorAction SilentlyContinue
if ($arduinoProcesses) {
    Write-Host "WARNING: Arduino IDE is running!" -ForegroundColor Red
    foreach ($proc in $arduinoProcesses) {
        Write-Host "  - $($proc.ProcessName) (PID: $proc.Id)" -ForegroundColor Yellow
        Write-Host "    Close Arduino IDE completely, including Serial Monitor" -ForegroundColor Gray
    }
    Write-Host ""
}

# Check for other common serial port tools
$serialTools = @("putty", "teraterm", "hyperterminal", "realterm", "coolterm")
$foundTools = @()

foreach ($tool in $serialTools) {
    $procs = Get-Process -Name "*$tool*" -ErrorAction SilentlyContinue
    if ($procs) {
        $foundTools += $tool
        Write-Host "Found: $tool" -ForegroundColor Yellow
        foreach ($proc in $procs) {
            Write-Host "  PID: $($proc.Id) - $($proc.ProcessName)" -ForegroundColor Gray
        }
    }
}

if (-not $arduinoProcesses -and $foundTools.Count -eq 0) {
    Write-Host "No obvious serial port tools found." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "The port might be locked by:" -ForegroundColor Cyan
    Write-Host "  1. A background Windows service" -ForegroundColor White
    Write-Host "  2. A driver that hasn't released the port" -ForegroundColor White
    Write-Host "  3. A previous application that didn't close properly" -ForegroundColor White
    Write-Host ""
    Write-Host "Solutions:" -ForegroundColor Green
    Write-Host "  1. Unplug and replug the Arduino USB cable" -ForegroundColor White
    Write-Host "  2. Restart your computer" -ForegroundColor White
    Write-Host "  3. Use Device Manager to disable/enable the COM port" -ForegroundColor White
    Write-Host "     - Win+X -> Device Manager" -ForegroundColor Gray
    Write-Host "     - Ports (COM & LPT) -> Arduino Uno (COM8)" -ForegroundColor Gray
    Write-Host "     - Right-click -> Disable, then Enable" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Quick fixes to try:" -ForegroundColor Cyan
Write-Host "  1. Close Arduino IDE completely (check Task Manager)" -ForegroundColor White
Write-Host "  2. Unplug USB cable, wait 5 seconds, plug back in" -ForegroundColor White
Write-Host "  3. Restart computer" -ForegroundColor White

