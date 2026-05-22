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
	"github.com/shopspring/decimal"

	db "github.com/Iknite-Space/bohikor2/db/sqlc"
	"github.com/Iknite-Space/bohikor2/internal/campay"
	"github.com/Iknite-Space/bohikor2/internal/config"
	"github.com/Iknite-Space/bohikor2/internal/email"
	"github.com/Iknite-Space/bohikor2/internal/firebaseapp"
	"github.com/Iknite-Space/bohikor2/internal/handler"
	"github.com/Iknite-Space/bohikor2/internal/middleware"
	"github.com/Iknite-Space/bohikor2/internal/repository"
	"github.com/Iknite-Space/bohikor2/internal/service"
)

type Server struct {
	cfg      *config.Config
	router   *gin.Engine
	http     *http.Server
	pool     *pgxpool.Pool
	queries  *db.Queries
	firebase *firebaseapp.Client
	email    *email.Client
}

func New(cfg *config.Config) (*Server, error) {
	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := repository.NewDB(ctx, cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("initialize database: %w", err)
	}

	fb, err := firebaseapp.NewClient(ctx, cfg.FirebaseCredentialsJSON, cfg.FirebaseProjectID)
	if err != nil {
		pool.Close()
		return nil, fmt.Errorf("initialize firebase: %w", err)
	}

	emailClient := email.NewClient(cfg.ResendAPIKey, cfg.FromEmail)

	queries := db.New(pool)

	campayClient := campay.NewClient(
		cfg.CampayPermanentAccessToken,
		cfg.CampayBaseURL,
		cfg.CampayWebhookSecret,
	)

	inviteStore := service.NewRealInviteStore(queries)
	inviteService := service.NewInviteService(inviteStore, emailClient, queries)

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.Logger())
	router.Use(middleware.RequestID())

	authMiddleware := middleware.FirebaseAuth(fb.Auth)

	// Public routes (no auth required)
	router.GET("/health", healthHandler)

	// Mobile auth routes (public - no Firebase auth required)
	authHandler := handler.NewAuthHandler(queries, emailClient)
	authGroup := router.Group("/api/auth")
	{
		authGroup.GET("/check-invite", authHandler.CheckInvitation)
		authGroup.POST("/send-email-otp", authHandler.SendEmailOTP)
		authGroup.POST("/verify-email-otp", authHandler.VerifyEmailOTP)
		authGroup.POST("/verify-phone-otp", authMiddleware, authHandler.VerifyPhoneOTP)
	}

	// Auth routes (protected by Firebase auth middleware)
	authProtected := router.Group("/api/auth")
	authProtected.Use(authMiddleware)
	{
		authProtected.POST("/verify", handleVerify(queries))
	}

	// Admin routes (protected by Firebase auth + admin role)
	adminGroup := router.Group("/api/admin")
	adminGroup.Use(authMiddleware)
	adminGroup.Use(middleware.RequireAdmin(queries))
	{
		adminGroup.GET("/me", handleAdminMe(queries))
		adminGroup.POST("/invite", handler.HandleInvite(inviteService))
		adminGroup.GET("/invitations", handler.HandleListInvitations(queries))
		adminGroup.GET("/users", handler.HandleListUsers(queries))
	}

	// User routes (protected by Firebase auth + active user check)
	userGroup := router.Group("/api/users")
	userGroup.Use(authMiddleware)
	userGroup.Use(middleware.RequireActiveUser(queries))
	{
		userGroup.GET("/me", handleUserMe(queries))
		userGroup.PUT("/terms", handler.HandleAcceptTerms(queries))
	}

	// Advance request routes (protected by Firebase auth + active user check)
	advanceHandler := handler.NewAdvanceHandler(queries, campayClient, decimal.NewFromInt(10000))
	advanceGroup := router.Group("/api/advance-requests")
	advanceGroup.Use(authMiddleware)
	advanceGroup.Use(middleware.RequireActiveUser(queries))
	{
		advanceGroup.POST("", advanceHandler.CreateRequest)
		advanceGroup.GET("", advanceHandler.ListUserRequests)
	}

	// Admin advance request routes
	adminAdvanceGroup := router.Group("/api/admin/requests")
	adminAdvanceGroup.Use(authMiddleware)
	adminAdvanceGroup.Use(middleware.RequireAdmin(queries))
	{
		adminAdvanceGroup.GET("", handler.HandleListAdminRequests(queries))
	}

	// Webhook routes (public - HMAC verified)
	webhookHandler := handler.NewWebhookHandler(queries, campayClient)
	router.POST("/api/webhooks/campay", webhookHandler.HandleCampayWebhook)

	s := &Server{
		cfg:      cfg,
		router:   router,
		pool:     pool,
		queries:  queries,
		firebase: fb,
		email:    emailClient,
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

		s.pool.Close()
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
