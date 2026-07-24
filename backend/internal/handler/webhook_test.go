package handler

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// signPayload generates an HMAC-SHA256 signature for the given payload and secret.
func signPayload(payload []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

// Test helpers.
func TestNewWebhookHandler(t *testing.T) {
	h := NewWebhookHandler("test-secret")
	if h == nil {
		t.Fatal("NewWebhookHandler() returned nil")
	}
	if h.webhookSecret != "test-secret" {
		t.Errorf("webhookSecret = %q, want test-secret", h.webhookSecret)
	}
}

func TestWebhookHandler_MethodNotAllowed(t *testing.T) {
	h := NewWebhookHandler("secret")

	methods := []string{http.MethodGet, http.MethodPut, http.MethodDelete, http.MethodPatch}
	for _, method := range methods {
		t.Run(method, func(t *testing.T) {
			req := httptest.NewRequest(method, "/webhook", nil)
			rec := httptest.NewRecorder()

			h.ServeHTTP(rec, req)

			if rec.Code != http.StatusMethodNotAllowed {
				t.Errorf("%s status = %d, want %d", method, rec.Code, http.StatusMethodNotAllowed)
			}
		})
	}
}

func TestWebhookHandler_MissingEventType(t *testing.T) {
	h := NewWebhookHandler("secret")
	body := []byte(`{"test": true}`)

	req := httptest.NewRequest(http.MethodPost, "/webhook", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestWebhookHandler_PingEvent(t *testing.T) {
	h := NewWebhookHandler("secret")
	body := []byte(`{}`)

	req := httptest.NewRequest(http.MethodPost, "/webhook", bytes.NewReader(body))
	req.Header.Set("X-GitHub-Event", "ping")
	req.Header.Set("X-Hub-Signature-256", signPayload(body, "secret"))
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var resp map[string]string
	json.NewDecoder(rec.Body).Decode(&resp)
	if resp["status"] != "pong" {
		t.Errorf("status = %q, want pong", resp["status"])
	}
}

func TestWebhookHandler_InvalidSignature(t *testing.T) {
	h := NewWebhookHandler("secret")
	body := []byte(`{"action": "opened"}`)

	req := httptest.NewRequest(http.MethodPost, "/webhook", bytes.NewReader(body))
	req.Header.Set("X-GitHub-Event", "pull_request")
	req.Header.Set("X-Hub-Signature-256", "sha256=invalid")
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusUnauthorized)
	}
}

func TestWebhookHandler_PullRequestOpened(t *testing.T) {
	h := NewWebhookHandler("secret")

	payload := WebhookPayload{
		Action: "opened",
		PullRequest: &PullRequest{
			Number:  42,
			Title:   "Fix the thing",
			State:   "open",
			HTMLURL: "https://github.com/owner/repo/pull/42",
			Base: &Branch{
				Ref: "main",
				SHA: "base-sha-123",
				Repo: &Repository{
					ID:       1,
					FullName: "owner/repo",
					Name:     "repo",
					Owner: &Owner{
						ID:    100,
						Login: "owner",
						Type:  "User",
					},
				},
			},
			Head: &Branch{
				Ref: "feature-branch",
				SHA: "head-sha-456",
			},
		},
		Repository: &Repository{
			ID:       1,
			FullName: "owner/repo",
			Name:     "repo",
			Owner: &Owner{
				ID:    100,
				Login: "owner",
				Type:  "User",
			},
		},
		Installation: &Installation{
			ID: 789,
		},
	}

	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/webhook", bytes.NewReader(body))
	req.Header.Set("X-GitHub-Event", "pull_request")
	req.Header.Set("X-Hub-Signature-256", signPayload(body, "secret"))
	req.Header.Set("X-GitHub-Delivery", "delivery-123")
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var resp map[string]interface{}
	json.NewDecoder(rec.Body).Decode(&resp)
	if resp["status"] != "queued" {
		t.Errorf("status = %q, want queued", resp["status"])
	}
	if resp["action"] != "opened" {
		t.Errorf("action = %q, want opened", resp["action"])
	}
}

func TestWebhookHandler_PullRequestSynchronize(t *testing.T) {
	h := NewWebhookHandler("secret")

	payload := WebhookPayload{
		Action: "synchronize",
		PullRequest: &PullRequest{
			Number: 42,
			Head:   &Branch{Ref: "feature", SHA: "new-sha"},
			Base:   &Branch{Ref: "main", SHA: "base-sha"},
		},
		Repository: &Repository{
			ID:       1,
			FullName: "owner/repo",
			Name:     "repo",
			Owner:    &Owner{ID: 100, Login: "owner", Type: "User"},
		},
		Installation: &Installation{ID: 789},
	}

	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/webhook", bytes.NewReader(body))
	req.Header.Set("X-GitHub-Event", "pull_request")
	req.Header.Set("X-Hub-Signature-256", signPayload(body, "secret"))
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusOK)
	}
}

func TestWebhookHandler_PullRequestIgnoredAction(t *testing.T) {
	h := NewWebhookHandler("secret")

	payload := WebhookPayload{
		Action: "labeled",
		PullRequest: &PullRequest{
			Number: 42,
			Head:   &Branch{Ref: "feature", SHA: "sha"},
			Base:   &Branch{Ref: "main", SHA: "base-sha"},
		},
		Repository: &Repository{
			ID:       1,
			FullName: "owner/repo",
			Name:     "repo",
			Owner:    &Owner{ID: 100, Login: "owner", Type: "User"},
		},
		Installation: &Installation{ID: 789},
	}

	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/webhook", bytes.NewReader(body))
	req.Header.Set("X-GitHub-Event", "pull_request")
	req.Header.Set("X-Hub-Signature-256", signPayload(body, "secret"))
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var resp map[string]string
	json.NewDecoder(rec.Body).Decode(&resp)
	if resp["status"] != "ignored" {
		t.Errorf("status = %q, want ignored", resp["status"])
	}
}

func TestWebhookHandler_MissingPullRequestInPayload(t *testing.T) {
	h := NewWebhookHandler("secret")

	payload := map[string]string{"action": "opened"}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/webhook", bytes.NewReader(body))
	req.Header.Set("X-GitHub-Event", "pull_request")
	req.Header.Set("X-Hub-Signature-256", signPayload(body, "secret"))
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestWebhookHandler_UnhandledEvent(t *testing.T) {
	h := NewWebhookHandler("secret")
	body := []byte(`{"test": true}`)

	req := httptest.NewRequest(http.MethodPost, "/webhook", bytes.NewReader(body))
	req.Header.Set("X-GitHub-Event", "issues")
	req.Header.Set("X-Hub-Signature-256", signPayload(body, "secret"))
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var resp map[string]string
	json.NewDecoder(rec.Body).Decode(&resp)
	if resp["status"] != "ignored" {
		t.Errorf("status = %q, want ignored", resp["status"])
	}
}

func TestValidateSignature(t *testing.T) {
	h := NewWebhookHandler("my-secret")

	tests := []struct {
		name      string
		body      []byte
		signature string
		wantErr   bool
	}{
		{
			name:      "valid signature",
			body:      []byte(`{"action": "opened"}`),
			signature: signPayload([]byte(`{"action": "opened"}`), "my-secret"),
			wantErr:   false,
		},
		{
			name:      "invalid signature",
			body:      []byte(`{"action": "opened"}`),
			signature: signPayload([]byte(`{"action": "closed"}`), "my-secret"),
			wantErr:   true,
		},
		{
			name:      "wrong secret",
			body:      []byte(`{"action": "opened"}`),
			signature: signPayload([]byte(`{"action": "opened"}`), "wrong-secret"),
			wantErr:   true,
		},
		{
			name:      "invalid format",
			body:      []byte(`{}`),
			signature: "md5=bad",
			wantErr:   true,
		},
		{
			name:      "not hex",
			body:      []byte(`{}`),
			signature: "sha256=zzzzzz",
			wantErr:   true,
		},
		{
			name:      "empty body, valid sig",
			body:      []byte{},
			signature: signPayload([]byte{}, "my-secret"),
			wantErr:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := h.validateSignature(tt.body, tt.signature)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateSignature() error = %v, wantErr = %v", err, tt.wantErr)
			}
		})
	}
}

func TestWebhookHandler_NoSignatureStillWorks(t *testing.T) {
	// In development mode, missing signature should still work.
	h := NewWebhookHandler("secret")
	body := []byte(`{}`)

	req := httptest.NewRequest(http.MethodPost, "/webhook", bytes.NewReader(body))
	req.Header.Set("X-GitHub-Event", "ping")
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d (missing sig should be allowed)", rec.Code, http.StatusOK)
	}
}

// Test serialization round-trips.
func TestWebhookPayload_JSONRoundTrip(t *testing.T) {
	original := WebhookPayload{
		Action: "opened",
		PullRequest: &PullRequest{
			Number: 1,
			Title:  "Test PR",
			State:  "open",
			Base:   &Branch{Ref: "main", SHA: "abc"},
			Head:   &Branch{Ref: "feature", SHA: "def"},
		},
		Repository: &Repository{
			ID:       42,
			FullName: "test-owner/test-repo",
			Owner:    &Owner{ID: 123, Login: "test-owner", Type: "Organization"},
		},
		Installation: &Installation{ID: 789},
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatal(err)
	}

	var decoded WebhookPayload
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatal(err)
	}

	if decoded.Action != original.Action {
		t.Errorf("Action = %q, want %q", decoded.Action, original.Action)
	}
	if decoded.PullRequest.Number != original.PullRequest.Number {
		t.Errorf("PR Number = %d, want %d", decoded.PullRequest.Number, original.PullRequest.Number)
	}
	if decoded.Repository.FullName != original.Repository.FullName {
		t.Errorf("FullName = %q, want %q", decoded.Repository.FullName, original.Repository.FullName)
	}
	if decoded.Installation.ID != original.Installation.ID {
		t.Errorf("Installation ID = %d, want %d", decoded.Installation.ID, original.Installation.ID)
	}
}

func TestWebhookHandler_PullRequestClosed(t *testing.T) {
	h := NewWebhookHandler("secret")

	payload := WebhookPayload{
		Action: "closed",
		PullRequest: &PullRequest{
			Number: 42,
			Head:   &Branch{Ref: "feature", SHA: "sha"},
			Base:   &Branch{Ref: "main", SHA: "base-sha"},
		},
		Repository: &Repository{
			ID:       1,
			FullName: "owner/repo",
			Name:     "repo",
			Owner:    &Owner{ID: 100, Login: "owner", Type: "User"},
		},
	}

	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/webhook", bytes.NewReader(body))
	req.Header.Set("X-GitHub-Event", "pull_request")
	req.Header.Set("X-Hub-Signature-256", signPayload(body, "secret"))
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	// "closed" is in the relevantActions set, so it should be processed.
	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var resp map[string]interface{}
	json.NewDecoder(rec.Body).Decode(&resp)
	if resp["status"] != "queued" {
		t.Errorf("status = %q, want queued", resp["status"])
	}
}
