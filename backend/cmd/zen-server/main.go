// Package main is the entry point for the ZEN service.
//
// ZEN is a PR Quality Gate — a GitHub App that automatically checks pull
// requests for code quality regressions before they merge.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/zen-inc/zen-server/internal/auth"
	"github.com/zen-inc/zen-server/internal/config"
	"github.com/zen-inc/zen-server/internal/db"
	"github.com/zen-inc/zen-server/internal/github"
	"github.com/zen-inc/zen-server/internal/handler"
)

// version is set at build time via -ldflags.
var version = "0.1.0-dev"

func main() {
	// Load configuration.
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load configuration", "error", err)
		os.Exit(1)
	}

	// Set up structured logger.
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: parseLogLevel(cfg.LogLevel),
	})))

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	slog.InfoContext(ctx, "starting ZEN server",
		"version", version,
		"port", cfg.Port,
	)

	// Connect to database.
	database, err := db.Connect(ctx, cfg.Database)
	if err != nil {
		slog.ErrorContext(ctx, "failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close(database, cfg.Server.ShutdownTimeout)

	// Run migrations if configured.
	if cfg.Database.RunMigrations {
		if err := db.RunMigrations(ctx, database); err != nil {
			slog.ErrorContext(ctx, "failed to run migrations", "error", err)
			os.Exit(1)
		}
		slog.InfoContext(ctx, "migrations completed")
	}

	// Initialize GitHub App auth.
	tokenGen, err := auth.NewAppTokenGenerator(cfg.GitHub.AppID, cfg.GitHub.PrivateKey)
	if err != nil {
		slog.ErrorContext(ctx, "failed to initialize GitHub auth", "error", err)
		os.Exit(1)
	}

	// Initialize GitHub API client (will be used by check runner in ZEN-14).
	_ = github.NewClient(30 * time.Second)

	// Verify we can generate a token (not calling GitHub yet).
	if _, err := tokenGen.GenerateToken(1 * time.Minute); err != nil {
		slog.ErrorContext(ctx, "failed to generate test JWT", "error", err)
		os.Exit(1)
	}
	slog.InfoContext(ctx, "GitHub App auth initialized", "app_id", cfg.GitHub.AppID)

	// Set up HTTP router.
	mux := http.NewServeMux()

	// Health check.
	mux.HandleFunc("GET /healthz", handler.NewHealthHandler(version))

	// GitHub webhook receiver.
	webhookHandler := handler.NewWebhookHandler(cfg.GitHub.WebhookSecret)
	mux.Handle("POST /webhook", webhookHandler)

	// Catch-all for debugging.
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"service":"zen","version":"%s","status":"running"}`, version)
	})

	// Create server.
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      withMiddleware(mux),
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
	}

	// Graceful shutdown.
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		sig := <-shutdown
		slog.InfoContext(ctx, "shutting down", "signal", sig)
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
		defer shutdownCancel()
		if err := srv.Shutdown(shutdownCtx); err != nil {
			slog.ErrorContext(ctx, "shutdown error", "error", err)
		}
	}()

	// Start server.
	addr := srv.Addr
	slog.InfoContext(ctx, "listening", "addr", addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.ErrorContext(ctx, "server error", "error", err)
		os.Exit(1)
	}

	slog.InfoContext(ctx, "server stopped")
}

// parseLogLevel converts a string log level to slog.Level.
func parseLogLevel(level string) slog.Level {
	switch level {
	case "debug":
		return slog.LevelDebug
	case "info":
		return slog.LevelInfo
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// withMiddleware wraps the handler with common middleware.
func withMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Log request.
		slog.InfoContext(r.Context(), "request",
			"method", r.Method,
			"path", r.URL.Path,
			"remote", r.RemoteAddr,
		)

		// Set common headers.
		w.Header().Set("X-ZEN-Version", version)

		next.ServeHTTP(w, r)

		// Log response time.
		slog.DebugContext(r.Context(), "request completed",
			"method", r.Method,
			"path", r.URL.Path,
			"duration", time.Since(start).String(),
		)
	})
}

