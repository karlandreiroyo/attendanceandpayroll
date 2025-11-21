# How to Test if a Serial Port is Occupied

This guide shows multiple ways to check if a serial port (like COM8) is available or in use.

## Method 1: Using the Backend API Endpoints

### List All Available Ports
```bash
curl http://localhost:3000/fingerprint/ports
```

Or in your browser:
```
http://localhost:3000/fingerprint/ports
```

### Check a Specific Port (e.g., COM8)
```bash
curl http://localhost:3000/fingerprint/ports/COM8/check
```

Or in your browser:
```
http://localhost:3000/fingerprint/ports/COM8/check
```

**Response example:**
```json
{
  "available": false,
  "inUse": true,
  "error": "Port COM8 is in use by another application"
}
```

## Method 2: Using the Test Script

Navigate to the `backend` folder and run:

```bash
cd backend
node test-port.js COM8
```

Or test any other port:
```bash
node test-port.js COM3
node test-port.js COM5
```

## Method 3: Windows Command Line

### List all COM ports:
```cmd
mode
```

Or use PowerShell:
```powershell
Get-WmiObject Win32_SerialPort | Select-Object Name, DeviceID, Description
```

### Check if a specific port is in use:
```cmd
mode COM8
```

If the port is available, you'll see port settings. If it's in use, you'll get an error.

## Method 4: Windows Device Manager

1. Press `Win + X` and select **Device Manager**
2. Expand **Ports (COM & LPT)**
3. Look for your port (e.g., **COM8**)
4. If you see a yellow warning icon, the port has issues
5. Right-click the port → **Properties** → **Port Settings** tab

## Method 5: Using PowerShell (Advanced)

```powershell
# List all COM ports
Get-CimInstance Win32_SerialPort | Format-Table Name, DeviceID, Status

# Check if COM8 exists
Get-CimInstance Win32_SerialPort | Where-Object { $_.DeviceID -eq "COM8" }
```

## Method 6: Check What's Using the Port

### Using Resource Monitor:
1. Press `Win + R`, type `resmon`, press Enter
2. Go to **CPU** tab
3. In the search box, type `COM8`
4. See which processes are using it

### Using Handle (Sysinternals):
Download Handle.exe from Microsoft Sysinternals, then:
```cmd
handle.exe COM8
```

## Common Issues and Solutions

### "Access denied" Error
- **Cause**: Another application is using the port
- **Solution**: 
  - Close Arduino IDE Serial Monitor
  - Close other terminal/serial tools
  - Close other instances of your application
  - Restart your computer if needed

### Port Not Found
- **Cause**: Device not connected or wrong port name
- **Solution**:
  - Check Device Manager to see available ports
  - Verify the device is plugged in
  - Try a different USB port

### Port Busy (EBUSY)
- **Cause**: Port is locked by another process
- **Solution**:
  - Use Resource Monitor to find the process
  - End the process using the port
  - Restart the backend application

## Quick Test Commands

```bash
# Test COM8
curl http://localhost:3000/fingerprint/ports/COM8/check

# List all ports
curl http://localhost:3000/fingerprint/ports

# Check device status
curl http://localhost:3000/fingerprint/status
```

## Environment Variables

You can change the default port by setting an environment variable:

**Windows (PowerShell):**
```powershell
$env:FINGERPRINT_PORT="COM3"
```

**Windows (CMD):**
```cmd
set FINGERPRINT_PORT=COM3
```

**Linux/Mac:**
```bash
export FINGERPRINT_PORT=/dev/ttyUSB0
```

Then restart your backend application.

