package ws

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/coder/websocket"

	"lightless/internal/domain"
)

type Hub struct {
	clients    map[*client]struct{}
	register   chan *client
	unregister chan *client
	broadcast  chan []byte
	mu         sync.RWMutex
}

type client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
	ctx  context.Context
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*client]struct{}),
		register:   make(chan *client),
		unregister: make(chan *client),
		broadcast:  make(chan []byte, 256),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case c := <-h.register:
			h.mu.Lock()
			h.clients[c] = struct{}{}
			n := len(h.clients)
			h.mu.Unlock()
			log.Printf("ws client connected (total: %d)", n)

		case c := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[c]; ok {
				delete(h.clients, c)
				close(c.send)
			}
			n := len(h.clients)
			h.mu.Unlock()
			log.Printf("ws client disconnected (total: %d)", n)

		case msg := <-h.broadcast:
			h.mu.RLock()
			for c := range h.clients {
				select {
				case c.send <- msg:
				default:
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) Broadcast(event domain.WSEvent) {
	b, err := json.Marshal(event)
	if err != nil {
		log.Printf("broadcast marshal: %v", err)
		return
	}
	select {
	case h.broadcast <- b:
	default:
		log.Println("broadcast channel full, dropping message")
	}
}

func (h *Hub) HandleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		InsecureSkipVerify: true,
	})
	if err != nil {
		log.Printf("ws accept: %v", err)
		return
	}

	ctx := r.Context()
	c := &client{
		hub:  h,
		conn: conn,
		send: make(chan []byte, 64),
		ctx:  ctx,
	}
	h.register <- c

	go c.writePump()
	c.readPump()
}

func (c *client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close(websocket.StatusNormalClosure, "")
	}()
	c.conn.SetReadLimit(4096)
	for {
		if _, _, err := c.conn.Read(c.ctx); err != nil {
			return
		}
	}
}

func (c *client) writePump() {
	ticker := time.NewTicker(25 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case msg, ok := <-c.send:
			if !ok {
				return
			}
			ctx, cancel := context.WithTimeout(c.ctx, 5*time.Second)
			err := c.conn.Write(ctx, websocket.MessageText, msg)
			cancel()
			if err != nil {
				return
			}
		case <-ticker.C:
			ctx, cancel := context.WithTimeout(c.ctx, 5*time.Second)
			err := c.conn.Ping(ctx)
			cancel()
			if err != nil {
				return
			}
		}
	}
}
