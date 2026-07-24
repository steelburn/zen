package github

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestNewClient(t *testing.T) {
	c := NewClient(10 * time.Second)
	if c == nil {
		t.Fatal("NewClient() returned nil")
	}
	if c.baseURL != apiBase {
		t.Errorf("baseURL = %q, want %q", c.baseURL, apiBase)
	}
}

func TestNewClient_DefaultTimeout(t *testing.T) {
	c := NewClient(0)
	if c == nil {
		t.Fatal("NewClient() returned nil")
	}
}

func TestCreateInstallationToken_Success(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("method = %s, want POST", r.Method)
		}
		if r.Header.Get("Authorization") != "Bearer test-jwt" {
			t.Errorf("Authorization = %q, want Bearer test-jwt", r.Header.Get("Authorization"))
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(InstallationTokenResponse{
			Token:     "inst-token-123",
			ExpiresAt: time.Now().Add(1 * time.Hour),
			Permissions: map[string]string{
				"checks": "write",
				"pull_requests": "read",
			},
		})
	}))
	defer srv.Close()

	c := &Client{
		httpClient: &http.Client{Timeout: 10 * time.Second},
		baseURL:    srv.URL,
	}

	resp, err := c.CreateInstallationToken(context.Background(), "test-jwt", 12345)
	if err != nil {
		t.Fatalf("CreateInstallationToken() error = %v", err)
	}

	if resp.Token != "inst-token-123" {
		t.Errorf("Token = %q, want inst-token-123", resp.Token)
	}
	if resp.Permissions["checks"] != "write" {
		t.Errorf("checks permission = %q, want write", resp.Permissions["checks"])
	}
}

func TestCreateInstallationToken_Unauthorized(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"message": "Bad credentials",
		})
	}))
	defer srv.Close()

	c := &Client{
		httpClient: &http.Client{Timeout: 10 * time.Second},
		baseURL:    srv.URL,
	}

	_, err := c.CreateInstallationToken(context.Background(), "bad-jwt", 12345)
	if err == nil {
		t.Fatal("CreateInstallationToken() expected error")
	}
}

func TestDoRequest_Success(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer inst-token" {
			t.Errorf("Authorization = %q, want Bearer inst-token", r.Header.Get("Authorization"))
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"id": 42, "name": "test-repo"}`))
	}))
	defer srv.Close()

	c := &Client{
		httpClient: &http.Client{Timeout: 10 * time.Second},
		baseURL:    srv.URL,
	}

	body, err := c.DoRequest(context.Background(), http.MethodGet, "/repos/owner/repo", "inst-token", nil)
	if err != nil {
		t.Fatalf("DoRequest() error = %v", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		t.Fatal(err)
	}
	if result["id"] != float64(42) {
		t.Errorf("id = %v, want 42", result["id"])
	}
}

func TestDoRequest_NotFound(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"message": "Not Found"}`))
	}))
	defer srv.Close()

	c := &Client{
		httpClient: &http.Client{Timeout: 10 * time.Second},
		baseURL:    srv.URL,
	}

	_, err := c.DoRequest(context.Background(), http.MethodGet, "/repos/owner/missing", "inst-token", nil)
	if err == nil {
		t.Fatal("DoRequest() expected error")
	}
}
