package api

import (
	"net/http"

	"lightless/internal/auth"
	"lightless/internal/mqtt"
	"lightless/internal/store"
	"lightless/internal/ws"
)

func NewRouter(db *store.Store, mqttClient *mqtt.Client, hub *ws.Hub, authSvc *auth.Service) http.Handler {
	h := &Handlers{
		db:         db,
		mqttClient: mqttClient,
		hub:        hub,
		auth:       authSvc,
	}

	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", h.Healthz)
	mux.HandleFunc("POST /api/auth/login", h.Login)

	mux.Handle("POST /api/devices/{id}/command", h.authMiddleware(http.HandlerFunc(h.SendCommand)))
	mux.Handle("GET /api/devices/{id}/events", h.authMiddleware(http.HandlerFunc(h.ListEvents)))

	mux.HandleFunc("GET /ws", h.WebSocket)

	return cors(logging(mux))
}
