package config

import (
	"errors"
	"os"
	"strconv"
)

type Config struct {
	ContractAddress string
	TonAPIEndpoint  string
	TonAPIKey       string
	SQLitePath      string
	PollIntervalSec int
	BackendPort     string
}

func Load() (Config, error) {
	cfg := Config{
		ContractAddress: os.Getenv("CONTRACT_ADDRESS"),
		TonAPIEndpoint:  envOr("TON_API_ENDPOINT", "https://testnet.toncenter.com/api/v2"),
		TonAPIKey:       os.Getenv("TON_API_KEY"),
		SQLitePath:      envOr("SQLITE_PATH", "/data/indexer.db"),
		PollIntervalSec: envOrInt("POLL_INTERVAL_SEC", 12),
		BackendPort:     envOr("BACKEND_PORT", "8080"),
	}

	if cfg.ContractAddress == "" {
		return Config{}, errors.New("CONTRACT_ADDRESS is required")
	}

	return cfg, nil
}

func envOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func envOrInt(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}
