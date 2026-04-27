package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"student-dao/backend/internal/api"
	"student-dao/backend/internal/config"
	"student-dao/backend/internal/db"
	"student-dao/backend/internal/indexer"
	"student-dao/backend/internal/ton"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	store, err := db.New(cfg.SQLitePath)
	if err != nil {
		log.Fatalf("db init error: %v", err)
	}
	defer store.Close()

	tonClient := ton.NewClient(cfg.TonAPIEndpoint, cfg.TonAPIKey)
	idx := indexer.NewService(cfg, store, tonClient, log.Default())

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		if err := idx.Run(ctx); err != nil {
			log.Printf("indexer stopped with error: %v", err)
		}
	}()

	server := &http.Server{
		Addr:              ":" + cfg.BackendPort,
		Handler:           api.NewServer(store).Routes(),
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("backend listening on %s", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("http server error: %v", err)
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	cancel()
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown error: %v", err)
	}

	log.Println("backend stopped")
}
