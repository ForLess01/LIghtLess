/**
 * LightLess - ESP32 Firmware
 * Configuración de WiFi y MQTT
 *
 * Copiá este archivo como config.h y completá con tus datos reales.
 * config.h está en .gitignore para no subir credenciales al repo.
 */
#ifndef CONFIG_H
#define CONFIG_H

// --- WiFi ---
#define WIFI_SSID      "TU_WIFI_AQUI"
#define WIFI_PASSWORD  "TU_PASSWORD_AQUI"

// --- MQTT ---
// IP de la Mac en la red local (no localhost, el ESP32 es otro dispositivo)
#define MQTT_HOST      "192.168.X.X"
#define MQTT_PORT      1883
#define MQTT_CLIENT_ID "esp32-foco-sala"
#define DEVICE_ID      "foco-sala"

// --- LED ---
#define LED_PIN        2

#endif