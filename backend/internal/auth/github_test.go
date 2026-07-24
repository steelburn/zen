package auth

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"strings"
	"testing"
	"time"
)

// generateTestKey creates a PEM-encoded RSA key for testing.
func generateTestKey(t *testing.T) string {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	block := &pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(key),
	}
	var buf strings.Builder
	if err := pem.Encode(&buf, block); err != nil {
		t.Fatal(err)
	}
	return buf.String()
}

func TestNewAppTokenGenerator_ValidKey(t *testing.T) {
	pemKey := generateTestKey(t)
	gen, err := NewAppTokenGenerator("123456", pemKey)
	if err != nil {
		t.Fatalf("NewAppTokenGenerator() error = %v", err)
	}
	if gen == nil {
		t.Fatal("NewAppTokenGenerator() returned nil")
	}
}

func TestNewAppTokenGenerator_InvalidPEM(t *testing.T) {
	_, err := NewAppTokenGenerator("123456", "not-a-key")
	if err == nil {
		t.Fatal("NewAppTokenGenerator() expected error for invalid PEM")
	}
}

func TestNewAppTokenGenerator_EmptyKey(t *testing.T) {
	_, err := NewAppTokenGenerator("123456", "")
	if err == nil {
		t.Fatal("NewAppTokenGenerator() expected error for empty key")
	}
}

func TestGenerateToken_ProducesSignedJWT(t *testing.T) {
	pemKey := generateTestKey(t)
	gen, err := NewAppTokenGenerator("123456", pemKey)
	if err != nil {
		t.Fatal(err)
	}

	token, err := gen.GenerateToken(5 * time.Minute)
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	if token == "" {
		t.Fatal("GenerateToken() returned empty token")
	}

	// JWT has three parts separated by dots.
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		t.Fatalf("token has %d parts, expected 3", len(parts))
	}
}

func TestGenerateToken_DefaultsTTL(t *testing.T) {
	pemKey := generateTestKey(t)
	gen, err := NewAppTokenGenerator("123456", pemKey)
	if err != nil {
		t.Fatal(err)
	}

	// Zero TTL should use default (10 min).
	token, err := gen.GenerateToken(0)
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}
	if token == "" {
		t.Fatal("GenerateToken() returned empty token")
	}
}

func TestGenerateToken_CapsTTL(t *testing.T) {
	pemKey := generateTestKey(t)
	gen, err := NewAppTokenGenerator("123456", pemKey)
	if err != nil {
		t.Fatal(err)
	}

	// Over max TTL should be capped.
	token, err := gen.GenerateToken(30 * time.Minute)
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}
	if token == "" {
		t.Fatal("GenerateToken() returned empty token")
	}
}

func TestGenerateToken_DifferentAppIDs(t *testing.T) {
	pemKey := generateTestKey(t)
	gen1, _ := NewAppTokenGenerator("111", pemKey)
	gen2, _ := NewAppTokenGenerator("222", pemKey)

	token1, _ := gen1.GenerateToken(5 * time.Minute)
	token2, _ := gen2.GenerateToken(5 * time.Minute)

	if token1 == token2 {
		t.Fatal("tokens for different app IDs should differ")
	}
}

func TestParsePKCS8Key(t *testing.T) {
	// Generate PKCS8 key.
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	pkcs8Bytes, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		t.Fatal(err)
	}
	block := &pem.Block{
		Type:  "PRIVATE KEY",
		Bytes: pkcs8Bytes,
	}
	var buf strings.Builder
	if err := pem.Encode(&buf, block); err != nil {
		t.Fatal(err)
	}
	pemKey := buf.String()

	gen, err := NewAppTokenGenerator("123456", pemKey)
	if err != nil {
		t.Fatalf("NewAppTokenGenerator() with PKCS8 key error = %v", err)
	}

	token, err := gen.GenerateToken(5 * time.Minute)
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}
	if token == "" {
		t.Fatal("GenerateToken() returned empty token")
	}
}
