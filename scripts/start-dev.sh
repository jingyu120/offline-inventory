#!/usr/bin/env bash
# ──────────────────────────────────────────────────
# Development Server Startup Script
# Usage: ./scripts/start-dev.sh
# ──────────────────────────────────────────────────
set -euo pipefail

# Ensure we are in the project root
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1" >&2; }

echo "🚀 Starting Burma Inventory Development Environment..."

# 1. Ensure Docker Postgres is running AND the schema exists (pushes if missing)
./scripts/db.sh ensure-schema

# 2. Check and terminate conflicting processes on ports 8081 and 3000
echo "🧹 Cleaning up port conflicts (ports 3000, 8081)..."
lsof -ti:8081,3000 | xargs kill -9 2>/dev/null || true

# 3. Compile the sync-server once so dist/ exists
echo "🏗️  Pre-building sync-server (required for initial launch)..."
npx nx run sync-server:build:development

# 4. Start watcher and run servers
echo "📡 Launching development services..."

# Disable interactive terminal UI to prevent garbled/messy terminal rendering
export NX_TUI=false

# We do NOT set CI=1 here because it disables Metro's file watcher and hot reloading.
# To pick up dev changes without restarting the app, Metro must run in watch mode.
# export CI=1

# Set trap to kill all background jobs spawned by this script on exit
trap 'echo -e "\n🛑 Stopping all services..."; kill $(jobs -p) 2>/dev/null || true' EXIT

# Start backend bundler in the background
npx nx run sync-server:build --configuration=watch &

# Start backend runtime (nodemon) and frontend dev server.
# `stream-without-prefixes` keeps live streaming but drops the per-line
# "sync-server:" / "mobile-web:" prefixes that wrap awkwardly in the terminal.
npx nx run-many -t serve -p sync-server mobile-web --output-style=stream-without-prefixes


