#include <Adafruit_Fingerprint.h>
#include <SoftwareSerial.h>

// Pin definitions for UNO R3
#define RX_PIN 2  // Connect to TX of DY50
#define TX_PIN 3  // Connect to RX of DY50

SoftwareSerial fingerSerial(RX_PIN, TX_PIN);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&fingerSerial);

void setup() {
  Serial.begin(9600);
  while (!Serial);  // For Leonardo/Micro/Zero
  Serial.println("\nDY50 Fingerprint Sensor Test");

  finger.begin(57600);
  if (finger.verifyPassword()) {
    Serial.println("Found fingerprint sensor!");
  } else {
    Serial.println("Did not find fingerprint sensor :(");
    while (1) { delay(1); }
  }
  Serial.println("Type 'enroll' to register a new fingerprint.");
  Serial.println("Device is always in detection mode by default.");
}

void loop() {
  static bool enrolling = false;
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd == "enroll") {
      enrolling = true;
      Serial.println("Enter ID # (1-127):");
      while (!Serial.available());
      int enrollID = Serial.parseInt();
      if (enrollID < 1 || enrollID > 127) {
        Serial.println("Invalid ID. Must be 1-127.");
      } else {
        enrollFingerprint(enrollID);
      }
      enrolling = false;
    } else {
      Serial.println("Unknown command. Type 'enroll'.");
    }
  }
  if (!enrolling) {
    // Wait for finger to be placed
    uint8_t p = finger.getImage();
    if (p == FINGERPRINT_OK) {
      // Try to recognize the finger up to 3 times while finger is present
      int id = -1;
      int attempts = 0;
      while (attempts < 3 && id < 0 && finger.getImage() == FINGERPRINT_OK) {
        id = getFingerprintID();
        attempts++;
        if (id < 0) delay(200);
      }
      if (id >= 0) {
        Serial.print("Detected Fingerprint ID: ");
        Serial.println(id);
      } else {
        Serial.println("Unregistered fingerprint detected.");
      }
      // Wait for finger to be removed
      while (finger.getImage() != FINGERPRINT_NOFINGER) { delay(50); }
      delay(500); // Small pause before next scan
    } else {
      delay(200);
    }
  }
}
// Enroll a fingerprint with the given ID
void enrollFingerprint(int id) {
  int p = -1;
  Serial.print("Enrolling ID #"); Serial.println(id);
  Serial.println("Place finger on sensor...");
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    if (p == FINGERPRINT_OK) {
      Serial.println("Image taken");
    } else if (p == FINGERPRINT_NOFINGER) {
      // waiting
    } else if (p == FINGERPRINT_PACKETRECIEVEERR) {
      Serial.println("Communication error");
    } else if (p == FINGERPRINT_IMAGEFAIL) {
      Serial.println("Imaging error");
    } else {
      Serial.println("Unknown error");
    }
    delay(100);
  }
  // Convert image to template
  p = finger.image2Tz(1);
  while (p != FINGERPRINT_OK) {
    Serial.println("Image conversion failed, please try again. Place finger on sensor...");
    // Wait for finger to be removed
    while (finger.getImage() != FINGERPRINT_NOFINGER) { delay(100); }
    delay(500);
    // Wait for finger to be placed again
    while ((p = finger.getImage()) != FINGERPRINT_OK) { delay(100); }
    Serial.println("Image taken");
    p = finger.image2Tz(1);
  }
  Serial.println("Remove finger");
  delay(2000);
  while (finger.getImage() != FINGERPRINT_NOFINGER) { delay(100); }
  Serial.println("Place same finger again...");
  p = -1;
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    if (p == FINGERPRINT_OK) {
      Serial.println("Image taken");
    } else if (p == FINGERPRINT_NOFINGER) {
      // waiting
    } else if (p == FINGERPRINT_PACKETRECIEVEERR) {
      Serial.println("Communication error");
    } else if (p == FINGERPRINT_IMAGEFAIL) {
      Serial.println("Imaging error");
    } else {
      Serial.println("Unknown error");
    }
    delay(100);
  }
  // Convert image to template
  p = finger.image2Tz(2);
  while (p != FINGERPRINT_OK) {
    Serial.println("Image conversion failed, please try again. Place same finger again...");
    // Wait for finger to be removed
    while (finger.getImage() != FINGERPRINT_NOFINGER) { delay(100); }
    delay(500);
    // Wait for finger to be placed again
    while ((p = finger.getImage()) != FINGERPRINT_OK) { delay(100); }
    Serial.println("Image taken");
    p = finger.image2Tz(2);
  }
  // Create model
  p = finger.createModel();
  if (p != FINGERPRINT_OK) {
    Serial.println("Model creation failed");
    return;
  }
  // Store model
  p = finger.storeModel(id);
  if (p == FINGERPRINT_OK) {
    Serial.println("Fingerprint enrolled successfully!");
  } else {
    Serial.println("Enrollment failed");
  }
}

int getFingerprintID() {
  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK) return -1;

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) return -1;

  p = finger.fingerSearch();
  if (p == FINGERPRINT_OK) {
    return finger.fingerID;
  } else {
    return -1;
  }
}