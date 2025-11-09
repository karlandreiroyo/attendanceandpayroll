#include <WiFi.h> 

// Replace with your Wi-Fi network credentials
const char* ssid = "dignonononono";
const char* password = "one-9-intervention";

void setup() {
  // Start the Serial Monitor
  Serial.begin(115200);
  delay(1000);
  
  Serial.println();
  Serial.println("Connecting to WiFi...");
  
  // Connect to Wi-Fi
  WiFi.begin(ssid, password);

  // Wait until connected
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  // Print IP address
  Serial.println();
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Keep checking connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected!");
  } else {
    Serial.println("WiFi connected and stable!");
  }
  delay(5000); // Wait 5 seconds
}
