package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"lightless/internal/ai"
	"lightless/internal/api"
	"lightless/internal/auth"
	"lightless/internal/config"
	"lightless/internal/mqtt"
	"lightless/internal/store"
	"lightless/internal/ws"
)

func main() {
	_ = godotenv.Load()
	cfg := config.Load()

	db, err := store.Open(cfg.DatabasePath)
	if err != nil {
		log.Fatalf("store open: %v", err)
	}
	defer db.Close()

	if err := db.Migrate(); err != nil {
		log.Fatalf("store migrate: %v", err)
	}

	hub := ws.NewHub()
	go hub.Run()

	mqttClient, err := mqtt.New(cfg.MQTTBrokerURL, cfg.MQTTUsername, cfg.MQTTPassword, db, hub)
	if err != nil {
		log.Fatalf("mqtt: %v", err)
	}
	defer mqttClient.Close()

	authSvc := auth.NewService(cfg.JWTSecret, cfg.AdminEmail, cfg.AdminPasswordHash)

	// AI client (optional — only if API key is set)
	var aiClient *ai.Client
	if cfg.AIAPIKey != "" {
		aiClient = ai.New(cfg.AIAPIKey, cfg.AIModel)
		log.Println("AI commands enabled")
	} else {
		log.Println("AI commands disabled (no AI_API_KEY)")
	}

	router := api.NewRouter(db, mqttClient, hub, authSvc, aiClient)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("HTTP server listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("http: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	log.Println("shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("shutdown error: %v", err)
	}
}
