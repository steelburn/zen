-- Migration 001: Initial schema for ZEN service.
--
-- Creates core tables: installations, repos, checks, and check annotations.

-- Repositories registered with ZEN.
CREATE TABLE IF NOT EXISTS repos (
    id              BIGSERIAL PRIMARY KEY,
    github_id       BIGINT NOT NULL UNIQUE,
    owner           TEXT NOT NULL,
    name            TEXT NOT NULL,
    full_name       TEXT NOT NULL,
    default_branch  TEXT NOT NULL DEFAULT 'main',
    is_private      BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- GitHub App installations (one per org/user that installs ZEN).
CREATE TABLE IF NOT EXISTS installations (
    id                  BIGSERIAL PRIMARY KEY,
    github_id           BIGINT NOT NULL UNIQUE,
    account_login       TEXT NOT NULL,
    account_type        TEXT NOT NULL,  -- 'User' or 'Organization'
    account_id          BIGINT NOT NULL,
    repo_selection      TEXT NOT NULL DEFAULT 'selected',  -- 'selected' or 'all'
    permissions         JSONB NOT NULL DEFAULT '{}',
    events              TEXT[] NOT NULL DEFAULT '{}',
    suspended_at        TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Installations <-> Repos mapping.
CREATE TABLE IF NOT EXISTS installation_repos (
    id                  BIGSERIAL PRIMARY KEY,
    installation_id     BIGINT NOT NULL REFERENCES installations(id) ON DELETE CASCADE,
    repo_id             BIGINT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(installation_id, repo_id)
);

-- Quality checks run on pull requests.
CREATE TABLE IF NOT EXISTS checks (
    id                  BIGSERIAL PRIMARY KEY,
    repo_id             BIGINT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    installation_id     BIGINT NOT NULL REFERENCES installations(id) ON DELETE CASCADE,
    pull_request_number INTEGER NOT NULL,
    sha                 TEXT NOT NULL,
    check_run_id        BIGINT,  -- GitHub Check Run ID
    status              TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed'
    conclusion          TEXT,  -- 'success', 'failure', 'neutral', 'cancelled', etc.
    coverage_delta      REAL,
    lint_errors_added   INTEGER,
    lint_errors_removed INTEGER,
    complexity_violations INTEGER DEFAULT 0,
    started_at          TIMESTAMP WITH TIME ZONE,
    completed_at        TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Individual annotations within a check (file-level details).
CREATE TABLE IF NOT EXISTS check_annotations (
    id                  BIGSERIAL PRIMARY KEY,
    check_id            BIGINT NOT NULL REFERENCES checks(id) ON DELETE CASCADE,
    file_path           TEXT NOT NULL,
    line_start          INTEGER NOT NULL,
    line_end            INTEGER NOT NULL,
    annotation_level    TEXT NOT NULL,  -- 'notice', 'warning', 'failure'
    message             TEXT NOT NULL,
    title               TEXT,
    raw_details         TEXT,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Per-repo configuration (cached from .zen.yml).
CREATE TABLE IF NOT EXISTS repo_configs (
    id                  BIGSERIAL PRIMARY KEY,
    repo_id             BIGINT NOT NULL UNIQUE REFERENCES repos(id) ON DELETE CASCADE,
    config_yaml         TEXT NOT NULL,
    parsed_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns.
CREATE INDEX IF NOT EXISTS idx_checks_repo_id ON checks(repo_id);
CREATE INDEX IF NOT EXISTS idx_checks_installation_id ON checks(installation_id);
CREATE INDEX IF NOT EXISTS idx_checks_status ON checks(status);
CREATE INDEX IF NOT EXISTS idx_checks_sha ON checks(sha);
CREATE INDEX IF NOT EXISTS idx_check_annotations_check_id ON check_annotations(check_id);
CREATE INDEX IF NOT EXISTS idx_installation_repos_installation_id ON installation_repos(installation_id);
CREATE INDEX IF NOT EXISTS idx_installation_repos_repo_id ON installation_repos(repo_id);
