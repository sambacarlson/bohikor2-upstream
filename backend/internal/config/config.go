package config

import (
	"fmt"
	"time"

	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"
)

type Config struct {
	Env         string `env:"ENV" envDefault:"development"`
	Port        int    `env:"PORT" envDefault:"8080"`
	DatabaseURL string `env:"DATABASE_URL" envDefault:"postgres://localhost:5432/bohikor2?sslmode=disable"`

	// Firebase
	FirebaseProjectID       string `env:"FIREBASE_PROJECT_ID" envDefault:""`
	FirebaseCredentialsJSON string `env:"FIREBASE_CREDENTIALS_JSON" envDefault:""`

	// Campay
	CampayAPIUsername   string `env:"CAMPAY_API_USERNAME" envDefault:""`
	CampayAPIPassword   string `env:"CAMPAY_API_PASSWORD" envDefault:""`
	CampayWebhookSecret string `env:"CAMPAY_WEBHOOK_SECRET" envDefault:""`
	CampayBaseURL       string `env:"CAMPAY_BASE_URL" envDefault:"https://demo.campay.net/api"`

	// Resend
	ResendAPIKey string `env:"RESEND_API_KEY" envDefault:""`
	FromEmail    string `env:"FROM_EMAIL" envDefault:"onboarding@resend.dev"`

	// Timezone
	Timezone string `env:"TIMEZONE" envDefault:"Africa/Douala"`

	// Server timeouts
	ReadTimeout  time.Duration `env:"READ_TIMEOUT" envDefault:"15s"`
	WriteTimeout time.Duration `env:"WRITE_TIMEOUT" envDefault:"15s"`
	IdleTimeout  time.Duration `env:"IDLE_TIMEOUT" envDefault:"60s"`
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	return cfg, nil
}

func (c *Config) IsProduction() bool {
	return c.Env == "production"
}

func (c *Config) LoadLocation() (*time.Location, error) {
	return time.LoadLocation(c.Timezone)
}
