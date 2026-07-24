#!/usr/bin/env bash
# setup-branch-protection.sh
#
# Configure branch protection rules for the main branch on a GitHub repository.
# This script requires `gh` CLI to be authenticated.
#
# Usage: ./scripts/setup-branch-protection.sh [owner/repo]
#   If no argument is given, uses the remote origin of the current git repo.

set -euo pipefail

REPO="${1:-}"

if [ -z "$REPO" ]; then
  # Try to detect from git remote
  REMOTE_URL="$(git config --get remote.origin.url || true)"
  if [ -z "$REMOTE_URL" ]; then
    echo "Error: No repo specified and no git remote origin found."
    echo "Usage: $0 [owner/repo]"
    exit 1
  fi
  # Parse owner/repo from git URL (supports both git@ and https://)
  REPO="$(echo "$REMOTE_URL" | sed -E 's|.*[/:]([^/]+/[^.]+)(\.git)?$|\1|')"
fi

echo "==> Configuring branch protection for $REPO (main branch)"

# Enable branch protection with required status checks
# This enforces:
#   - Require PR reviews before merging
#   - Require status checks to pass
#   - Require branches to be up to date
#   - Include administrators

gh api "repos/$REPO/branches/main/protection" \
  --method PUT \
  --silent \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "CI / TypeScript type checking",
      "CI / ESLint",
      "CI / Prettier format check",
      "CI / Commit message lint",
      "CI / Git hooks integrity",
      "CI / Unit tests",
      "CI / Build"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": true,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": true
}
JSON

echo "==> Branch protection enabled successfully!"
echo ""
echo "The following checks are now required on the main branch:"
echo "  - CI / TypeScript type checking"
echo "  - CI / ESLint"
echo "  - CI / Prettier format check"
echo "  - CI / Commit message lint"
echo "  - CI / Git hooks integrity"
echo "  - CI / Unit tests"
echo "  - CI / Build"
echo ""
echo "To verify: https://github.com/$REPO/settings/branches"
