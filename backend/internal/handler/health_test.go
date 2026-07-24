package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNewHealthHandler_OK(t *testing.T) {
	handler := NewHealthHandler("test-version", nil)
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var resp HealthResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if resp.Status != "ok" {
		t.Errorf("Status = %q, want ok", resp.Status)
	}
	if resp.Version != "test-version" {
		t.Errorf("Version = %q, want test-version", resp.Version)
	}

	ct := rec.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}
}

func TestNewHealthHandler_MethodNotAllowed(t *testing.T) {
	handler := NewHealthHandler("v1", nil)

	methods := []string{http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch}
	for _, method := range methods {
		t.Run(method, func(t *testing.T) {
			req := httptest.NewRequest(method, "/healthz", nil)
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			if rec.Code != http.StatusMethodNotAllowed {
				t.Errorf("%s status = %d, want %d", method, rec.Code, http.StatusMethodNotAllowed)
			}
		})
	}
}

func TestNewHealthHandler_VersionIncluded(t *testing.T) {
	handler := NewHealthHandler("0.2.0-rc1", nil)
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	var resp HealthResponse
	json.NewDecoder(rec.Body).Decode(&resp)

	if resp.Version != "0.2.0-rc1" {
		t.Errorf("Version = %q, want 0.2.0-rc1", resp.Version)
	}
}

func TestNewHealthHandler_DatabaseNotConfigured(t *testing.T) {
	handler := NewHealthHandler("v1", nil)
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	var resp HealthResponse
	json.NewDecoder(rec.Body).Decode(&resp)

	if resp.Database != "not_configured" {
		t.Errorf("Database = %q, want not_configured", resp.Database)
	}
	if resp.Uptime == "" {
		t.Error("Uptime should not be empty")
	}
}
