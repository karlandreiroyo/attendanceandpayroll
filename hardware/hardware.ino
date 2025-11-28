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

  // Set security level to 1 (most lenient) for better tolerance of finger
  // placement Security levels: 1-5 (1 = most lenient/easy to match, 5 =
  // strictest/hardest to match) Lower value = more tolerant of finger placement
  // variations
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
      // Phone-like: Scan multiple positions/angles for better matching
      enrolling = true; // Prevent normal scanning during check
      Serial.println(
          "📱 Checking fingerprint - scanning multiple positions...");
      Serial.println("Place finger on scanner (Position 1 of 3)...");
      delay(500);

      int foundId = -1;
      uint16_t bestConfidence = 0;

      // Try 3 different positions/angles
      for (int attempt = 1; attempt <= 3; attempt++) {
        if (attempt > 1) {
          Serial.println("\nRemove finger...");
          while (finger.getImage() != FINGERPRINT_NOFINGER)
            delay(100);
          delay(1000);
          Serial.print("Place finger again (Position ");
          Serial.print(attempt);
          Serial.println(" of 3)...");
          Serial.println("💡 TIP: Try a slightly different angle or position");
          delay(500);
        }

        if (!captureFingerToBuffer(1)) {
          if (attempt == 1) {
            Serial.println("CHECK_FAIL: Could not capture fingerprint image.");
            enrolling = false;
            return;
          }
          continue; // Skip this attempt if capture fails
        }

        // Security level is set globally to 1 (most lenient)
        uint8_t p = finger.fingerFastSearch();
        if (p == FINGERPRINT_OK) {
          uint16_t confidence = finger.confidence;
          Serial.print("✓ Match found on attempt ");
          Serial.print(attempt);
          Serial.print(" with confidence: ");
          Serial.println(confidence);

          // Keep the best match (highest confidence)
          if (confidence > bestConfidence) {
            foundId = finger.fingerID;
            bestConfidence = confidence;
          }

          // If confidence is very high, accept immediately
          if (confidence > 200) {
            Serial.print("CHECK_MATCH: ");
            Serial.println(foundId);
            enrolling = false;
            return;
          }
        } else {
          Serial.print("Attempt ");
          Serial.print(attempt);
          Serial.println(": No match found, trying different position...");
        }
      }

      if (foundId >= 0) {
        Serial.print("CHECK_MATCH: ");
        Serial.println(foundId);
        Serial.print("(Best confidence: ");
        Serial.print(bestConfidence);
        Serial.println(")");
      } else {
        Serial.println("CHECK_NO_MATCH: Fingerprint not found in database "
                       "after 3 attempts.");
        Serial.println(
            "💡 TIP: Make sure finger is clean and try different positions");
      }
      enrolling = false; // Reset flag after check
    }

    else {
      Serial.println(
          "Unknown command. Use 'enroll', 'clear', 'delete', or 'check'.");
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
      Serial.println("📱 Scanning multiple positions for better matching...");
      delay(100); // Small delay to ensure message is sent

      // Now process the fingerprint with phone-like multi-position scanning
      // This will try 3-4 different positions/angles automatically
      int id = getFingerprintID();
      if (id >= 0) {
        // Send detection message in format that backend can parse
        Serial.print("Detected ID: ");
        Serial.println(id);
      } else {
        // Provide helpful message for unregistered fingerprint
        Serial.println("Unregistered fingerprint.");
        Serial.println("💡 TIP: Try placing finger in different positions, "
                       "ensure finger is clean and dry");
        Serial.println("💡 TIP: The system scanned multiple positions but "
                       "couldn't find a match");
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
// Phone-like enrollment: Captures multiple finger positions to build complete
// fingerprint profile
void enrollFingerprint(int id) {
  // Track scan progress - MUST complete all 4 scans
  int scansCompleted = 0;
  const int REQUIRED_SCANS = 4;

  Serial.print("Enrolling ID #");
  Serial.println(id);
  Serial.println(
      "📱 Phone-like enrollment: We'll scan different parts of your finger");
  Serial.println(
      "   This creates a complete fingerprint profile for better matching!");

  // First, check if this fingerprint already exists
  Serial.println("\nStep 1: Checking for existing match...");
  if (captureFingerToBuffer(1)) {
    uint8_t p =
        finger.fingerFastSearch(); // Uses global security level (1 = lenient)
    if (p == FINGERPRINT_OK) {
      Serial.print("⚠️ WARNING: This fingerprint already matches ID #");
      Serial.println(finger.fingerID);
      Serial.println("ENROLL_DUPLICATE");
      // Continue with enrollment anyway, but warn the user
    }
  }

  // Phone-like enrollment: ALWAYS scan 4 different AREAS of the finger
  // This captures the tip, middle, sides to build a complete fingerprint
  // profile We'll ALWAYS scan all 4 areas regardless of early success

  Serial.println("\n📱 FINGERPRINT ENROLLMENT - Scanning Different Areas");
  Serial.println("   We will scan 4 DIFFERENT AREAS of your finger");
  Serial.println(
      "   This creates a complete fingerprint profile for reliable matching");
  Serial.println("   =========================================");
  Serial.println("   ⚠️ IMPORTANT: You MUST complete all 4 scans!");
  Serial.println(
      "   Do NOT remove your finger until you see the next scan instruction.");
  Serial.println("   =========================================");

  // IMPORTANT: The fingerprint library only has 2 buffers (buffer 1 and buffer
  // 2) We need to capture all 4 areas, but we'll use a strategy:
  // 1. Capture tip (buffer 1) and middle (buffer 2)
  // 2. Capture left side (buffer 1) and right side (buffer 2)
  // 3. Try creating model from left + right (most recent captures)
  // 4. If that fails, re-capture tip and try tip + right side

  // Area 1: Finger TIP (top part of finger)
  Serial.println("\n📸 SCAN 1 of 4: FINGER TIP AREA");
  Serial.println("   Place the TIP (top part) of your finger on the scanner");
  Serial.println("   💡 Focus on the top/upper part of your finger");
  Serial.println("   💡 Don't press too hard, just natural placement");
  if (!captureFingerToBuffer(1)) {
    Serial.println("ENROLL_FAIL");
    return;
  }
  scansCompleted = 1;
  Serial.println("   ✓ Finger tip area captured!");
  Serial.print("   📊 Progress: ");
  Serial.print(scansCompleted);
  Serial.print(" of ");
  Serial.print(REQUIRED_SCANS);
  Serial.println(" scans completed");
  Serial.println("   ⏳ Waiting for you to remove your finger...");
  delay(1500);

  Serial.println("\n   👋 Remove finger completely from scanner now...");
  Serial.println("   ⏳ Waiting for finger removal...");
  while (finger.getImage() != FINGERPRINT_NOFINGER)
    delay(100);
  delay(2000);
  Serial.println("   ✓ Finger removed. Ready for next scan.");

  // Area 2: Finger MIDDLE/CENTER
  Serial.println("\n📸 SCAN 2 of 4: FINGER MIDDLE AREA");
  Serial.println(
      "   Place the MIDDLE/CENTER part of your finger on the scanner");
  Serial.println("   💡 Focus on the center area of your finger pad");
  Serial.println("   💡 Make sure this is a DIFFERENT area than the tip");
  if (!captureFingerToBuffer(2)) {
    Serial.println("ENROLL_FAIL");
    return;
  }
  scansCompleted = 2;
  Serial.println("   ✓ Finger middle area captured!");
  Serial.print("   📊 Progress: ");
  Serial.print(scansCompleted);
  Serial.print(" of ");
  Serial.print(REQUIRED_SCANS);
  Serial.println(" scans completed");
  Serial.println("   ⏳ Waiting for you to remove your finger...");
  delay(1500);

  Serial.println("\n   👋 Remove finger completely from scanner now...");
  Serial.println("   ⏳ Waiting for finger removal...");
  while (finger.getImage() != FINGERPRINT_NOFINGER)
    delay(100);
  delay(2000);
  Serial.println("   ✓ Finger removed. Ready for next scan.");

  // Area 3: Finger LEFT SIDE - ALWAYS scan this (will overwrite buffer 1)
  Serial.println("\n📸 SCAN 3 of 4: FINGER LEFT SIDE AREA");
  Serial.println(
      "   Place your finger with the LEFT SIDE touching the scanner");
  Serial.println(
      "   💡 Rotate or tilt your finger so the LEFT EDGE is on the scanner");
  Serial.println("   💡 This captures the left side area of your fingerprint");
  Serial.println(
      "   💡 Make sure this is a DIFFERENT area from tip and middle");
  if (!captureFingerToBuffer(1)) {
    Serial.println("ENROLL_FAIL");
    return;
  }
  scansCompleted = 3;
  Serial.println("   ✓ Finger left side area captured!");
  Serial.print("   📊 Progress: ");
  Serial.print(scansCompleted);
  Serial.print(" of ");
  Serial.print(REQUIRED_SCANS);
  Serial.println(" scans completed");
  Serial.println("   ⏳ Waiting for you to remove your finger...");
  delay(1500);

  Serial.println("\n   👋 Remove finger completely from scanner now...");
  Serial.println("   ⏳ Waiting for finger removal...");
  while (finger.getImage() != FINGERPRINT_NOFINGER)
    delay(100);
  delay(2000);
  Serial.println("   ✓ Finger removed. Ready for FINAL scan.");

  // Area 4: Finger RIGHT SIDE - ALWAYS scan this (will overwrite buffer 2)
  Serial.println("\n📸 SCAN 4 of 4: FINGER RIGHT SIDE AREA");
  Serial.println("   🎯 THIS IS THE FINAL SCAN - Last one!");
  Serial.println(
      "   Place your finger with the RIGHT SIDE touching the scanner");
  Serial.println(
      "   💡 Rotate or tilt your finger so the RIGHT EDGE is on the scanner");
  Serial.println("   💡 This captures the right side area of your fingerprint");
  Serial.println(
      "   💡 Make sure this is a DIFFERENT area from previous scans");
  if (!captureFingerToBuffer(2)) {
    Serial.println("ENROLL_FAIL");
    return;
  }
  scansCompleted = 4;
  Serial.println("   ✓ Finger right side area captured!");
  Serial.print("   📊 Progress: ");
  Serial.print(scansCompleted);
  Serial.print(" of ");
  Serial.print(REQUIRED_SCANS);
  Serial.println(" scans completed");

  // Verify all 4 scans are complete before proceeding
  if (scansCompleted != REQUIRED_SCANS) {
    Serial.print("   ❌ ERROR: Only ");
    Serial.print(scansCompleted);
    Serial.print(" of ");
    Serial.print(REQUIRED_SCANS);
    Serial.println(" scans completed!");
    Serial.println("ENROLL_FAIL");
    return;
  }

  // All 4 areas have been scanned!
  Serial.println("\n   ✅ ALL 4 AREAS SCANNED SUCCESSFULLY!");
  Serial.println("   =========================================");
  Serial.println("   ✓ Scan 1: Finger tip area");
  Serial.println("   ✓ Scan 2: Finger middle area");
  Serial.println("   ✓ Scan 3: Finger left side area");
  Serial.println("   ✓ Scan 4: Finger right side area");
  Serial.println("   =========================================");
  Serial.println("\n   Now creating comprehensive fingerprint model...");
  Serial.println("   Combining features from all scanned areas...");
  delay(2000);

  int p = finger.createModel();
  bool modelCreated = (p == FINGERPRINT_OK);

  if (!modelCreated) {
    // If model creation fails with left + right, try tip + right side
    Serial.println("   Model creation from left + right failed. Trying tip + "
                   "right side...");
    Serial.println("\n   Remove finger completely...");
    while (finger.getImage() != FINGERPRINT_NOFINGER)
      delay(100);
    delay(1500);

    Serial.println("\n📸 Re-scanning: FINGER TIP AREA (for model combination)");
    Serial.println("   Place the TIP of your finger again");
    Serial.println("   💡 This will be combined with the right side area");
    if (captureFingerToBuffer(1)) {
      Serial.println("   ✓ Finger tip area re-captured!");
      p = finger.createModel();
      if (p == FINGERPRINT_OK) {
        modelCreated = true;
        Serial.println("   ✓ Model created from tip + right side combination!");
      }
    }
  }

  if (!modelCreated) {
    // Last attempt: try middle + left side
    Serial.println("   Trying middle + left side combination...");
    Serial.println("\n   Remove finger completely...");
    while (finger.getImage() != FINGERPRINT_NOFINGER)
      delay(100);
    delay(1500);

    Serial.println(
        "\n📸 Re-scanning: FINGER MIDDLE AREA (for model combination)");
    Serial.println("   Place the MIDDLE of your finger again");
    Serial.println("   💡 This will be combined with the left side area");
    if (captureFingerToBuffer(2)) {
      Serial.println("   ✓ Finger middle area re-captured!");
      p = finger.createModel();
      if (p == FINGERPRINT_OK) {
        modelCreated = true;
        Serial.println(
            "   ✓ Model created from middle + left side combination!");
      }
    }
  }

  if (!modelCreated) {
    Serial.print("   Model creation failed after scanning 4 areas, code: ");
    Serial.println(p);
    Serial.println("ENROLL_FAIL");
    Serial.println("   💡 TIP: Make sure finger is clean and dry");
    Serial.println(
        "   💡 TIP: Ensure you scanned 4 DIFFERENT areas of your finger");
    Serial.println("   💡 TIP: Try again with clearer finger placement");
    return;
  }

  Serial.println("\n   ✓ Fingerprint model successfully created!");
  Serial.println("   ✓ All 4 finger areas have been scanned and combined");
  Serial.println("   ✓ Your fingerprint profile is now complete!");

  // Final verification: Ensure all 4 scans were completed
  if (scansCompleted != REQUIRED_SCANS) {
    Serial.print("   ❌ CRITICAL ERROR: Enrollment cannot complete - only ");
    Serial.print(scansCompleted);
    Serial.print(" of ");
    Serial.print(REQUIRED_SCANS);
    Serial.println(" scans were completed!");
    Serial.println("ENROLL_FAIL");
    return;
  }

  // Store the comprehensive model
  Serial.println("\n   Storing complete fingerprint profile...");
  Serial.println("   ⚠️ DO NOT send ENROLL_OK until storage is confirmed!");
  Serial.print("   📊 Verification: scansCompleted=");
  Serial.print(scansCompleted);
  Serial.print(", REQUIRED_SCANS=");
  Serial.println(REQUIRED_SCANS);

  p = finger.storeModel(id);
  if (p == FINGERPRINT_OK) {
    // Final check before sending success - MUST have all 4 scans
    Serial.println("\n   ✅ Model stored successfully!");
    Serial.print("   📊 Final verification: scansCompleted=");
    Serial.print(scansCompleted);
    Serial.print(", REQUIRED_SCANS=");
    Serial.println(REQUIRED_SCANS);

    if (scansCompleted == REQUIRED_SCANS) {
      Serial.println("\n   =========================================");
      Serial.println("   ✅ ENROLLMENT FULLY COMPLETE!");
      Serial.println("   =========================================");
      Serial.println("   ✓ All 4 finger areas were scanned");
      Serial.println("   ✓ Model created and stored successfully");
      Serial.println(
          "   Your fingerprint has been scanned from multiple positions");
      Serial.println(
          "   This creates a complete profile for reliable matching");
      Serial.println("   =========================================");
      Serial.println("ENROLL_OK");
      Serial.println("   =========================================");
      Serial.println(
          "\n💡 TIP: When scanning for attendance, place finger naturally");
      Serial.println(
          "   The system now recognizes your fingerprint from various "
          "positions!");
    } else {
      Serial.println("\n   =========================================");
      Serial.print(
          "   ❌ CRITICAL ERROR: Cannot send ENROLL_OK - scans completed: ");
      Serial.print(scansCompleted);
      Serial.print(", required: ");
      Serial.println(REQUIRED_SCANS);
      Serial.println("   =========================================");
      Serial.println("ENROLL_FAIL");
    }
  } else {
    Serial.print("❌ Store failed, code: ");
    Serial.println(p);
    Serial.println("ENROLL_FAIL");
  }
}

// === Match fingerprint and get ID ===
// Phone-like matching: Try multiple scans from different positions/angles
int getFingerprintID() {
  int bestMatch = -1;
  uint16_t bestConfidence = 0;
  const int maxAttempts = 4; // Try up to 4 different positions/angles

  // Add small delay to let finger settle on sensor for better image quality
  delay(150);

  for (int attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      // Small delay between attempts to allow finger repositioning
      delay(200);
      Serial.print("Retrying scan (attempt ");
      Serial.print(attempt);
      Serial.println(" of 4)...");
      Serial.println("💡 Try adjusting finger position slightly");

      // Wait a moment for user to reposition
      delay(300);
    }

    // Get fresh image for this attempt
    uint8_t p = finger.getImage();
    if (p != FINGERPRINT_OK) {
      if (attempt == 1) {
        Serial.print("DEBUG: Could not get image, code: ");
        Serial.println(p);
        return -1;
      }
      // If we can't get an image on retry, continue to next attempt
      continue;
    }

    // Small delay to let finger settle
    delay(100);

    // Convert image to template
    p = finger.image2Tz(1);
    if (p != FINGERPRINT_OK) {
      if (attempt == 1) {
        Serial.print("DEBUG: image2Tz failed with code: ");
        Serial.println(p);
      }
      // Try next attempt if image conversion fails
      if (attempt < maxAttempts) {
        continue;
      }
      return -1;
    }

    // Security level is set globally in setup() to 1 (most lenient)
    // This makes matching more tolerant of finger placement variations
    p = finger.fingerFastSearch();
    if (p == FINGERPRINT_OK) {
      // Match found! Check confidence level
      uint16_t confidence = finger.confidence;
      Serial.print("DEBUG: Match found on attempt ");
      Serial.print(attempt);
      Serial.print(" with confidence: ");
      Serial.println(confidence);

      // Keep the best match (highest confidence)
      if (confidence > bestConfidence) {
        bestMatch = finger.fingerID;
        bestConfidence = confidence;
      }

      // If confidence is very high, accept immediately
      if (confidence > 200) {
        Serial.print("DEBUG: High confidence match, accepting immediately");
        return bestMatch;
      }

      // Continue trying for better match if confidence is low
      if (attempt < maxAttempts && confidence < 150) {
        continue;
      }

      // Accept match if confidence is reasonable
      if (bestMatch >= 0) {
        Serial.print("DEBUG: Best match found with confidence: ");
        Serial.println(bestConfidence);
        return bestMatch;
      }
    } else {
      if (attempt == 1) {
        Serial.print("DEBUG: fingerFastSearch failed with code: ");
        Serial.println(p);
      }
      // Continue to next attempt if search failed
      if (attempt < maxAttempts) {
        continue;
      }
    }
  }

  // Return best match found, or -1 if no match
  if (bestMatch >= 0) {
    Serial.print("DEBUG: Best match after ");
    Serial.print(maxAttempts);
    Serial.print(" attempts, confidence: ");
    Serial.println(bestConfidence);
    return bestMatch;
  }

  return -1;
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
    Serial.println("ERROR: Fingerprint ID not found in database (may have been "
                   "already deleted).");
  } else if (p == 2) {
    Serial.println("ERROR: Invalid location (ID out of range).");
  } else if (p == 3) {
    Serial.println("ERROR: Flash storage error (device memory issue).");
  } else {
    Serial.print("ERROR: Unknown error code ");
    Serial.println(p);
    Serial.println("💡 TIP: Try restarting the device or clearing the database "
                   "if this persists");
  }
}