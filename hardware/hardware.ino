#include <Adafruit_Fingerprint.h>
#include <SoftwareSerial.h>

// Pin definitions for UNO R3
#define RX_PIN 2 // Connect to TX of DY50
#define TX_PIN 3 // Connect to RX of DY50

SoftwareSerial fingerSerial(RX_PIN, TX_PIN);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&fingerSerial);

bool captureFingerToBuffer(uint8_t bufferId);

void setup() {
  Serial.begin(9600);
  while (!Serial)
    ;

  Serial.println("Initializing DY50 Fingerprint Sensor...");

  finger.begin(57600);
  delay(500);

  if (finger.verifyPassword()) {
    Serial.println("✅ Sensor found!");
  } else {
    Serial.println("❌ Sensor not found!");
    while (true) {
      delay(1);
    }
  }

  // Set security level to 1 (most lenient) for better tolerance of finger placement
  // Security levels: 1-5 (1 = most lenient/easy to match, 5 = strictest/hardest to match)
  // Lower value = more tolerant of finger placement variations
  if (finger.setSecurity(1) == FINGERPRINT_OK) {
    Serial.println("✅ Security level set to 1 (lenient matching enabled)");
  } else {
    Serial.println("⚠️ Warning: Could not set security level, using default");
  }

  Serial.println("\nCommands:");
  Serial.println("  enroll  - Register new fingerprint");
  Serial.println("  clear   - Clear fingerprint database");
  Serial.println("Device is now ready for scanning.");
  Serial.println("READY"); // Send ready signal for backend to detect
}

void loop() {
  static bool enrolling = false;
  static unsigned long lastHeartbeat = 0;
  static unsigned long lastLoopCheck = 0;

  // Send heartbeat every 10 seconds to verify communication
  if (millis() - lastHeartbeat > 10000) {
    Serial.println("HEARTBEAT: Scanner is active - Loop running");
    lastHeartbeat = millis();
  }

  // Log that loop is running every 30 seconds (for debugging)
  if (millis() - lastLoopCheck > 30000) {
    Serial.println("DEBUG: Detection loop is running, waiting for finger...");
    lastLoopCheck = millis();
  }

  // --- Handle serial commands ---
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();

    if (cmd == "enroll") {
      enrolling = true;
      Serial.println("Enter ID # (1-127):");

      while (!Serial.available())
        ;
      int id = Serial.parseInt();
      Serial.readStringUntil('\n'); // Consume the newline after the ID

      if (id < 1 || id > 127) {
        Serial.println("Invalid ID. Must be 1–127.");
      } else {
        enrollFingerprint(id);
      }

      enrolling = false;
    }

    else if (cmd == "clear") {
      Serial.println("Clearing fingerprint database...");
      if (finger.emptyDatabase() == FINGERPRINT_OK) {
        Serial.println("Database cleared.");
      } else {
        Serial.println("Failed to clear DB.");
      }
    }

    else if (cmd == "delete") {
      Serial.println("Enter ID # (1-127) to delete:");

      while (!Serial.available())
        ;
      int id = Serial.parseInt();
      Serial.readStringUntil('\n'); // Consume newline

      if (id < 1 || id > 127) {
        Serial.println("Invalid ID. Must be 1–127.");
      } else {
        deleteFingerprint(id);
      }
    }

    else if (cmd == "check") {
      // Check if fingerprint matches any existing enrolled ID
      enrolling = true; // Prevent normal scanning during check
      Serial.println("Place finger to check for existing match...");
      delay(500);
      
      if (!captureFingerToBuffer(1)) {
        Serial.println("CHECK_FAIL: Could not capture fingerprint image.");
        enrolling = false;
        return;
      }
      
      // Security level is set globally to 1 (most lenient)
      uint8_t p = finger.fingerFastSearch();
      if (p == FINGERPRINT_OK) {
        Serial.print("CHECK_MATCH: ");
        Serial.println(finger.fingerID);
      } else {
        Serial.println("CHECK_NO_MATCH: Fingerprint not found in database.");
      }
      enrolling = false; // Reset flag after check
    }

    else {
      Serial.println("Unknown command. Use 'enroll', 'clear', 'delete', or 'check'.");
    }
  }

  // --- Fingerprint matching ---
  if (!enrolling) {
    uint8_t p = finger.getImage();

    // Log sensor status for debugging (only log errors, not every NOFINGER)
    static uint8_t lastStatus = 255;
    if (p != FINGERPRINT_NOFINGER && p != lastStatus) {
      lastStatus = p;
      if (p != FINGERPRINT_OK) {
        Serial.print("DEBUG: Sensor status code: ");
        Serial.println(p);
      }
    }

    if (p == FINGERPRINT_OK) {
      // Finger detected! Send scanning message immediately
      Serial.println("Fingerprint scanning...");
      delay(100); // Small delay to ensure message is sent

      // Now process the fingerprint
      int id = getFingerprintID();
      if (id >= 0) {
        // Send detection message in format that backend can parse
        Serial.print("Detected ID: ");
        Serial.println(id);
      } else {
        Serial.println("Unregistered fingerprint.");
      }

      // Wait for finger removal before scanning again
      while (finger.getImage() != FINGERPRINT_NOFINGER) {
        delay(50);
      }
      delay(500);       // Small delay after finger removal
      lastStatus = 255; // Reset status tracking
    } else if (p == FINGERPRINT_NOFINGER) {
      // No finger on sensor - this is normal, continue loop
      lastStatus = p;
    } else {
      // Other error codes - log for debugging
      // Common codes:
      // 2 = packet receive error
      // 3 = no finger (FINGERPRINT_NOFINGER)
      // 5 = image fail
      // 6 = image messy
      if (p != 3) { // 3 is FINGERPRINT_NOFINGER which is normal
        Serial.print("DEBUG: getImage error code: ");
        Serial.print(p);
        Serial.print(" - ");
        switch (p) {
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
void enrollFingerprint(int id) {
  Serial.print("Enrolling ID #");
  Serial.println(id);

  // First, check if this fingerprint already exists
  Serial.println("Checking for existing match...");
  if (captureFingerToBuffer(1)) {
    uint8_t p = finger.fingerFastSearch(); // Uses global security level (1 = lenient)
    if (p == FINGERPRINT_OK) {
      Serial.print("⚠️ WARNING: This fingerprint already matches ID #");
      Serial.println(finger.fingerID);
      Serial.println("ENROLL_DUPLICATE");
      // Continue with enrollment anyway, but warn the user
    }
  }

  // Improved enrollment: Capture 3 images for better matching tolerance
  Serial.println("Place finger on scanner (Image 1 of 3)...");
  Serial.println("💡 TIP: Place finger naturally, don't press too hard");
  if (!captureFingerToBuffer(1)) {
    Serial.println("ENROLL_FAIL");
    return;
  }
  Serial.println("✓ First image captured.");

  Serial.println("Remove finger...");
  delay(2000);
  while (finger.getImage() != FINGERPRINT_NOFINGER)
    delay(100);

  Serial.println("Place finger again (Image 2 of 3)...");
  Serial.println("💡 TIP: Try a slightly different angle or position");
  if (!captureFingerToBuffer(2)) {
    Serial.println("ENROLL_FAIL");
    return;
  }
  Serial.println("✓ Second image captured.");

  // Try to create model with first two images
  int p = finger.createModel();
  if (p == FINGERPRINT_OK) {
    Serial.println("✓ Model created successfully from 2 images.");
  } else {
    // If model creation fails, try capturing a third image
    Serial.println("Model creation needs more data. Capturing third image...");
    Serial.println("Remove finger...");
    delay(2000);
    while (finger.getImage() != FINGERPRINT_NOFINGER)
      delay(100);
    
    Serial.println("Place finger one more time (Image 3 of 3)...");
    Serial.println("💡 TIP: Use a different finger position than before");
    if (!captureFingerToBuffer(1)) {
      Serial.print("Model failed, code: ");
      Serial.println(p);
      Serial.println("ENROLL_FAIL");
      return;
    }
    Serial.println("✓ Third image captured.");
    
    // Try creating model again with all images
    p = finger.createModel();
    if (p != FINGERPRINT_OK) {
      Serial.print("Model failed after 3 images, code: ");
      Serial.println(p);
      Serial.println("ENROLL_FAIL");
      Serial.println("💡 TIP: Make sure finger is clean and dry, try different positions");
      return;
    }
    Serial.println("✓ Model created successfully from 3 images.");
  }

  // Store model
  p = finger.storeModel(id);
  if (p == FINGERPRINT_OK) {
    Serial.println("✅ Enroll success!");
    Serial.println("ENROLL_OK");
    Serial.println("💡 TIP: When scanning, place finger naturally - the system is now more tolerant of placement variations");
  } else {
    Serial.print("❌ Store failed, code: ");
    Serial.println(p);
    Serial.println("ENROLL_FAIL");
  }
}

// === Match fingerprint and get ID ===
int getFingerprintID() {
  uint8_t p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK) {
    Serial.print("DEBUG: image2Tz failed with code: ");
    Serial.println(p);
    return -1;
  }

  // Security level is set globally in setup() to 1 (most lenient)
  // This makes matching more tolerant of finger placement variations
  p = finger.fingerFastSearch();
  if (p != FINGERPRINT_OK) {
    Serial.print("DEBUG: fingerFastSearch failed with code: ");
    Serial.println(p);
    return -1;
  }

  // Send in format that backend can parse: "Found ID #123"
  return finger.fingerID;
}

bool captureFingerToBuffer(uint8_t bufferId) {
  const uint8_t maxAttempts = 100;
  uint8_t attempts = 0;

  while (true) {
    uint8_t p = finger.getImage();
    if (p == FINGERPRINT_OK) {
      break;
    }

    if (p == FINGERPRINT_NOFINGER) {
      if (++attempts >= maxAttempts) {
        Serial.println("❌ Timeout waiting for finger.");
        return false;
      }
      delay(50);
      continue;
    }

    Serial.print("❌ getImage failed, code: ");
    Serial.println(p);
    return false;
  }

  uint8_t p = finger.image2Tz(bufferId);
  if (p != FINGERPRINT_OK) {
    Serial.print("❌ image2Tz failed for buffer ");
    Serial.print(bufferId);
    Serial.print(", code: ");
    Serial.println(p);
    return false;
  }

  return true;
}

void deleteFingerprint(int id) {
  Serial.print("Deleting fingerprint ID #");
  Serial.println(id);

  // Try multiple times if deletion fails (sometimes device needs retry)
  uint8_t p = FINGERPRINT_PACKETRECIEVEERR;
  int attempts = 0;
  const int maxAttempts = 3;
  
  while (attempts < maxAttempts && p != FINGERPRINT_OK) {
    if (attempts > 0) {
      Serial.print("Retry attempt ");
      Serial.print(attempts + 1);
      Serial.print(" of ");
      Serial.println(maxAttempts);
      delay(500); // Small delay between retries
    }
    
    p = finger.deleteModel(id);
    attempts++;
    
    if (p == FINGERPRINT_OK) {
      Serial.println("✅ Delete success!");
      Serial.println("DELETE_OK");
      return;
    }
  }

  // If all attempts failed, report error
  Serial.print("❌ Delete failed after ");
  Serial.print(maxAttempts);
  Serial.print(" attempts, final code: ");
  Serial.println(p);
  Serial.print("DELETE_FAIL:");
  Serial.println(p);
  
  // Provide more specific error messages based on common error codes
  // Common Adafruit fingerprint error codes:
  // 1 = FINGERPRINT_NOTFOUND
  // 2 = FINGERPRINT_BADLOCATION  
  // 3 = FINGERPRINT_FLASHERR
  if (p == 1) {
    Serial.println("ERROR: Fingerprint ID not found in database (may have been already deleted).");
  } else if (p == 2) {
    Serial.println("ERROR: Invalid location (ID out of range).");
  } else if (p == 3) {
    Serial.println("ERROR: Flash storage error (device memory issue).");
  } else {
    Serial.print("ERROR: Unknown error code ");
    Serial.println(p);
    Serial.println("💡 TIP: Try restarting the device or clearing the database if this persists");
  }
}