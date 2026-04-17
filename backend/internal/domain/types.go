package domain

import "time"

type Command struct {
	ID        string `json:"id"`
	Action    string `json:"action"`
	Value     any    `json:"value"`
	Timestamp int64  `json:"timestamp"`
}

type StateMessage struct {
	CommandID string `json:"command_id,omitempty"`
	State     bool   `json:"state"`
	Timestamp int64  `json:"timestamp"`
}

type TelemetryMessage struct {
	RSSI      int   `json:"rssi"`
	Uptime    int64 `json:"uptime"`
	FreeHeap  int   `json:"free_heap"`
	Timestamp int64 `json:"timestamp"`
}

type HealthMessage struct {
	Status    string `json:"status"`
	Timestamp int64  `json:"timestamp"`
}

type Event struct {
	ID        int64     `json:"id"`
	CommandID string    `json:"command_id,omitempty"`
	DeviceID  string    `json:"device_id"`
	EventType string    `json:"event_type"`
	Payload   string    `json:"payload"`
	CreatedAt time.Time `json:"created_at"`
}

type WSEvent struct {
	Type     string `json:"type"`
	DeviceID string `json:"device_id,omitempty"`
	Data     any    `json:"data,omitempty"`
}
