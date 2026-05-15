#!/bin/sh
set -e

echo "[entrypoint] Starting Mosquitto..."
mosquitto -c /mosquitto/config/mosquitto.conf -d

echo "[entrypoint] Starting LightLess backend..."
exec /usr/local/bin/lightless