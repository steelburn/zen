// Package handler provides HTTP handlers for the ZEN server.
package handler

import (
	"context"
	"database/sql"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"
)

// HealthResponse is the JSON response for the health check endpoint.
type HealthResponse struct {
	Status   string `json:"status"`
	Version  string `json:"version"`
	Database string `json:"database,omitempty"`
	Uptime   string `json:"uptime,omitempty"`
}

// NewHealthHandler returns an HTTP handler for the health check endpoint.
// It verifies database connectivity and reports overall service health.
func NewHealthHandler(version string, db *sql.DB) http.HandlerFunc {
	startedAt := time.Now()

	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		status := "ok"
		dbStatus := "ok"

		// Check database connectivity with a short timeout.
		if db != nil {
			ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
			defer cancel()
			if err := db.PingContext(ctx); err != nil {
				slog.WarnContext(r.Context(), "health check: database ping failed", "error", err)
				dbStatus = "error"
				status = "degraded"
			}
		} else {
			dbStatus = "not_configured"
		}

		httpStatus := http.StatusOK
		if status != "ok" {
			httpStatus = http.StatusServiceUnavailable
		}

		uptime := time.Since(startedAt).Truncate(time.Second).String()

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(httpStatus)
		json.NewEncoder(w).Encode(HealthResponse{
			Status:   status,
			Version:  version,
			Database: dbStatus,
			Uptime:   uptime,
		})
	}
}
