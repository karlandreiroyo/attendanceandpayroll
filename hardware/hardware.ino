#include <Adafruit_Fingerprint.h>
#include <SoftwareSerial.h>
#include <LiquidCrystal.h>

// Pin definitions for UNO R3
#define RX_PIN 2  // Connect to TX of DY50
#define TX_PIN 3  // Connect to RX of DY50

// LCD1602 pin definitions
#define LCD_RS 12
#define LCD_E 11
#define LCD_D4 5
#define LCD_D5 4
#define LCD_D6 8
#define LCD_D7 9

LiquidCrystal lcd(LCD_RS, LCD_E, LCD_D4, LCD_D5, LCD_D6, LCD_D7);

SoftwareSerial fingerSerial(RX_PIN, TX_PIN);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&fingerSerial);

void setup() {
  Serial.begin(9600);
  while (!Serial);

  lcd.begin(16, 2);
  lcd.clear();
  lcd.print("Fingerprint Init");
  Serial.println("Initializing DY50 Fingerprint Sensor...");

  finger.begin(57600);
  delay(500);

  if (finger.verifyPassword()) {
    Serial.println("✅ Sensor found!");
    lcd.setCursor(0, 1);
    lcd.print("Sensor found   ");
  } else {
    Serial.println("❌ Sensor not found!");
    lcd.setCursor(0, 1);
    lcd.print("Not detected   ");
    while (true) { delay(1); }
  }

  delay(1500);
  lcd.clear();
  lcd.print("Type 'enroll'");
  lcd.setCursor(0, 1);
  lcd.print("or 'clear' cmd");
  Serial.println("\nCommands:");
  Serial.println("  enroll  - Register new fingerprint");
  Serial.println("  clear   - Clear fingerprint database");
  Serial.println("Device is now ready for scanning.");
}

void loop() {
  static bool enrolling = false;

  // --- Command handling ---
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();

    if (cmd == "enroll") {
      enrolling = true;
      lcd.clear();
      lcd.print("Enroll mode     ");
      Serial.println("Enter ID # (1-127):");

      while (!Serial.available());
      int id = Serial.parseInt();

      if (id < 1 || id > 127) {
        Serial.println("Invalid ID. Must be 1–127.");
        lcd.clear();
        lcd.print("Invalid ID     ");
        delay(1500);
      } else {
        enrollFingerprint(id);
      }

      enrolling = false;
      lcd.clear();
      lcd.print("Ready to scan");
      delay(1000);
    }

    else if (cmd == "clear") {
      Serial.println("Clearing fingerprint database...");
      if (finger.emptyDatabase() == FINGERPRINT_OK) {
        Serial.println("Database cleared.");
        lcd.clear();
        lcd.print("DB cleared     ");
      } else {
        Serial.println("Failed to clear DB.");
        lcd.clear();
        lcd.print("DB clear fail  ");
      }
      delay(1500);
      lcd.clear();
      lcd.print("Ready to scan");
    }

    else {
      Serial.println("Unknown command. Use 'enroll' or 'clear'.");
      lcd.clear();
      lcd.print("Unknown cmd    ");
      delay(1500);
      lcd.clear();
      lcd.print("Ready to scan");
    }
  }

  // --- Matching mode ---
  if (!enrolling) {
    uint8_t p = finger.getImage();
    if (p == FINGERPRINT_OK) {
      int id = getFingerprintID();
      if (id >= 0) {
        Serial.print("✅ Detected ID: ");
        Serial.println(id);
        lcd.clear();
        lcd.print("Detected ID:");
        lcd.setCursor(0, 1);
        lcd.print(id);
      } else {
        Serial.println("❌ Unregistered fingerprint.");
        lcd.clear();
        lcd.print("Unregistered FP");
      }

      // Wait for finger to be removed
      while (finger.getImage() != FINGERPRINT_NOFINGER) delay(50);
      delay(1500);
      lcd.clear();
      lcd.print("Ready to scan");
    }
  }
}

// === Enroll a new fingerprint ===
void enrollFingerprint(int id) {
  int p = -1;
  Serial.print("Enrolling ID #"); Serial.println(id);
  lcd.clear();
  lcd.print("Place finger   ");

  // Capture first image
  while ((p = finger.getImage()) != FINGERPRINT_OK) delay(100);
  finger.image2Tz(1);
  Serial.println("First image taken.");
  lcd.clear(); lcd.print("Remove finger  ");
  delay(2000);
  while (finger.getImage() != FINGERPRINT_NOFINGER) delay(100);

  // Capture second image
  lcd.clear(); lcd.print("Place again    ");
  while ((p = finger.getImage()) != FINGERPRINT_OK) delay(100);
  finger.image2Tz(2);
  Serial.println("Second image taken.");

  // Create model
  p = finger.createModel();
  if (p == FINGERPRINT_OK) {
    Serial.println("Model created.");
  } else {
    Serial.print("Model failed, code: "); Serial.println(p);
    lcd.clear(); lcd.print("Model failed   ");
    delay(1500);
    return;
  }

  // Store model
  p = finger.storeModel(id);
  if (p == FINGERPRINT_OK) {
    Serial.println("✅ Enroll success!");
    lcd.clear(); lcd.print("Enroll success!");
  } else {
    Serial.print("❌ Store failed, code: "); Serial.println(p);
    lcd.clear(); lcd.print("Enroll failed  ");
  }
  delay(1500);
}

// === Match and get fingerprint ID ===
int getFingerprintID() {
  uint8_t p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK) return -1;

  p = finger.fingerFastSearch();
  if (p != FINGERPRINT_OK) return -1;

  Serial.print("Found ID #"); Serial.print(finger.fingerID);
  Serial.print(" Confidence: "); Serial.println(finger.confidence);
  return finger.fingerID;
}
