// Package handler provides HTTP handlers for the ZEN server.
package handler

import (
	"encoding/json"
	"net/http"
)

// HealthResponse is the JSON response for the health check endpoint.
type HealthResponse struct {
	Status  string `json:"status"`
	Version string `json:"version"`
}

// NewHealthHandler returns an HTTP handler for the health check endpoint.
func NewHealthHandler(version string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(HealthResponse{
			Status:  "ok",
			Version: version,
		})
	}
}
