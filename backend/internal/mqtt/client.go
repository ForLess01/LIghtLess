package mqtt

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	mqttlib "github.com/eclipse/paho.mqtt.golang"

	"lightless/internal/domain"
	"lightless/internal/store"
	"lightless/internal/ws"
)

type Client struct {
	c   mqttlib.Client
	db  *store.Store
	hub *ws.Hub
}

func New(brokerURL, username, password string, db *store.Store, hub *ws.Hub) (*Client, error) {
	opts := mqttlib.NewClientOptions()
	opts.AddBroker(brokerURL)
	opts.SetClientID(fmt.Sprintf("lightless-backend-%d", time.Now().UnixNano()))
	if username != "" {
		opts.SetUsername(username)
		opts.SetPassword(password)
	}
	opts.SetAutoReconnect(true)
	opts.SetConnectRetry(true)
	opts.SetConnectRetryInterval(3 * time.Second)
	opts.SetOrderMatters(false)
	opts.SetCleanSession(true)

	c := &Client{db: db, hub: hub}

	opts.OnConnect = func(client mqttlib.Client) {
		log.Println("MQTT connected")
		c.subscribeAll(client)
	}
	opts.OnConnectionLost = func(_ mqttlib.Client, err error) {
		log.Printf("MQTT connection lost: %v", err)
	}

	c.c = mqttlib.NewClient(opts)
	token := c.c.Connect()
	if !token.WaitTimeout(5 * time.Second) {
		return nil, fmt.Errorf("mqtt connect timeout")
	}
	if err := token.Error(); err != nil {
		return nil, err
	}
	return c, nil
}

func (c *Client) subscribeAll(client mqttlib.Client) {
	subs := map[string]byte{
		"devices/+/state":     1,
		"devices/+/telemetry": 0,
		"devices/+/health":    1,
	}
	for topic, qos := range subs {
		t := client.Subscribe(topic, qos, c.onMessage)
		t.Wait()
		if err := t.Error(); err != nil {
			log.Printf("subscribe %s error: %v", topic, err)
			continue
		}
		log.Printf("subscribed to %s", topic)
	}
}

func (c *Client) onMessage(_ mqttlib.Client, msg mqttlib.Message) {
	topic := msg.Topic()
	parts := strings.Split(topic, "/")
	if len(parts) != 3 || parts[0] != "devices" {
		return
	}
	deviceID := parts[1]
	kind := parts[2]

	ctx := context.Background()
	payload := string(msg.Payload())

	switch kind {
	case "state":
		var s domain.StateMessage
		if err := json.Unmarshal(msg.Payload(), &s); err != nil {
			log.Printf("state unmarshal: %v", err)
			return
		}
		if _, err := c.db.InsertEvent(ctx, domain.Event{
			CommandID: s.CommandID,
			DeviceID:  deviceID,
			EventType: "state_changed",
			Payload:   payload,
		}); err != nil {
			log.Printf("insert state event: %v", err)
		}
		c.hub.Broadcast(domain.WSEvent{Type: "state_changed", DeviceID: deviceID, Data: s})
		if s.CommandID != "" {
			c.hub.Broadcast(domain.WSEvent{
				Type:     "command_ack",
				DeviceID: deviceID,
				Data:     map[string]any{"command_id": s.CommandID, "success": true},
			})
		}

	case "telemetry":
		var t domain.TelemetryMessage
		if err := json.Unmarshal(msg.Payload(), &t); err != nil {
			log.Printf("telemetry unmarshal: %v", err)
			return
		}
		c.hub.Broadcast(domain.WSEvent{Type: "telemetry", DeviceID: deviceID, Data: t})

	case "health":
		var h domain.HealthMessage
		if err := json.Unmarshal(msg.Payload(), &h); err != nil {
			log.Printf("health unmarshal: %v", err)
			return
		}
		evType := "device_offline"
		if h.Status == "online" {
			evType = "device_online"
		}
		if _, err := c.db.InsertEvent(ctx, domain.Event{
			DeviceID:  deviceID,
			EventType: evType,
			Payload:   payload,
		}); err != nil {
			log.Printf("insert health event: %v", err)
		}
		c.hub.Broadcast(domain.WSEvent{Type: evType, DeviceID: deviceID})
	}
}

func (c *Client) PublishCommand(deviceID string, cmd domain.Command) error {
	topic := fmt.Sprintf("devices/%s/command", deviceID)
	payload, err := json.Marshal(cmd)
	if err != nil {
		return err
	}
	token := c.c.Publish(topic, 1, false, payload)
	if !token.WaitTimeout(3 * time.Second) {
		return fmt.Errorf("publish timeout")
	}
	return token.Error()
}

func (c *Client) Close() {
	c.c.Disconnect(500)
}
