/**
 * LightLess - ESP32 Firmware
 * Etapa 4: WiFi + MQTT + acciones extendidas (set_state, blink, pattern)
 *
 * Comandos soportados via MQTT:
 * - set_state: {"action":"set_state","value":true/false,"id":"..."}
 * - blink:     {"action":"blink","count":3,"interval":500,"id":"..."}
 * - pattern:   {"action":"pattern","steps":[{"s":1,"d":200},{"s":0,"d":200},...],"id":"..."}
 *               s = state (1=on, 0=off), d = duration in ms
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include "config.h"

// --- WiFi + TLS ---
WiFiClientSecure espClientSecure;
PubSubClient mqtt(espClientSecure);

// --- LED State ---
bool ledOn = false;

// --- Blink State ---
bool blinking = false;
int blinkRemaining = 0;
unsigned long blinkInterval = 500;
unsigned long lastBlinkToggle = 0;

// --- Pattern State ---
#define MAX_PATTERN_STEPS 64
struct PatternStep {
  uint8_t state;     // 1 = ON, 0 = OFF
  unsigned long duration; // ms
};
PatternStep patternSteps[MAX_PATTERN_STEPS];
int patternTotal = 0;
int patternIndex = 0;
unsigned long patternStepStart = 0;
bool patternRunning = false;

// --- Timing ---
unsigned long bootTime = 0;
unsigned long lastTelemetry = 0;
unsigned long lastHealthRebroadcast = 0;
unsigned long lastReconnectAttempt = 0;
const unsigned long TELEMETRY_INTERVAL  = 30000;
const unsigned long HEALTH_REBROADCAST  = 60000;
const unsigned long RECONNECT_INTERVAL  = 5000;

// --- Forward declarations ---
void setupWiFi();
void setupMQTT();
void reconnectMQTT();
void onMQTTConnect();
void onMQTTMessage(char* topic, byte* payload, unsigned int length);
void handleCommand(const String& action, const String& commandId, const String& message);
void cmdSetState(bool value, const char* commandId);
void cmdBlink(int count, unsigned long interval, const char* commandId);
void cmdPattern(const String& message, const char* commandId);
void runPatternStep();
void publishState(const char* commandId);
void publishTelemetry();
void publishHealth(const char* status);

void setup() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.begin(115200);
  bootTime = millis();

  Serial.println("[LightLess] Iniciando...");
  Serial.print("[LightLess] Device ID: ");
  Serial.println(DEVICE_ID);

  setupWiFi();
  setupMQTT();
}

void loop() {
  if (!mqtt.connected()) {
    reconnectMQTT();
  }
  mqtt.loop();

  unsigned long now = millis();

  // Pattern execution (priority)
  if (patternRunning) {
    runPatternStep();
  }
  // Blink execution
  else if (blinking) {
    if (now - lastBlinkToggle >= blinkInterval) {
      lastBlinkToggle = now;
      ledOn = !ledOn;
      digitalWrite(LED_PIN, ledOn ? HIGH : LOW);

      if (!ledOn) {
        blinkRemaining--;
        if (blinkRemaining <= 0) {
          blinking = false;
          ledOn = false;
          digitalWrite(LED_PIN, LOW);
          Serial.println(F("[LightLess] Blink done"));
          publishState(nullptr);
        }
      }
    }
  }

  // Telemetry cada 30s
  if (now - lastTelemetry >= TELEMETRY_INTERVAL) {
    lastTelemetry = now;
    publishTelemetry();
  }

  // Health cada 60s
  if (now - lastHealthRebroadcast >= HEALTH_REBROADCAST) {
    lastHealthRebroadcast = now;
    publishHealth("online");
  }
}

void runPatternStep() {
  if (patternIndex >= patternTotal) {
    // Pattern complete — LED stays in whatever state the last step set
    patternRunning = false;
    Serial.print(F("[LightLess] Pattern done, LED="));
    Serial.println(ledOn ? "ON" : "OFF");
    publishState(nullptr);
    return;
  }

  unsigned long now = millis();
  unsigned long elapsed = now - patternStepStart;

  // d:0 means "stay in this state forever" — stop the pattern
  if (patternSteps[patternIndex].duration == 0) {
    patternRunning = false;
    ledOn = patternSteps[patternIndex].state;
    digitalWrite(LED_PIN, ledOn ? HIGH : LOW);
    Serial.print(F("[LightLess] Pattern done (hold), LED="));
    Serial.println(ledOn ? "ON" : "OFF");
    publishState(nullptr);
    return;
  }

  if (elapsed >= patternSteps[patternIndex].duration) {
    // Move to next step
    patternIndex++;
    if (patternIndex < patternTotal) {
      ledOn = patternSteps[patternIndex].state;
      digitalWrite(LED_PIN, ledOn ? HIGH : LOW);
      patternStepStart = now;
    } else {
      // Pattern complete — LED stays in whatever state the last step set
      patternRunning = false;
      Serial.print(F("[LightLess] Pattern done, LED="));
      Serial.println(ledOn ? "ON" : "OFF");
      publishState(nullptr);
    }
  }
}

// ========================
// WiFi
// ========================

void setupWiFi() {
  Serial.print("[WiFi] Conectando a ");
  Serial.print(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("[WiFi] Conectado. IP: ");
  Serial.println(WiFi.localIP());
}

// ========================
// MQTT
// ========================

void setupMQTT() {
  // Skip CA verification for prototyping (HiveMQ Cloud uses valid certs)
  // For production, load the Amazon Root CA certificate instead
  espClientSecure.setInsecure();

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMQTTMessage);
}

void reconnectMQTT() {
  unsigned long now = millis();
  if (now - lastReconnectAttempt < RECONNECT_INTERVAL) {
    return;
  }
  lastReconnectAttempt = now;

  Serial.print("[MQTT] Conectando a ");
  Serial.print(MQTT_HOST);
  Serial.print(":");
  Serial.print(MQTT_PORT);
  Serial.println("...");

  String willTopic = String("devices/") + DEVICE_ID + "/health";
  String willPayload = "{\"status\":\"offline\"}";

  if (mqtt.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD, willTopic.c_str(), 1, true, willPayload.c_str())) {
    Serial.println(" OK");
    onMQTTConnect();
  } else {
    Serial.print(" fallo, rc=");
    Serial.println(mqtt.state());
  }
}

void onMQTTConnect() {
  String commandTopic = String("devices/") + DEVICE_ID + "/command";
  mqtt.subscribe(commandTopic.c_str(), 1);
  Serial.print("[MQTT] Suscrito a ");
  Serial.println(commandTopic);

  publishHealth("online");
  publishState(nullptr);
}

// ========================
// MQTT Callback
// ========================

void onMQTTMessage(char* topic, byte* payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.print("[MQTT] Mensaje: ");
  Serial.println(message);

  // Extraer "action"
  String action = "";
  int actionIdx = message.indexOf("\"action\"");
  if (actionIdx >= 0) {
    int colonIdx = message.indexOf(":", actionIdx);
    int startQuote = message.indexOf("\"", colonIdx + 1);
    int endQuote = message.indexOf("\"", startQuote + 1);
    if (startQuote >= 0 && endQuote > startQuote) {
      action = message.substring(startQuote + 1, endQuote);
    }
  }

  // Extraer "id"
  String commandId = "";
  int idIdx = message.indexOf("\"id\"");
  if (idIdx >= 0) {
    int colonIdx = message.indexOf(":", idIdx);
    int startQuote = message.indexOf("\"", colonIdx + 1);
    int endQuote = message.indexOf("\"", startQuote + 1);
    if (startQuote >= 0 && endQuote > startQuote) {
      commandId = message.substring(startQuote + 1, endQuote);
    }
  }

  const char* cmdId = commandId.length() > 0 ? commandId.c_str() : nullptr;
  handleCommand(action, commandId, message);
}

void handleCommand(const String& action, const String& commandId, const String& message) {
  const char* cmdId = commandId.length() > 0 ? commandId.c_str() : nullptr;

  if (action == "set_state") {
    bool value = false;
    int valueIdx = message.indexOf("\"value\"");
    if (valueIdx >= 0) {
      int colonIdx = message.indexOf(":", valueIdx);
      int commaOrBrace = message.indexOf(",", colonIdx);
      if (commaOrBrace < 0) commaOrBrace = message.indexOf("}", colonIdx);
      String valueStr = message.substring(colonIdx + 1, commaOrBrace);
      valueStr.trim();
      value = (valueStr == "true" || valueStr == "1");
    }
    cmdSetState(value, cmdId);

  } else if (action == "blink") {
    int count = 3;
    int countIdx = message.indexOf("\"count\"");
    if (countIdx >= 0) {
      int colonIdx = message.indexOf(":", countIdx);
      int commaOrBrace = message.indexOf(",", colonIdx);
      if (commaOrBrace < 0) commaOrBrace = message.indexOf("}", colonIdx);
      String countStr = message.substring(colonIdx + 1, commaOrBrace);
      countStr.trim();
      count = countStr.toInt();
      if (count <= 0) count = 3;
    }

    unsigned long interval = 500;
    int intervalIdx = message.indexOf("\"interval\"");
    if (intervalIdx >= 0) {
      int colonIdx = message.indexOf(":", intervalIdx);
      int commaOrBrace = message.indexOf(",", colonIdx);
      if (commaOrBrace < 0) commaOrBrace = message.indexOf("}", colonIdx);
      String intervalStr = message.substring(colonIdx + 1, commaOrBrace);
      intervalStr.trim();
      unsigned long parsed = intervalStr.toInt();
      if (parsed > 0) interval = parsed;
    }

    cmdBlink(count, interval, cmdId);

  } else if (action == "pattern") {
    cmdPattern(message, cmdId);

  } else {
    Serial.print("[MQTT] Accion desconocida: ");
    Serial.println(action);
  }
}

// ========================
// Comandos
// ========================

void cmdSetState(bool value, const char* commandId) {
  blinking = false;
  patternRunning = false;
  ledOn = value;
  digitalWrite(LED_PIN, ledOn ? HIGH : LOW);
  Serial.print("[LightLess] LED ");
  Serial.println(ledOn ? "ON" : "OFF");

  delay(200);
  publishState(commandId);
}

void cmdBlink(int count, unsigned long interval, const char* commandId) {
  Serial.print("[LightLess] Blink: count=");
  Serial.print(count);
  Serial.print(" interval=");
  Serial.println(interval);

  patternRunning = false;
  blinking = true;
  blinkRemaining = count;
  blinkInterval = interval;
  lastBlinkToggle = millis();
  ledOn = true;
  digitalWrite(LED_PIN, HIGH);

  if (commandId) {
    delay(200);
    publishState(commandId);
  }
}

void cmdPattern(const String& message, const char* commandId) {
  // Parse JSON array of steps: [{"s":1,"d":200},{"s":0,"d":200},...]
  // "s" = state (1=ON, 0=OFF), "d" = duration in ms

  int stepsIdx = message.indexOf("\"steps\"");
  if (stepsIdx < 0) {
    Serial.println(F("[LightLess] Pattern: no steps found"));
    return;
  }

  // Find the array start
  int arrayStart = message.indexOf("[", stepsIdx);
  int arrayEnd = message.indexOf("]", arrayStart);
  if (arrayStart < 0 || arrayEnd < 0) {
    Serial.println(F("[LightLess] Pattern: invalid steps array"));
    return;
  }

  // Cancel any running animation
  blinking = false;
  patternTotal = 0;
  patternIndex = 0;
  // Clear pattern array to avoid stale data
  memset(patternSteps, 0, sizeof(patternSteps));

  // Parse each step
  int searchFrom = arrayStart + 1;
  while (searchFrom < arrayEnd && patternTotal < MAX_PATTERN_STEPS) {
    int objStart = message.indexOf("{", searchFrom);
    if (objStart < 0 || objStart > arrayEnd) break;
    int objEnd = message.indexOf("}", objStart);
    if (objEnd < 0) break;

    String stepStr = message.substring(objStart, objEnd + 1);

// Parse "s" (state) — accepts true/false and 1/0
    uint8_t state = 0;
    int sIdx = stepStr.indexOf("\"s\"");
    if (sIdx >= 0) {
      int colon = stepStr.indexOf(":", sIdx);
      int valEnd = stepStr.indexOf(",", colon + 1);
      if (valEnd < 0) valEnd = stepStr.indexOf("}", colon + 1);
      if (valEnd < 0) valEnd = stepStr.length();
      String sVal = stepStr.substring(colon + 1, valEnd);
      sVal.trim();
      state = (sVal == "1" || sVal.equalsIgnoreCase("true")) ? 1 : 0;
    }

    // Parse "d" (duration)
    unsigned long duration = 500;
    int dIdx = stepStr.indexOf("\"d\"");
    if (dIdx >= 0) {
      int colon = stepStr.indexOf(":", dIdx);
      int valEnd = stepStr.indexOf(",", colon + 1);
      if (valEnd < 0) valEnd = stepStr.indexOf("}", colon + 1);
      if (valEnd < 0) valEnd = stepStr.length();
      String dVal = stepStr.substring(colon + 1, valEnd);
      dVal.trim();
      duration = dVal.toInt();
      if (duration < 10 && duration != 0) duration = 500;
    }

patternSteps[patternTotal].state = state;
    patternSteps[patternTotal].duration = duration;
    patternTotal++;

    searchFrom = objEnd + 1;
  }

  if (patternTotal == 0) {
    Serial.println(F("[LightLess] Pattern: no valid steps"));
    return;
  }

  patternRunning = true;
  patternIndex = 0;
  patternStepStart = millis();
  ledOn = patternSteps[0].state;
  digitalWrite(LED_PIN, ledOn ? HIGH : LOW);

  Serial.print(F("[LightLess] Pattern: "));
  Serial.print(patternTotal);
  Serial.println(F(" steps"));

  if (commandId) {
    delay(200);
    publishState(commandId);
  }
}

// ========================
// Publicaciones MQTT
// ========================

void publishState(const char* commandId) {
  String topic = String("devices/") + DEVICE_ID + "/state";
  String payload = "{";
  if (commandId != nullptr && strlen(commandId) > 0) {
    payload += "\"command_id\":\"" + String(commandId) + "\",";
  }
  payload += "\"state\":" + String(ledOn ? "true" : "false") + ",";
  payload += "\"timestamp\":" + String(millis() / 1000);
  payload += "}";

  mqtt.publish(topic.c_str(), payload.c_str(), true);
  Serial.print("[MQTT] State: ");
  Serial.println(payload);
}

void publishTelemetry() {
  String topic = String("devices/") + DEVICE_ID + "/telemetry";
  unsigned long uptime = (millis() - bootTime) / 1000;
  int freeHeap = ESP.getFreeHeap();
  int rssi = WiFi.RSSI();

  String payload = "{";
  payload += "\"rssi\":" + String(rssi) + ",";
  payload += "\"uptime\":" + String(uptime) + ",";
  payload += "\"free_heap\":" + String(freeHeap) + ",";
  payload += "\"timestamp\":" + String(millis() / 1000);
  payload += "}";

  mqtt.publish(topic.c_str(), payload.c_str(), false);
  Serial.print("[MQTT] Telemetry: ");
  Serial.println(payload);
}

void publishHealth(const char* status) {
  String topic = String("devices/") + DEVICE_ID + "/health";
  String payload = "{\"status\":\"" + String(status) + "\",\"timestamp\":" + String(millis() / 1000) + "}";

  mqtt.publish(topic.c_str(), payload.c_str(), true);
  Serial.print("[MQTT] Health: ");
  Serial.println(payload);
}