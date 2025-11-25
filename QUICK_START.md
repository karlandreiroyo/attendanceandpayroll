# Quick Start Guide - Arduino Fingerprint System

## 🚀 Quick Setup (5 Steps)

### 1. Connect Hardware
- Connect DY50 Fingerprint Scanner to Arduino Uno:
  - VCC → 5V
  - GND → GND  
  - TX → Pin 2
  - RX → Pin 3
- Connect Arduino to computer via USB

### 2. Upload Arduino Code
```bash
# Open hardware/hardware.ino in Arduino IDE
# Select: Tools → Board → Arduino Uno
# Select: Tools → Port → COM[X] (your port)
# Click Upload
```

### 3. Find COM Port (Windows)
```powershell
# Run in PowerShell
Get-WmiObject Win32_PnPEntity | Where-Object { $_.Name -like "*COM*" } | Select-Object Name
```
Or check Device Manager → Ports (COM & LPT)

### 4. Configure Backend
Create `backend/.env` file:
```env
FINGERPRINT_PORT=COM8    # Replace with your COM port
FINGERPRINT_BAUD=9600
```

### 5. Start System
```bash
cd backend
npm install
npm run start:dev
```

You should see:
```
[FingerprintService] Serial port COM8 opened successfully
✅ Backend is running on http://localhost:3000
```

## 📝 Enroll Fingerprints

### Method 1: Via API
```bash
curl -X POST http://localhost:3000/fingerprint/enroll \
  -H "Content-Type: application/json" \
  -d '{"id": 1}'
```
Then follow Arduino Serial Monitor prompts.

### Method 2: Via Serial Monitor
1. Open Arduino IDE → Tools → Serial Monitor (9600 baud)
2. Type `enroll` and press Enter
3. Enter fingerprint ID (1-127)
4. Follow on-screen instructions

## 🔗 Link to Employee

Update employee in database:
```sql
UPDATE users 
SET finger_template_id = '1'  -- Your fingerprint ID
WHERE user_id = 'employee-id';
```

## ✅ Test

1. Place enrolled finger on scanner
2. Check backend logs - should see:
   ```
   [FingerprintService] Fingerprint detected: 1
   [FingerprintService] ✅ Time In recorded for John Doe
   ```
3. Attendance is automatically recorded!

## 🐛 Common Issues

| Problem | Solution |
|---------|----------|
| Can't find COM port | Check Device Manager, unplug/replug USB |
| Port already in use | Close Arduino Serial Monitor, restart backend |
| Fingerprint not recognized | Verify enrollment and `finger_template_id` |
| Attendance not recording | Check backend logs, verify employee exists |

## 📚 Full Documentation

See `HARDWARE_SETUP.md` for detailed instructions.


