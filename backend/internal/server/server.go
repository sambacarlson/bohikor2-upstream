package server

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/Iknite-Space/bohikor2/internal/config"
	"github.com/Iknite-Space/bohikor2/internal/middleware"
	"github.com/Iknite-Space/bohikor2/internal/repository"
)

type Server struct {
	cfg    *config.Config
	router *gin.Engine
	http   *http.Server
	db     *pgxpool.Pool
}

func New(cfg *config.Config) (*Server, error) {
	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := repository.NewDB(ctx, cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("initialize database: %w", err)
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.Logger())
	router.Use(middleware.RequestID())

	// Health check
	router.GET("/health", healthHandler)

	// TODO: Register routes here as they are implemented
	// registerRoutes(router, db, cfg)

	s := &Server{
		cfg:    cfg,
		router: router,
		db:     db,
	}

	s.http = &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      router,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		IdleTimeout:  cfg.IdleTimeout,
	}

	return s, nil
}

func (s *Server) Start() error {
	// Graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		sig := <-sigCh
		slog.Info("received signal, shutting down", "signal", sig)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		if err := s.http.Shutdown(ctx); err != nil {
			slog.Error("server forced to shutdown", "error", err)
		}

		s.db.Close()
		slog.Info("database connection pool closed")
	}()

	slog.Info("server listening", "addr", s.http.Addr)
	if err := s.http.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return fmt.Errorf("listen and serve: %w", err)
	}

	return nil
}

func healthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}
