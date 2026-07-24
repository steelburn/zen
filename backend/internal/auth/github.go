// Package auth provides GitHub App JWT authentication utilities.
//
// It handles:
// - Generating signed JWTs for GitHub App authentication
// - Exchanging JWTs for installation access tokens
// - Validating GitHub webhook payloads
package auth

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// AppTokenGenerator creates signed JWTs for GitHub App authentication.
type AppTokenGenerator struct {
	appID      string
	privateKey *rsa.PrivateKey
}

// NewAppTokenGenerator creates a new generator from a PEM-encoded private key.
func NewAppTokenGenerator(appID string, privateKeyPEM string) (*AppTokenGenerator, error) {
	block, _ := pem.Decode([]byte(privateKeyPEM))
	if block == nil {
		return nil, fmt.Errorf("failed to decode PEM block from private key")
	}

	key, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		// Try PKCS8.
		keyPKCS8, err := x509.ParsePKCS8PrivateKey(block.Bytes)
		if err != nil {
			return nil, fmt.Errorf("parse private key: %w", err)
		}
		var ok bool
		key, ok = keyPKCS8.(*rsa.PrivateKey)
		if !ok {
			return nil, fmt.Errorf("private key is not RSA")
		}
	}

	return &AppTokenGenerator{
		appID:      appID,
		privateKey: key,
	}, nil
}

// GenerateToken creates a signed JWT for GitHub App authentication.
// The token is valid for up to 10 minutes (GitHub's max).
func (g *AppTokenGenerator) GenerateToken(ttl time.Duration) (string, error) {
	if ttl <= 0 || ttl > 10*time.Minute {
		ttl = 10 * time.Minute
	}

	now := time.Now()
	claims := &jwt.RegisteredClaims{
		Issuer:    g.appID,
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	return token.SignedString(g.privateKey)
}
