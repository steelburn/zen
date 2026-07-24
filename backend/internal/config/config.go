// Package config provides configuration loading for the ZEN server.
//
// Configuration is loaded from environment variables with sensible defaults.
// All config values are validated at startup to fail fast.
package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

// Config holds all configuration for the ZEN server.
type Config struct {
	// Port is the HTTP listen port.
	Port int

	// LogLevel controls logging verbosity.
	LogLevel string

	// Database configuration.
	Database DatabaseConfig

	// GitHub App configuration.
	GitHub GitHubAppConfig

	// Server configuration.
	Server ServerConfig

	// Sentry configuration for error tracking.
	Sentry SentryConfig
}

// DatabaseConfig holds Postgres connection settings.
type DatabaseConfig struct {
	// DSN is the Postgres connection string.
	DSN string

	// MaxOpenConns is the maximum number of open connections.
	MaxOpenConns int

	// MaxIdleConns is the maximum number of idle connections.
	MaxIdleConns int

	// ConnMaxLifetime is the maximum lifetime of a connection.
	ConnMaxLifetime time.Duration

	// RunMigrations controls whether migrations run on startup.
	RunMigrations bool
}

// GitHubAppConfig holds GitHub App authentication settings.
type GitHubAppConfig struct {
	// AppID is the GitHub App ID.
	AppID string

	// PrivateKey is the PEM-encoded GitHub App private key.
	PrivateKey string

	// PrivateKeyPath is a path to the PEM-encoded private key file.
	// If set, PrivateKey is read from this file.
	PrivateKeyPath string

	// WebhookSecret is the secret used to validate webhook payloads.
	WebhookSecret string
}

// SentryConfig holds configuration for Sentry error tracking.
type SentryConfig struct {
	// DSN is the Sentry project DSN. If empty, Sentry is not initialized.
	DSN string

	// Environment is the deployment environment (development, staging, production).
	Environment string

	// SampleRate controls the rate of transaction sampling (0.0 - 1.0).
	SampleRate float64
}

// ServerConfig holds general server settings.
type ServerConfig struct {
	// ReadTimeout is the maximum duration for reading the entire request.
	ReadTimeout time.Duration

	// WriteTimeout is the maximum duration for writing the response.
	WriteTimeout time.Duration

	// ShutdownTimeout is the maximum duration to wait for graceful shutdown.
	ShutdownTimeout time.Duration
}

// Load reads configuration from environment variables.
// Returns an error if required values are missing or invalid.
func Load() (*Config, error) {
	cfg := &Config{
		Port:      envInt("PORT", 8080),
		LogLevel:  envStr("LOG_LEVEL", "info"),
		Database: DatabaseConfig{
			DSN:             envStr("DATABASE_DSN", ""),
			MaxOpenConns:    envInt("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns:    envInt("DB_MAX_IDLE_CONNS", 10),
			ConnMaxLifetime: envDuration("DB_CONN_MAX_LIFETIME", 5*time.Minute),
			RunMigrations:   envBool("DB_RUN_MIGRATIONS", true),
		},
		GitHub: GitHubAppConfig{
			AppID:           envStr("GITHUB_APP_ID", ""),
			PrivateKey:      envStr("GITHUB_APP_PRIVATE_KEY", ""),
			PrivateKeyPath:  envStr("GITHUB_APP_PRIVATE_KEY_PATH", ""),
			WebhookSecret:   envStr("GITHUB_WEBHOOK_SECRET", ""),
		},
		Sentry: SentryConfig{
			DSN:         envStr("SENTRY_DSN", ""),
			Environment: envStr("SENTRY_ENVIRONMENT", "development"),
			SampleRate:  envFloat("SENTRY_SAMPLE_RATE", 1.0),
		},
		Server: ServerConfig{
			ReadTimeout:     envDuration("SERVER_READ_TIMEOUT", 10*time.Second),
			WriteTimeout:    envDuration("SERVER_WRITE_TIMEOUT", 10*time.Second),
			ShutdownTimeout: envDuration("SERVER_SHUTDOWN_TIMEOUT", 15*time.Second),
		},
	}

	// Resolve private key from file path if provided.
	if cfg.GitHub.PrivateKey == "" && cfg.GitHub.PrivateKeyPath != "" {
		data, err := os.ReadFile(cfg.GitHub.PrivateKeyPath)
		if err != nil {
			return nil, fmt.Errorf("read github private key file: %w", err)
		}
		cfg.GitHub.PrivateKey = string(data)
	}

	// Validate required fields.
	if cfg.Database.DSN == "" {
		return nil, fmt.Errorf("DATABASE_DSN is required")
	}
	if cfg.GitHub.AppID == "" {
		return nil, fmt.Errorf("GITHUB_APP_ID is required")
	}
	if cfg.GitHub.PrivateKey == "" {
		return nil, fmt.Errorf("GITHUB_APP_PRIVATE_KEY or GITHUB_APP_PRIVATE_KEY_PATH is required")
	}
	if cfg.GitHub.WebhookSecret == "" {
		return nil, fmt.Errorf("GITHUB_WEBHOOK_SECRET is required")
	}

	return cfg, nil
}

// envStr returns the value of the environment variable or the default.
func envStr(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

// envInt returns the integer value of the environment variable or the default.
func envInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return defaultVal
}

// envBool returns the boolean value of the environment variable or the default.
func envBool(key string, defaultVal bool) bool {
	if val := os.Getenv(key); val != "" {
		if b, err := strconv.ParseBool(val); err == nil {
			return b
		}
	}
	return defaultVal
}

// envDuration returns the duration value of the environment variable or the default.
func envDuration(key string, defaultVal time.Duration) time.Duration {
	if val := os.Getenv(key); val != "" {
		if d, err := time.ParseDuration(val); err == nil {
			return d
		}
	}
	return defaultVal
}

// envFloat returns the float64 value of the environment variable or the default.
func envFloat(key string, defaultVal float64) float64 {
	if val := os.Getenv(key); val != "" {
		if f, err := strconv.ParseFloat(val, 64); err == nil {
			return f
		}
	}
	return defaultVal
}
