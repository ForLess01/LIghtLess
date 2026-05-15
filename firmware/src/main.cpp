/**
 * LightLess - ESP32 Firmware
 * Etapa 2: WiFi + MQTT
 *
 * Se conecta a WiFi, se suscribe al topic de comando del dispositivo,
 * recibe set_state y controla el LED en GPIO 2.
 * Publica state, telemetry y health en los topics que el backend espera.
 */

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include "config.h"

// --- WiFi ---
WiFiClient espClient;
PubSubClient mqtt(espClient);

// --- State ---
bool ledOn = false;
unsigned long bootTime = 0;
unsigned long lastTelemetry = 0;
unsigned long lastHealthRebroadcast = 0;
unsigned long lastReconnectAttempt = 0;
const unsigned long TELEMETRY_INTERVAL = 30000;   // 30s
const unsigned long HEALTH_REBROADCAST  = 60000;   // 60s
const unsigned long RECONNECT_INTERVAL  = 5000;    // 5s entre intentos

// --- Forward declarations ---
void setupWiFi();
void setupMQTT();
void reconnectMQTT();
void onMQTTConnect();
void onMQTTMessage(char* topic, byte* payload, unsigned int length);
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
  // Reconexion automatica si se cae la conexion MQTT
  if (!mqtt.connected()) {
    reconnectMQTT();
  }
  mqtt.loop();

  unsigned long now = millis();

  // Telemetry cada 30s
  if (now - lastTelemetry >= TELEMETRY_INTERVAL) {
    lastTelemetry = now;
    publishTelemetry();
  }

  // Re-broadcast health cada 60s
  if (now - lastHealthRebroadcast >= HEALTH_REBROADCAST) {
    lastHealthRebroadcast = now;
    publishHealth("online");
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
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMQTTMessage);
}

void reconnectMQTT() {
  unsigned long now = millis();
  if (now - lastReconnectAttempt < RECONNECT_INTERVAL) {
    return;
  }
  lastReconnectAttempt = now;

  Serial.print("[MQTT] Conectando...");
  String willTopic = String("devices/") + DEVICE_ID + "/health";
  String willPayload = "{\"status\":\"offline\"}";

  if (mqtt.connect(MQTT_CLIENT_ID, nullptr, nullptr, willTopic.c_str(), 1, true, willPayload.c_str())) {
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

  Serial.print("[MQTT] Mensaje en ");
  Serial.print(topic);
  Serial.print(": ");
  Serial.println(message);

  // Parsear JSON de forma simple
  String action = "";
  String commandId = "";
  bool value = false;

  // Extraer "action"
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
  int idIdx = message.indexOf("\"id\"");
  if (idIdx >= 0) {
    int colonIdx = message.indexOf(":", idIdx);
    int startQuote = message.indexOf("\"", colonIdx + 1);
    int endQuote = message.indexOf("\"", startQuote + 1);
    if (startQuote >= 0 && endQuote > startQuote) {
      commandId = message.substring(startQuote + 1, endQuote);
    }
  }

  // Extraer "value"
  int valueIdx = message.indexOf("\"value\"");
  if (valueIdx >= 0) {
    int colonIdx = message.indexOf(":", valueIdx);
    int commaOrBrace = message.indexOf(",", colonIdx);
    if (commaOrBrace < 0) commaOrBrace = message.indexOf("}", colonIdx);
    String valueStr = message.substring(colonIdx + 1, commaOrBrace);
    valueStr.trim();
    value = (valueStr == "true" || valueStr == "1");
  }

  // Procesar comando
  if (action == "set_state") {
    ledOn = value;
    digitalWrite(LED_PIN, ledOn ? HIGH : LOW);
    Serial.print("[LightLess] LED ");
    Serial.println(ledOn ? "ON" : "OFF");

    delay(200);
    publishState(commandId.length() > 0 ? commandId.c_str() : nullptr);
  } else {
    Serial.print("[MQTT] Accion desconocida: ");
    Serial.println(action);
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