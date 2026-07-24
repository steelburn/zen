// Package github provides a client for interacting with the GitHub API
// using GitHub App authentication.
package github

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"time"
)

const (
	// apiBase is the GitHub API base URL.
	apiBase = "https://api.github.com"

	// defaultTimeout is the default HTTP client timeout.
	defaultTimeout = 30 * time.Second
)

// Client communicates with the GitHub API.
type Client struct {
	httpClient *http.Client
	baseURL    string
}

// InstallationTokenResponse represents the response from creating an installation token.
type InstallationTokenResponse struct {
	Token       string    `json:"token"`
	ExpiresAt   time.Time `json:"expires_at"`
	Permissions map[string]string `json:"permissions"`
}

// ErrorResponse represents a GitHub API error.
type ErrorResponse struct {
	Message          string `json:"message"`
	DocumentationURL string `json:"documentation_url"`
	Status           string `json:"status"`
}

func (e *ErrorResponse) Error() string {
	return fmt.Sprintf("github api error: %s (status: %s)", e.Message, e.Status)
}

// TokenProvider is an interface for obtaining a JWT token for GitHub App auth.
type TokenProvider interface {
	GenerateToken(ttl time.Duration) (string, error)
}

// NewClient creates a new GitHub API client.
func NewClient(timeout time.Duration) *Client {
	if timeout <= 0 {
		timeout = defaultTimeout
	}
	return &Client{
		httpClient: &http.Client{Timeout: timeout},
		baseURL:    apiBase,
	}
}

// CreateInstallationToken exchanges an app JWT for an installation access token.
func (c *Client) CreateInstallationToken(ctx context.Context, jwtToken string, installationID int64) (*InstallationTokenResponse, error) {
	u := fmt.Sprintf("%s/app/installations/%d/access_tokens", c.baseURL, installationID)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+jwtToken)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "zen-quality-gate/0.1.0")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("execute request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response body: %w", err)
	}

	if resp.StatusCode != http.StatusCreated {
		var errResp ErrorResponse
		if err := json.Unmarshal(body, &errResp); err != nil {
			return nil, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(body))
		}
		errResp.Status = resp.Status
		return nil, &errResp
	}

	var tokenResp InstallationTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	return &tokenResp, nil
}

// DoRequest performs an authenticated request to the GitHub API.
func (c *Client) DoRequest(ctx context.Context, method, path string, installationToken string, body interface{}) ([]byte, error) {
	u, err := url.JoinPath(c.baseURL, path)
	if err != nil {
		return nil, fmt.Errorf("join path: %w", err)
	}

	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			return nil, fmt.Errorf("encode request body: %w", err)
		}
	}

	req, err := http.NewRequestWithContext(ctx, method, u, &buf)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+installationToken)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "zen-quality-gate/0.1.0")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("execute request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response body: %w", err)
	}

	if resp.StatusCode >= 400 {
		slog.WarnContext(ctx, "github api request failed",
			"method", method,
			"path", path,
			"status", resp.Status,
			"body", string(respBody),
		)
		return nil, fmt.Errorf("github api error: %s (status: %d)", resp.Status, resp.StatusCode)
	}

	return respBody, nil
}
