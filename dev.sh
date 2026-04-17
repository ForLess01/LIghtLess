#!/usr/bin/env bash
set -euo pipefail

# ── LightLess Dev Startup ──────────────────────────────────────
# Levanta TODO el stack de desarrollo:
#   1. Mosquitto (Docker)
#   2. Backend Go (:8080)
#   3. Simulador Node.js (foco-sala)
#   4. Frontend Next.js (:3000)
#
# Uso:
#   ./dev.sh          → levanta todo
#   ./dev.sh stop     → mata todo
#   ./dev.sh status   → muestra qué está corriendo
# ────────────────────────────────────────────────────────────────

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT_DIR/.dev-logs"
PID_DIR="$ROOT_DIR/.dev-pids"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
AMBER='\033[0;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
RESET='\033[0m'

log()  { echo -e "${CYAN}▸${RESET} $1"; }
ok()   { echo -e "${GREEN}✓${RESET} $1"; }
warn() { echo -e "${AMBER}⚠${RESET} $1"; }
err()  { echo -e "${RED}✗${RESET} $1"; }

# ── Resolve binaries (macOS PATH quirks) ──
find_bin() {
  local name="$1"
  command -v "$name" 2>/dev/null \
    || ([ -x "/opt/homebrew/bin/$name" ] && echo "/opt/homebrew/bin/$name") \
    || ([ -x "/usr/local/bin/$name" ] && echo "/usr/local/bin/$name") \
    || ([ -x "/usr/local/go/bin/$name" ] && echo "/usr/local/go/bin/$name") \
    || echo ""
}

NODE_BIN=$(find_bin node)
NPM_BIN=$(find_bin npm)
GO_BIN=$(find_bin go)
DOCKER_BIN=$(find_bin docker)

# ── Stop ──
stop_all() {
  log "Stopping all services..."

  if [ -d "$PID_DIR" ]; then
    for pidfile in "$PID_DIR"/*.pid; do
      [ -f "$pidfile" ] || continue
      local pid
      pid=$(cat "$pidfile")
      local name
      name=$(basename "$pidfile" .pid)
      if kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null && ok "Stopped $name (PID $pid)" || warn "Could not stop $name"
      fi
      rm -f "$pidfile"
    done
  fi

  # Stop docker compose
  if [ -n "$DOCKER_BIN" ]; then
    $DOCKER_BIN compose -f "$ROOT_DIR/docker-compose.yml" down 2>/dev/null && ok "Mosquitto stopped" || true
  fi

  ok "All services stopped"
}

# ── Status ──
show_status() {
  echo ""
  echo -e "${CYAN}━━━ LightLess Service Status ━━━${RESET}"
  echo ""

  # Mosquitto
  if [ -n "$DOCKER_BIN" ] && $DOCKER_BIN ps --format '{{.Names}}' 2>/dev/null | grep -q lightless-mosquitto; then
    ok "Mosquitto        → running (Docker)"
  else
    err "Mosquitto        → stopped"
  fi

  # Backend
  if [ -f "$PID_DIR/backend.pid" ] && kill -0 "$(cat "$PID_DIR/backend.pid")" 2>/dev/null; then
    ok "Backend (Go)     → running on :8080"
  else
    err "Backend (Go)     → stopped"
  fi

  # Simulator
  if [ -f "$PID_DIR/simulator.pid" ] && kill -0 "$(cat "$PID_DIR/simulator.pid")" 2>/dev/null; then
    ok "Simulator (Node) → running"
  else
    err "Simulator (Node) → stopped"
  fi

  # Frontend
  if [ -f "$PID_DIR/frontend.pid" ] && kill -0 "$(cat "$PID_DIR/frontend.pid")" 2>/dev/null; then
    ok "Frontend (Next)  → running on :3000"
  else
    err "Frontend (Next)  → stopped"
  fi

  echo ""
}

# ── Start ──
start_all() {
  mkdir -p "$LOG_DIR" "$PID_DIR"

  echo ""
  echo -e "${AMBER}⚡ LightLess Dev Stack${RESET}"
  echo -e "${DIM}────────────────────────────────${RESET}"
  echo ""

  # 1. Mosquitto (Docker)
  log "Starting Mosquitto..."
  if [ -z "$DOCKER_BIN" ]; then
    warn "Docker not found — skipping Mosquitto. Install Docker Desktop or run Mosquitto manually."
  else
    $DOCKER_BIN compose -f "$ROOT_DIR/docker-compose.yml" up -d 2>"$LOG_DIR/mosquitto.log"
    ok "Mosquitto → :1883"
  fi

  # Wait for MQTT broker
  sleep 1

  # 2. Backend (Go)
  log "Starting Backend..."
  if [ -z "$GO_BIN" ]; then
    err "Go not found! Install Go from https://go.dev"
    exit 1
  fi
  (cd "$ROOT_DIR/backend" && $GO_BIN run ./cmd/server > "$LOG_DIR/backend.log" 2>&1) &
  echo $! > "$PID_DIR/backend.pid"
  sleep 2

  if kill -0 "$(cat "$PID_DIR/backend.pid")" 2>/dev/null; then
    ok "Backend  → :8080"
  else
    err "Backend failed to start! Check $LOG_DIR/backend.log"
    cat "$LOG_DIR/backend.log"
    exit 1
  fi

  # 3. Simulator (Node)
  log "Starting Simulator..."
  if [ -z "$NODE_BIN" ]; then
    warn "Node not found — skipping simulator."
  else
    (cd "$ROOT_DIR/simulator" && $NODE_BIN index.js > "$LOG_DIR/simulator.log" 2>&1) &
    echo $! > "$PID_DIR/simulator.pid"
    sleep 1
    if kill -0 "$(cat "$PID_DIR/simulator.pid")" 2>/dev/null; then
      ok "Simulator → device: foco-sala"
    else
      warn "Simulator failed. Check $LOG_DIR/simulator.log"
    fi
  fi

  # 4. Frontend (Next.js)
  log "Starting Frontend..."
  if [ -z "$NPM_BIN" ]; then
    err "npm not found! Install Node.js from https://nodejs.org"
    exit 1
  fi
  (cd "$ROOT_DIR/frontend" && $NPM_BIN run dev > "$LOG_DIR/frontend.log" 2>&1) &
  echo $! > "$PID_DIR/frontend.pid"
  sleep 3

  if kill -0 "$(cat "$PID_DIR/frontend.pid")" 2>/dev/null; then
    ok "Frontend → :3000"
  else
    err "Frontend failed to start! Check $LOG_DIR/frontend.log"
    cat "$LOG_DIR/frontend.log"
    exit 1
  fi

  # Done
  echo ""
  echo -e "${DIM}────────────────────────────────${RESET}"
  echo -e "${GREEN}✓ All services running!${RESET}"
  echo ""
  echo -e "  ${CYAN}Frontend${RESET}  → http://localhost:3000"
  echo -e "  ${CYAN}Backend${RESET}   → http://localhost:8080"
  echo -e "  ${CYAN}MQTT${RESET}      → tcp://localhost:1883"
  echo ""
  echo -e "  ${DIM}Login: admin@lightless.local / admin${RESET}"
  echo -e "  ${DIM}Logs:  .dev-logs/${RESET}"
  echo -e "  ${DIM}Stop:  ./dev.sh stop${RESET}"
  echo ""
}

# ── Main ──
case "${1:-start}" in
  stop)   stop_all ;;
  status) show_status ;;
  start|"") start_all ;;
  *)
    echo "Usage: ./dev.sh [start|stop|status]"
    exit 1
    ;;
esac
