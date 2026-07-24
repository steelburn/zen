// Package db provides database connection management and migration support.
package db

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"log/slog"
	"time"

	"github.com/zen-inc/zen-server/internal/config"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

// Connect opens a Postgres connection pool and verifies connectivity.
func Connect(ctx context.Context, cfg config.DatabaseConfig) (*sql.DB, error) {
	db, err := sql.Open("postgres", cfg.DSN)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	db.SetMaxOpenConns(cfg.MaxOpenConns)
	db.SetMaxIdleConns(cfg.MaxIdleConns)
	db.SetConnMaxLifetime(cfg.ConnMaxLifetime)

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return db, nil
}

// RunMigrations applies all pending SQL migrations from the embedded filesystem.
// It creates the schema_migrations tracking table if it doesn't exist.
func RunMigrations(ctx context.Context, db *sql.DB) error {
	slog.InfoContext(ctx, "running database migrations")

	// Create migrations tracking table.
	if _, err := db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version     INTEGER PRIMARY KEY,
			name        TEXT NOT NULL,
			applied_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			checksum    TEXT NOT NULL DEFAULT ''
		)
	`); err != nil {
		return fmt.Errorf("create schema_migrations table: %w", err)
	}

	// Read and apply each migration.
	entries, err := migrationsFS.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("read migrations directory: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		slog.InfoContext(ctx, "applying migration", "file", entry.Name())

		content, err := migrationsFS.ReadFile("migrations/" + entry.Name())
		if err != nil {
			return fmt.Errorf("read migration %s: %w", entry.Name(), err)
		}

		// Use a transaction per migration.
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			return fmt.Errorf("begin tx for %s: %w", entry.Name(), err)
		}

		if _, err := tx.ExecContext(ctx, string(content)); err != nil {
			tx.Rollback()
			return fmt.Errorf("apply migration %s: %w", entry.Name(), err)
		}

		// Record migration.
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO schema_migrations (version, name) VALUES ($1, $2)
			 ON CONFLICT (version) DO NOTHING`,
			entry.Name(), entry.Name(),
		); err != nil {
			tx.Rollback()
			return fmt.Errorf("record migration %s: %w", entry.Name(), err)
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("commit migration %s: %w", entry.Name(), err)
		}

		slog.InfoContext(ctx, "migration applied", "file", entry.Name())
	}

	return nil
}

// Close closes the database connection pool with a grace period.
func Close(db *sql.DB, timeout time.Duration) error {
	if db == nil {
		return nil
	}
	done := make(chan struct{})
	go func() {
		db.Close()
		close(done)
	}()
	select {
	case <-done:
		return nil
	case <-time.After(timeout):
		return fmt.Errorf("database close timed out after %v", timeout)
	}
}
