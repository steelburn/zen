#!/usr/bin/env bash
# Run npm in a clean environment to avoid Paperclip's npm_config_* pollution.
# Usage: ./scripts/run-npm.sh <npm-args...>

DIR="$(cd "$(dirname "$0")/.." && pwd)"
exec env -i HOME="$HOME" PATH="/usr/bin:/bin:/usr/local/bin" npm "$@"
