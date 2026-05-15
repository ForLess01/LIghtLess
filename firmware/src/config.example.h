/**
 * LightLess - ESP32 Firmware
 * Configuración de WiFi y MQTT
 *
 * Copiá este archivo como config.h y completá con tus datos reales.
 * config.h está en .gitignore para no subir credenciales al repo.
 *
 * Para HiveMQ Cloud (producción):
 *   - MQTT_PORT = 8883
 *   - MQTT_HOST = tu-cluster.hivemqcloud.com
 *   - MQTT_USERNAME / MQTT_PASSWORD = tus credenciales
 *
 * Para Mosquitto local (desarrollo):
 *   - MQTT_PORT = 1883
 *   - MQTT_HOST = IP de tu Mac en la red local
 *   - MQTT_USERNAME / MQTT_PASSWORD = vacíos
 */
#ifndef CONFIG_H
#define CONFIG_H

// --- WiFi ---
#define WIFI_SSID      "TU_WIFI_AQUI"
#define WIFI_PASSWORD  "TU_PASSWORD_AQUI"

// --- MQTT (HiveMQ Cloud con TLS) ---
#define MQTT_HOST      "tu-cluster.s1.eu.hivemq.cloud"
#define MQTT_PORT      8883
#define MQTT_USERNAME  "tu-usuario"
#define MQTT_PASSWORD  "tu-password"
#define MQTT_CLIENT_ID "esp32-foco-sala"
#define DEVICE_ID      "foco-sala"

// --- LED ---
#define LED_PIN        2

#endif