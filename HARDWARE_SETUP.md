# Hardware Setup Guide - Arduino Fingerprint Scanner

This guide will help you set up and start your attendance system with the Arduino fingerprint scanner.

## Prerequisites

1. **Hardware Required:**
   - Arduino Uno R3 (or compatible)
   - DY50 Fingerprint Scanner Module
   - USB cable to connect Arduino to your computer
   - Jumper wires

2. **Software Required:**
   - Arduino IDE (download from https://www.arduino.cc/en/software)
   - Node.js and npm (already installed for your backend)

## Step 1: Hardware Connections

Connect the fingerprint scanner to your Arduino:

```
DY50 Fingerprint Scanner    Arduino Uno R3
─────────────────────────   ────────────────
VCC (Red)              →    5V
GND (Black)            →    GND
TX (Yellow/Green)      →    Digital Pin 2 (RX_PIN)
RX (White)             →    Digital Pin 3 (TX_PIN)
```

**Important:** Make sure the connections are secure and the power supply is stable.

## Step 2: Upload Arduino Code

1. Open Arduino IDE
2. Install the required library:
   - Go to **Sketch → Include Library → Manage Libraries**
   - Search for "Adafruit Fingerprint" and install it
3. Open the file: `hardware/hardware.ino`
4. Select your board:
   - Go to **Tools → Board → Arduino AVR Boards → Arduino Uno**
5. Select the correct port:
   - Go to **Tools → Port → COM[X]** (where X is your Arduino's COM port)
   - On Windows, you can find this in Device Manager under "Ports (COM & LPT)"
6. Click **Upload** (or press Ctrl+U)
7. Wait for "Done uploading" message

## Step 3: Find Your Arduino COM Port

### Windows:
1. Open **Device Manager** (Win + X → Device Manager)
2. Expand **Ports (COM & LPT)**
3. Look for **Arduino Uno** or **USB Serial Port**
4. Note the COM port number (e.g., COM3, COM8, COM12)

### Alternative Method (Windows PowerShell):
```powershell
Get-WmiObject Win32_PnPEntity | Where-Object { $_.Name -like "*COM*" } | Select-Object Name, DeviceID
```

## Step 4: Configure Backend Environment

1. Create or update `.env` file in the `backend` directory:

```env
# Fingerprint Scanner Configuration
FINGERPRINT_PORT=COM8          # Replace with your actual COM port
FINGERPRINT_BAUD=9600          # Baud rate (usually 9600)

# Your other environment variables (Supabase, etc.)
```

**Important:** Replace `COM8` with your actual COM port from Step 3.

## Step 5: Install Backend Dependencies

Make sure all dependencies are installed:

```bash
cd backend
npm install
```

## Step 6: Start the Backend Server

```bash
# Development mode (with auto-reload)
npm run start:dev

# Or production mode
npm run build
npm run start:prod
```

You should see logs like:
```
[FingerprintService] Attempting to open serial port COM8 @ 9600
[FingerprintService] Serial port COM8 opened successfully
```

If the Arduino is not connected, you'll see a warning but the app will continue running.

## Step 7: Enroll Fingerprints

Before employees can use the system, you need to enroll their fingerprints:

### Option A: Using the API

1. Make sure the backend is running
2. Use the enrollment endpoint:

```bash
# Enroll a fingerprint with ID 1
curl -X POST http://localhost:3000/fingerprint/enroll \
  -H "Content-Type: application/json" \
  -d '{"id": 1}'
```

Then follow the prompts in the Arduino Serial Monitor:
- Place finger on scanner
- Remove finger
- Place finger again
- Wait for "ENROLL_OK" message

### Option B: Using Arduino Serial Monitor

1. Open Arduino IDE
2. Go to **Tools → Serial Monitor** (or press Ctrl+Shift+M)
3. Set baud rate to **9600**
4. Type `enroll` and press Enter
5. When prompted, enter the fingerprint ID (1-127)
6. Follow the on-screen instructions

## Step 8: Link Fingerprints to Employees

After enrolling a fingerprint, you need to link it to an employee in your database:

1. Note the fingerprint ID you used during enrollment
2. Update the employee's `finger_template_id` in your Supabase `users` table:

```sql
UPDATE users 
SET finger_template_id = '1'  -- Replace with actual fingerprint ID
WHERE user_id = 'employee-user-id';  -- Replace with actual employee ID
```

Or use your admin panel to update employee records.

## Step 9: Test the System

1. Place a registered finger on the scanner
2. The Arduino will detect it and send the ID to the backend
3. The backend will automatically:
   - Find the employee by fingerprint ID
   - Record Time In (if first scan of the day)
   - Record Time Out (if Time In already exists)
4. Check the backend logs for confirmation:
   ```
   [FingerprintService] Fingerprint detected: 1
   [FingerprintService] Recording attendance for fingerprint ID: 1
   [FingerprintService] ✅ Time In recorded for John Doe (ID: 1)
   ```

## Troubleshooting

### Arduino Not Detected
- **Problem:** Backend can't connect to Arduino
- **Solution:**
  - Check COM port in Device Manager
  - Update `FINGERPRINT_PORT` in `.env`
  - Make sure no other program is using the COM port
  - Try unplugging and replugging the USB cable
  - Restart the backend server

### Fingerprint Not Recognized
- **Problem:** Scanner says "Unregistered fingerprint"
- **Solution:**
  - Make sure the fingerprint is enrolled
  - Check that `finger_template_id` matches the enrolled ID
  - Try re-enrolling the fingerprint

### Attendance Not Recording
- **Problem:** Fingerprint detected but attendance not recorded
- **Solution:**
  - Check backend logs for errors
  - Verify employee exists in database
  - Verify `finger_template_id` is set correctly
  - Check that employee status is "Active"

### Serial Port Already in Use
- **Problem:** Error: "Cannot open port"
- **Solution:**
  - Close Arduino IDE Serial Monitor
  - Close any other programs using the COM port
  - Restart the backend server

### Wrong Baud Rate
- **Problem:** Garbled messages or no communication
- **Solution:**
  - Check Arduino code uses `Serial.begin(9600)`
  - Verify `FINGERPRINT_BAUD=9600` in `.env`
  - Some scanners use 57600 - check your scanner's documentation

## Monitoring Fingerprint Events

You can monitor fingerprint events in real-time using Server-Sent Events (SSE):

```javascript
// In your frontend or using curl
const eventSource = new EventSource('http://localhost:3000/fingerprint/events');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Fingerprint event:', data);
  // data.type can be: 'detected', 'unregistered', 'attendance_recorded', etc.
};
```

## System Flow

1. **Employee places finger on scanner**
2. **Arduino detects fingerprint** → Sends ID via Serial
3. **Backend receives ID** → FingerprintService processes it
4. **Automatic attendance recording** → AttendanceService records Time In/Out
5. **Database updated** → Attendance record saved to Supabase
6. **Frontend can display** → Real-time updates via API

## Next Steps

- Set up the frontend to display real-time attendance
- Configure shift schedules for late detection
- Set up notifications for attendance events
- Customize the attendance rules (e.g., late threshold times)

## Support

If you encounter issues:
1. Check the backend logs for error messages
2. Verify all connections are secure
3. Test the Arduino with Serial Monitor first
4. Ensure all environment variables are set correctly


