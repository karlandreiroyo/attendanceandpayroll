#include <Adafruit_Fingerprint.h>
#include <SoftwareSerial.h>

// Pin definitions for UNO R3
#define RX_PIN 2 // Connect to TX of DY50
#define TX_PIN 3 // Connect to RX of DY50

SoftwareSerial fingerSerial(RX_PIN, TX_PIN);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&fingerSerial);

void setup()
{
  Serial.begin(9600);
  while (!Serial)
    ;

  Serial.println("Initializing DY50 Fingerprint Sensor...");

  finger.begin(57600);
  delay(500);

  if (finger.verifyPassword())
  {
    Serial.println("✅ Sensor found!");
  }
  else
  {
    Serial.println("❌ Sensor not found!");
    while (true)
    {
      delay(1);
    }
  }

  Serial.println("\nCommands:");
  Serial.println("  enroll  - Register new fingerprint");
  Serial.println("  clear   - Clear fingerprint database");
  Serial.println("Device is now ready for scanning.");
  Serial.println("READY"); // Send ready signal for backend to detect
}

void loop()
{
  static bool enrolling = false;
  static unsigned long lastHeartbeat = 0;
  static unsigned long lastLoopCheck = 0;

  // Send heartbeat every 10 seconds to verify communication
  if (millis() - lastHeartbeat > 10000)
  {
    Serial.println("HEARTBEAT: Scanner is active - Loop running");
    lastHeartbeat = millis();
  }

  // Log that loop is running every 30 seconds (for debugging)
  if (millis() - lastLoopCheck > 30000)
  {
    Serial.println("DEBUG: Detection loop is running, waiting for finger...");
    lastLoopCheck = millis();
  }

  // --- Handle serial commands ---
  if (Serial.available())
  {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();

    if (cmd == "enroll")
    {
      enrolling = true;
      Serial.println("Enter ID # (1-127):");

      while (!Serial.available())
        ;
      int id = Serial.parseInt();
      Serial.readStringUntil('\n'); // Consume the newline after the ID

      if (id < 1 || id > 127)
      {
        Serial.println("Invalid ID. Must be 1–127.");
      }
      else
      {
        enrollFingerprint(id);
      }

      enrolling = false;
    }

    else if (cmd == "clear")
    {
      Serial.println("Clearing fingerprint database...");
      if (finger.emptyDatabase() == FINGERPRINT_OK)
      {
        Serial.println("Database cleared.");
      }
      else
      {
        Serial.println("Failed to clear DB.");
      }
    }

    else
    {
      Serial.println("Unknown command. Use 'enroll' or 'clear'.");
    }
  }

  // --- Fingerprint matching ---
  if (!enrolling)
  {
    uint8_t p = finger.getImage();

    // Log sensor status for debugging (only log errors, not every NOFINGER)
    static uint8_t lastStatus = 255;
    if (p != FINGERPRINT_NOFINGER && p != lastStatus)
    {
      lastStatus = p;
      if (p != FINGERPRINT_OK)
      {
        Serial.print("DEBUG: Sensor status code: ");
        Serial.println(p);
      }
    }

    if (p == FINGERPRINT_OK)
    {
      // Finger detected! Send scanning message immediately
      Serial.println("Fingerprint scanning...");
      delay(100); // Small delay to ensure message is sent

      // Now process the fingerprint
      int id = getFingerprintID();
      if (id >= 0)
      {
        // Send detection message in format that backend can parse
        Serial.print("Detected ID: ");
        Serial.println(id);
      }
      else
      {
        Serial.println("Unregistered fingerprint.");
      }

      // Wait for finger removal before scanning again
      while (finger.getImage() != FINGERPRINT_NOFINGER)
      {
        delay(50);
      }
      delay(500);       // Small delay after finger removal
      lastStatus = 255; // Reset status tracking
    }
    else if (p == FINGERPRINT_NOFINGER)
    {
      // No finger on sensor - this is normal, continue loop
      lastStatus = p;
    }
    else
    {
      // Other error codes - log for debugging
      // Common codes:
      // 2 = packet receive error
      // 3 = no finger (FINGERPRINT_NOFINGER)
      // 5 = image fail
      // 6 = image messy
      if (p != 3)
      { // 3 is FINGERPRINT_NOFINGER which is normal
        Serial.print("DEBUG: getImage error code: ");
        Serial.print(p);
        Serial.print(" - ");
        switch (p)
        {
        case 2:
          Serial.println("Packet receive error");
          break;
        case 5:
          Serial.println("Image fail");
          break;
        case 6:
          Serial.println("Image messy");
          break;
        default:
          Serial.println("Unknown error");
          break;
        }
      }
      lastStatus = p;
    }
  }
}

// === Enroll new fingerprint ===
void enrollFingerprint(int id)
{
  int p = -1;
  Serial.print("Enrolling ID #");
  Serial.println(id);

  Serial.println("Place finger...");

  // Capture first image
  while ((p = finger.getImage()) != FINGERPRINT_OK)
    delay(100);
  finger.image2Tz(1);
  Serial.println("First image taken.");

  Serial.println("Remove finger...");
  delay(2000);
  while (finger.getImage() != FINGERPRINT_NOFINGER)
    delay(100);

  Serial.println("Place finger again...");

  // Capture second image
  while ((p = finger.getImage()) != FINGERPRINT_OK)
    delay(100);
  finger.image2Tz(2);
  Serial.println("Second image taken.");

  // Create model
  p = finger.createModel();
  if (p == FINGERPRINT_OK)
  {
    Serial.println("Model created.");
  }
  else
  {
    Serial.print("Model failed, code: ");
    Serial.println(p);
    return;
  }

  // Store model
  p = finger.storeModel(id);
  if (p == FINGERPRINT_OK)
  {
    Serial.println("✅ Enroll success!");
    Serial.println("ENROLL_OK");
  }
  else
  {
    Serial.print("❌ Store failed, code: ");
    Serial.println(p);
    Serial.println("ENROLL_FAIL");
  }
}

// === Match fingerprint and get ID ===
int getFingerprintID()
{
  uint8_t p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK)
  {
    Serial.print("DEBUG: image2Tz failed with code: ");
    Serial.println(p);
    return -1;
  }

  p = finger.fingerFastSearch();
  if (p != FINGERPRINT_OK)
  {
    Serial.print("DEBUG: fingerFastSearch failed with code: ");
    Serial.println(p);
    return -1;
  }

  // Send in format that backend can parse: "Found ID #123"
  Serial.print("Found ID #");
  Serial.println(finger.fingerID);
  // Confidence is logged separately for debugging
  Serial.print("Confidence: ");
  Serial.println(finger.confidence);

  return finger.fingerID;
}