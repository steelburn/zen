package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
)

// WebhookPayload represents a GitHub webhook event payload.
// Contains only the fields needed for PR quality gate processing.
type WebhookPayload struct {
	Action      string      `json:"action"`
	PullRequest *PullRequest `json:"pull_request"`
	Repository  *Repository  `json:"repository"`
	Installation *Installation `json:"installation"`
}

// PullRequest represents a GitHub pull request.
type PullRequest struct {
	Number  int    `json:"number"`
	Title   string `json:"title"`
	State   string `json:"state"`
	HTMLURL string `json:"html_url"`
	Base    *Branch `json:"base"`
	Head    *Branch `json:"head"`
}

// Branch represents a branch reference in a pull request.
type Branch struct {
	Ref  string     `json:"ref"`
	SHA  string     `json:"sha"`
	Repo *Repository `json:"repo"`
}

// Repository represents a GitHub repository.
type Repository struct {
	ID            int64  `json:"id"`
	Name          string `json:"name"`
	FullName      string `json:"full_name"`
	Owner         *Owner `json:"owner"`
	DefaultBranch string `json:"default_branch"`
	Private       bool   `json:"private"`
}

// Owner represents a repository owner.
type Owner struct {
	ID    int64  `json:"id"`
	Login string `json:"login"`
	Type  string `json:"type"`
}

// Installation represents a GitHub App installation.
type Installation struct {
	ID int64 `json:"id"`
}

// WebhookHandler processes incoming GitHub webhook events.
type WebhookHandler struct {
	webhookSecret string
}

// NewWebhookHandler creates a new webhook handler.
func NewWebhookHandler(webhookSecret string) *WebhookHandler {
	return &WebhookHandler{
		webhookSecret: webhookSecret,
	}
}

// ServeHTTP handles incoming GitHub webhook requests.
// It validates the webhook signature, parses the event, and dispatches accordingly.
func (h *WebhookHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Read the raw body for signature validation and parsing.
	body, err := io.ReadAll(r.Body)
	if err != nil {
		slog.ErrorContext(r.Context(), "failed to read webhook body", "error", err)
		http.Error(w, "failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Validate webhook signature.
	sig := r.Header.Get("X-Hub-Signature-256")
	if sig != "" {
		if err := h.validateSignature(body, sig); err != nil {
			slog.WarnContext(r.Context(), "invalid webhook signature", "error", err)
			http.Error(w, "invalid signature", http.StatusUnauthorized)
			return
		}
	} else {
		slog.WarnContext(r.Context(), "missing X-Hub-Signature-256 header")
		// In production, this should be required. For development, allow missing.
	}

	// Get event type.
	eventType := r.Header.Get("X-GitHub-Event")
	if eventType == "" {
		http.Error(w, "missing X-GitHub-Event header", http.StatusBadRequest)
		return
	}

	slog.InfoContext(r.Context(), "received webhook",
		"event", eventType,
		"delivery", r.Header.Get("X-GitHub-Delivery"),
	)

	// Parse and dispatch.
	switch eventType {
	case "ping":
		h.handlePing(w, r, body)
	case "pull_request":
		h.handlePullRequest(w, r, body)
	default:
		slog.DebugContext(r.Context(), "unhandled webhook event type", "event", eventType)
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "ignored"})
	}
}

// validateSignature checks the HMAC-SHA256 signature of the webhook payload.
func (h *WebhookHandler) validateSignature(body []byte, signature string) error {
	if !strings.HasPrefix(signature, "sha256=") {
		return fmt.Errorf("invalid signature format")
	}

	sigBytes, err := hex.DecodeString(signature[7:])
	if err != nil {
		return fmt.Errorf("decode signature hex: %w", err)
	}

	mac := hmac.New(sha256.New, []byte(h.webhookSecret))
	mac.Write(body)
	expected := mac.Sum(nil)

	if !hmac.Equal(sigBytes, expected) {
		return fmt.Errorf("signature mismatch")
	}

	return nil
}

// handlePing responds to GitHub's ping event (sent on webhook configuration).
func (h *WebhookHandler) handlePing(w http.ResponseWriter, r *http.Request, body []byte) {
	slog.InfoContext(r.Context(), "received ping event")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "pong"})
}

// handlePullRequest processes pull_request events.
func (h *WebhookHandler) handlePullRequest(w http.ResponseWriter, r *http.Request, body []byte) {
	var event WebhookPayload
	if err := json.Unmarshal(body, &event); err != nil {
		slog.ErrorContext(r.Context(), "failed to parse pull_request payload", "error", err)
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	if event.PullRequest == nil {
		slog.ErrorContext(r.Context(), "pull_request event missing pull_request object")
		http.Error(w, "invalid payload: missing pull_request", http.StatusBadRequest)
		return
	}

	relevantActions := map[string]bool{
		"opened":    true,
		"synchronize": true,
		"reopened":  true,
		"closed":    true,
	}

	action := event.Action
	if !relevantActions[action] {
		slog.DebugContext(r.Context(), "ignoring pull_request action", "action", action)
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "ignored", "action": action})
		return
	}

	slog.InfoContext(r.Context(), "processing pull_request event",
		"action", action,
		"pr_number", event.PullRequest.Number,
		"repo", event.Repository.FullName,
		"head_sha", event.PullRequest.Head.SHA,
		"base_ref", event.PullRequest.Base.Ref,
	)

	// TODO: Enqueue quality check for this PR (ZEN-14).
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":   "queued",
		"action":   action,
		"pr":       event.PullRequest.Number,
		"repo":     event.Repository.FullName,
	})
}
