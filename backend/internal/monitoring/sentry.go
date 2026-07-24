// Package monitoring provides error tracking and observability helpers.
package monitoring

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/getsentry/sentry-go"
)

// SentryConfig groups the parameters needed to initialise Sentry.
type SentryConfig struct {
	DSN         string
	Environment string
	SampleRate  float64
	Version     string
}

// InitSentry initialises the Sentry SDK. If dsn is empty it's a no-op so local
// development and CI work without any external dependency.
func InitSentry(cfg SentryConfig) error {
	if cfg.DSN == "" {
		slog.Info("Sentry DSN not set — error tracking disabled")
		return nil
	}

	if cfg.SampleRate <= 0 {
		cfg.SampleRate = 1.0
	}

	err := sentry.Init(sentry.ClientOptions{
		Dsn:              cfg.DSN,
		Environment:      cfg.Environment,
		Release:          cfg.Version,
		SampleRate:       cfg.SampleRate,
		TracesSampleRate: cfg.SampleRate,
		Debug:            cfg.Environment == "development",
		AttachStacktrace: true,
	})
	if err != nil {
		return fmt.Errorf("sentry init: %w", err)
	}

	slog.Info("Sentry error tracking initialised",
		"environment", cfg.Environment,
		"release", cfg.Version,
	)
	return nil
}

// FlushSentry flushes buffered events before shutdown. Call from a defer or
// shutdown hook.
func FlushSentry(timeout time.Duration) {
	sentry.Flush(timeout)
}

// RecoverWithSentry recovers from a panic and reports it to Sentry. Use in
// goroutines you control:
//
//	defer monitoring.RecoverWithSentry()
func RecoverWithSentry() {
	if err := recover(); err != nil {
		sentry.CurrentHub().Recover(err)
		sentry.Flush(2 * time.Second)
		panic(err) // re-panic after reporting
	}
}

// WrapHandlerContext creates a context that carries the Sentry Hub so
// downstream code can attach breadcrumbs / spans.
func WrapHandlerContext(ctx context.Context, hub *sentry.Hub) context.Context {
	return sentry.SetHubOnContext(ctx, hub)
}

// SetUserOnScope sets the authenticated user on the current Sentry scope.
func SetUserOnScope(id, username, email string) {
	sentry.ConfigureScope(func(scope *sentry.Scope) {
		scope.SetUser(sentry.User{
			ID:       id,
			Username: username,
			Email:    email,
		})
	})
}

// RecoverAndReport recovers from a panic and reports the error to Sentry with
// HTTP request context. Unlike RecoverWithSentry it does not re-panic.
func RecoverAndReport(rec interface{}, r *http.Request) {
	hub := sentry.GetHubFromContext(r.Context())
	if hub == nil {
		hub = sentry.CurrentHub()
	}
	hub.WithScope(func(scope *sentry.Scope) {
		if r != nil {
			scope.SetRequest(r)
		}
		hub.CaptureException(fmt.Errorf("panic: %v", rec))
	})
	sentry.Flush(2 * time.Second)
}
