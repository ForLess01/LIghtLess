package api

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"

	"lightless/internal/auth"
	"lightless/internal/domain"
	"lightless/internal/mqtt"
	"lightless/internal/store"
	"lightless/internal/ws"
)

type Handlers struct {
	db         *store.Store
	mqttClient *mqtt.Client
	hub        *ws.Hub
	auth       *auth.Service
}

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginResp struct {
	Token string `json:"token"`
}

func (h *Handlers) Login(w http.ResponseWriter, r *http.Request) {
	var req loginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if err := h.auth.VerifyCredentials(req.Email, req.Password); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	token, err := h.auth.IssueToken("admin", 24*time.Hour)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "token error")
		return
	}
	writeJSON(w, http.StatusOK, loginResp{Token: token})
}

type commandReq struct {
	Action string `json:"action"`
	Value  any    `json:"value"`
}

type commandResp struct {
	CommandID string `json:"command_id"`
}

func (h *Handlers) SendCommand(w http.ResponseWriter, r *http.Request) {
	deviceID := r.PathValue("id")
	if deviceID == "" {
		writeError(w, http.StatusBadRequest, "missing device id")
		return
	}
	var req commandReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Action != "set_state" {
		writeError(w, http.StatusBadRequest, "unsupported action")
		return
	}

	cmd := domain.Command{
		ID:        uuid.NewString(),
		Action:    req.Action,
		Value:     req.Value,
		Timestamp: time.Now().Unix(),
	}

	payload, _ := json.Marshal(cmd)
	if _, err := h.db.InsertEvent(r.Context(), domain.Event{
		CommandID: cmd.ID,
		DeviceID:  deviceID,
		EventType: "command_sent",
		Payload:   string(payload),
	}); err != nil {
		log.Printf("insert event: %v", err)
	}

	if err := h.mqttClient.PublishCommand(deviceID, cmd); err != nil {
		writeError(w, http.StatusBadGateway, "mqtt publish failed")
		return
	}

	writeJSON(w, http.StatusAccepted, commandResp{CommandID: cmd.ID})
}

func (h *Handlers) ListEvents(w http.ResponseWriter, r *http.Request) {
	deviceID := r.PathValue("id")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	events, err := h.db.ListEvents(r.Context(), deviceID, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	if events == nil {
		events = []domain.Event{}
	}
	writeJSON(w, http.StatusOK, events)
}

func (h *Handlers) WebSocket(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		writeError(w, http.StatusUnauthorized, "missing token")
		return
	}
	if _, err := h.auth.ValidateToken(token); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid token")
		return
	}
	h.hub.HandleWS(w, r)
}

func (h *Handlers) Healthz(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
