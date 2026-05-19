package main

import (
	"log/slog"
	"os"

	"github.com/Iknite-Space/bohikor2/internal/config"
	"github.com/Iknite-Space/bohikor2/internal/server"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	slog.Info("starting bohikor2 backend",
		"port", cfg.Port,
		"env", cfg.Env,
	)

	srv, err := server.New(cfg)
	if err != nil {
		slog.Error("failed to initialize server", "error", err)
		os.Exit(1)
	}

	if err := srv.Start(); err != nil {
		slog.Error("server error", "error", err)
		os.Exit(1)
	}
}
