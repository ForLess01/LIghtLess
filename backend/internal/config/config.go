package config

import (
	"log"
	"os"
)

type Config struct {
	Port              string
	MQTTBrokerURL     string
	MQTTUsername      string
	MQTTPassword      string
	JWTSecret         string
	AdminEmail        string
	AdminPasswordHash string
	DatabasePath      string
	GeminiAPIKey      string
	GeminiModel      string
	AIAPIKey         string
	AIModel          string
}

func Load() *Config {
	return &Config{
		Port:              getEnv("PORT", "8080"),
		MQTTBrokerURL:     getEnv("MQTT_BROKER_URL", "tcp://localhost:1883"),
		MQTTUsername:      os.Getenv("MQTT_USERNAME"),
		MQTTPassword:      os.Getenv("MQTT_PASSWORD"),
		JWTSecret:         mustEnv("JWT_SECRET"),
		AdminEmail:        mustEnv("ADMIN_EMAIL"),
		AdminPasswordHash: mustEnv("ADMIN_PASSWORD_HASH"),
		DatabasePath:      getEnv("DATABASE_PATH", "./lightless.db"),
		GeminiAPIKey:      os.Getenv("GEMINI_API_KEY"),
		GeminiModel:       getEnv("GEMINI_MODEL", "gemini-2.0-flash"),
		AIAPIKey:          os.Getenv("AI_API_KEY"),
		AIModel:           getEnv("AI_MODEL", "moonshot-v1-8k"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("missing required env: %s", key)
	}
	return v
}