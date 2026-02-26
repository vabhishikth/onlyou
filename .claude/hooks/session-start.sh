#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Install dependencies (pnpm monorepo)
pnpm install

# Build the shared package (other workspaces depend on it)
pnpm build:shared

# Generate Prisma client for the backend
pnpm --filter backend run db:generate
