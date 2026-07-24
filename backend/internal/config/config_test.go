package config

import (
	"os"
	"testing"
)

func TestLoad_Defaults(t *testing.T) {
	t.Setenv("DATABASE_DSN", "postgres://localhost:5432/zen")
	t.Setenv("GITHUB_APP_ID", "123456")
	t.Setenv("GITHUB_APP_PRIVATE_KEY", "fake-key")
	t.Setenv("GITHUB_WEBHOOK_SECRET", "fake-secret")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.Port != 8080 {
		t.Errorf("Port = %d, want 8080", cfg.Port)
	}
	if cfg.Database.DSN != "postgres://localhost:5432/zen" {
		t.Errorf("DSN = %q, want postgres://localhost:5432/zen", cfg.Database.DSN)
	}
	if cfg.GitHub.AppID != "123456" {
		t.Errorf("AppID = %q, want 123456", cfg.GitHub.AppID)
	}
	if cfg.GitHub.PrivateKey != "fake-key" {
		t.Errorf("PrivateKey = %q, want fake-key", cfg.GitHub.PrivateKey)
	}
	if cfg.GitHub.WebhookSecret != "fake-secret" {
		t.Errorf("WebhookSecret = %q, want fake-secret", cfg.GitHub.WebhookSecret)
	}
}

func TestLoad_CustomPort(t *testing.T) {
	t.Setenv("PORT", "3000")
	t.Setenv("DATABASE_DSN", "postgres://localhost:5432/zen")
	t.Setenv("GITHUB_APP_ID", "123456")
	t.Setenv("GITHUB_APP_PRIVATE_KEY", "fake-key")
	t.Setenv("GITHUB_WEBHOOK_SECRET", "fake-secret")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.Port != 3000 {
		t.Errorf("Port = %d, want 3000", cfg.Port)
	}
}

func TestLoad_MissingDSN(t *testing.T) {
	t.Setenv("GITHUB_APP_ID", "123456")
	t.Setenv("GITHUB_APP_PRIVATE_KEY", "fake-key")
	t.Setenv("GITHUB_WEBHOOK_SECRET", "fake-secret")

	_, err := Load()
	if err == nil {
		t.Fatal("Load() expected error for missing DATABASE_DSN")
	}
}

func TestLoad_MissingAppID(t *testing.T) {
	t.Setenv("DATABASE_DSN", "postgres://localhost:5432/zen")
	t.Setenv("GITHUB_APP_PRIVATE_KEY", "fake-key")
	t.Setenv("GITHUB_WEBHOOK_SECRET", "fake-secret")

	_, err := Load()
	if err == nil {
		t.Fatal("Load() expected error for missing GITHUB_APP_ID")
	}
}

func TestLoad_MissingPrivateKey(t *testing.T) {
	t.Setenv("DATABASE_DSN", "postgres://localhost:5432/zen")
	t.Setenv("GITHUB_APP_ID", "123456")
	t.Setenv("GITHUB_WEBHOOK_SECRET", "fake-secret")

	_, err := Load()
	if err == nil {
		t.Fatal("Load() expected error for missing private key")
	}
}

func TestLoad_MissingWebhookSecret(t *testing.T) {
	t.Setenv("DATABASE_DSN", "postgres://localhost:5432/zen")
	t.Setenv("GITHUB_APP_ID", "123456")
	t.Setenv("GITHUB_APP_PRIVATE_KEY", "fake-key")

	_, err := Load()
	if err == nil {
		t.Fatal("Load() expected error for missing webhook secret")
	}
}

func TestLoad_PrivateKeyFromFile(t *testing.T) {
	tmpDir := t.TempDir()
	keyPath := tmpDir + "/private-key.pem"
	if err := os.WriteFile(keyPath, []byte("file-based-key"), 0600); err != nil {
		t.Fatal(err)
	}

	t.Setenv("DATABASE_DSN", "postgres://localhost:5432/zen")
	t.Setenv("GITHUB_APP_ID", "123456")
	t.Setenv("GITHUB_APP_PRIVATE_KEY_PATH", keyPath)
	t.Setenv("GITHUB_WEBHOOK_SECRET", "fake-secret")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.GitHub.PrivateKey != "file-based-key" {
		t.Errorf("PrivateKey = %q, want file-based-key", cfg.GitHub.PrivateKey)
	}
}

func TestLoad_PrivateKeyDirectOverridesFile(t *testing.T) {
	tmpDir := t.TempDir()
	keyPath := tmpDir + "/private-key.pem"
	if err := os.WriteFile(keyPath, []byte("file-based-key"), 0600); err != nil {
		t.Fatal(err)
	}

	t.Setenv("DATABASE_DSN", "postgres://localhost:5432/zen")
	t.Setenv("GITHUB_APP_ID", "123456")
	t.Setenv("GITHUB_APP_PRIVATE_KEY", "direct-key")
	t.Setenv("GITHUB_APP_PRIVATE_KEY_PATH", keyPath)
	t.Setenv("GITHUB_WEBHOOK_SECRET", "fake-secret")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.GitHub.PrivateKey != "direct-key" {
		t.Errorf("PrivateKey = %q, want direct-key", cfg.GitHub.PrivateKey)
	}
}

func TestEnvInt(t *testing.T) {
	tests := []struct {
		name       string
		envVal     string
		defaultVal int
		want       int
	}{
		{"set", "42", 0, 42},
		{"unset", "", 10, 10},
		{"invalid", "abc", 5, 5},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.envVal != "" {
				t.Setenv("TEST_INT", tt.envVal)
			} else {
				os.Unsetenv("TEST_INT")
			}
			got := envInt("TEST_INT", tt.defaultVal)
			if got != tt.want {
				t.Errorf("envInt() = %d, want %d", got, tt.want)
			}
		})
	}
}

func TestEnvBool(t *testing.T) {
	tests := []struct {
		name       string
		envVal     string
		defaultVal bool
		want       bool
	}{
		{"true", "true", false, true},
		{"false", "false", true, false},
		{"unset", "", true, true},
		{"invalid", "maybe", false, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.envVal != "" {
				t.Setenv("TEST_BOOL", tt.envVal)
			} else {
				os.Unsetenv("TEST_BOOL")
			}
			got := envBool("TEST_BOOL", tt.defaultVal)
			if got != tt.want {
				t.Errorf("envBool() = %v, want %v", got, tt.want)
			}
		})
	}
}
