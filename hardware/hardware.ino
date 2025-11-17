#include <Adafruit_Fingerprint.h>
#include <SoftwareSerial.h>

// Pin definitions for UNO R3
#define RX_PIN 2  // Connect to TX of DY50
#define TX_PIN 3  // Connect to RX of DY50

SoftwareSerial fingerSerial(RX_PIN, TX_PIN);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&fingerSerial);

void setup() {
  Serial.begin(9600);
  while (!Serial);

  Serial.println("Initializing DY50 Fingerprint Sensor...");

  finger.begin(57600);
  delay(500);

  if (finger.verifyPassword()) {
    Serial.println("✅ Sensor found!");
  } else {
    Serial.println("❌ Sensor not found!");
    while (true) { delay(1); }
  }

  Serial.println("\nCommands:");
  Serial.println("  enroll  - Register new fingerprint");
  Serial.println("  clear   - Clear fingerprint database");
  Serial.println("Device is now ready for scanning.");
}

void loop() {
  static bool enrolling = false;

  // --- Handle serial commands ---
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();

    if (cmd == "enroll") {
      enrolling = true;
      Serial.println("Enter ID # (1-127):");

      while (!Serial.available());
      int id = Serial.parseInt();

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

    else {
      Serial.println("Unknown command. Use 'enroll' or 'clear'.");
    }
  }

  // --- Fingerprint matching ---
  if (!enrolling) {
    uint8_t p = finger.getImage();
    if (p == FINGERPRINT_OK) {
      int id = getFingerprintID();
      if (id >= 0) {
        Serial.print("✅ Detected ID: ");
        Serial.println(id);
      } else {
        Serial.println("❌ Unregistered fingerprint.");
      }

      // Wait for finger removal
      while (finger.getImage() != FINGERPRINT_NOFINGER) delay(50);
      delay(500);
    }
  }
}

// === Enroll new fingerprint ===
void enrollFingerprint(int id) {
  int p = -1;
  Serial.print("Enrolling ID #");
  Serial.println(id);

  Serial.println("Place finger...");

  // Capture first image
  while ((p = finger.getImage()) != FINGERPRINT_OK) delay(100);
  finger.image2Tz(1);
  Serial.println("First image taken.");

  Serial.println("Remove finger...");
  delay(2000);
  while (finger.getImage() != FINGERPRINT_NOFINGER) delay(100);

  Serial.println("Place finger again...");

  // Capture second image
  while ((p = finger.getImage()) != FINGERPRINT_OK) delay(100);
  finger.image2Tz(2);
  Serial.println("Second image taken.");

  // Create model
  p = finger.createModel();
  if (p == FINGERPRINT_OK) {
    Serial.println("Model created.");
  } else {
    Serial.print("Model failed, code: ");
    Serial.println(p);
    return;
  }

  // Store model
  p = finger.storeModel(id);
  if (p == FINGERPRINT_OK) {
    Serial.println("✅ Enroll success!");
  } else {
    Serial.print("❌ Store failed, code: ");
    Serial.println(p);
  }
}

// === Match fingerprint and get ID ===
int getFingerprintID() {
  uint8_t p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK) return -1;

  p = finger.fingerFastSearch();
  if (p != FINGERPRINT_OK) return -1;

  Serial.print("Found ID #");
  Serial.print(finger.fingerID);
  Serial.print("  Confidence: ");
  Serial.println(finger.confidence);

  return finger.fingerID;
}
