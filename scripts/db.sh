#!/usr/bin/env bash
# ──────────────────────────────────────────────────
# Database Management Script
# Usage: ./scripts/db.sh [command]
#   reset  - Wipe database and re-apply schema
#   wipe   - Drop all tables
#   push   - Apply Drizzle schema
# ──────────────────────────────────────────────────
set -euo pipefail

CONTAINER="burma_inventory_db"
DB_USER="postgres"
DB_NAME="inventory_db"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1" >&2; }

# ── Container Engine Auto-Detection ────────────
CONTAINER_ENGINE=""
COMPOSE_CMD=""

if command -v podman &>/dev/null; then
  CONTAINER_ENGINE="podman"
elif command -v docker &>/dev/null; then
  CONTAINER_ENGINE="docker"
else
  err "Neither 'podman' nor 'docker' CLI found. Please install a container engine."
  exit 1
fi

# Detect compose provider
if command -v podman-compose &>/dev/null && [ "$CONTAINER_ENGINE" = "podman" ]; then
  COMPOSE_CMD="podman-compose"
elif "$CONTAINER_ENGINE" compose version &>/dev/null; then
  COMPOSE_CMD="$CONTAINER_ENGINE compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE_CMD="docker-compose"
else
  COMPOSE_CMD="$CONTAINER_ENGINE compose"
fi

ensure_containers() {
  IS_RUNNING=false
  if [ "$CONTAINER_ENGINE" = "podman" ]; then
    if podman ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
      IS_RUNNING=true
    fi
  else
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
      IS_RUNNING=true
    fi
  fi

  if [ "$IS_RUNNING" = false ]; then
    warn "Container ${CONTAINER} is not running. Starting containers..."
    $COMPOSE_CMD up -d
    sleep 3
    log "Containers started"
  fi
}

cmd_wipe() {
  ensure_containers
  "$CONTAINER_ENGINE" exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
    -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" \
    > /dev/null 2>&1
  log "Database wiped (schema public dropped and recreated)"
}

cmd_push() {
  ensure_containers
  echo "Applying Drizzle schema..."
  DB_URL="postgresql://postgres:postgres@localhost:5433/inventory_db?schema=public"
  DATABASE_URL="$DB_URL" npx drizzle-kit push --config=drizzle.config.ts --force
  log "Schema applied and fully seeded via Drizzle-kit"
}

cmd_reset() {
  cmd_wipe
  cmd_push
  log "Database fully reset and seeded"
}

cmd_fresh() {
  ensure_containers
  cmd_reset
}

# ── Main ─────────────────────────────────────────
case "${1:-help}" in
  ensure)   ensure_containers ;;
  wipe)     cmd_wipe ;;
  push)     cmd_push ;;
  reset)    cmd_reset ;;
  fresh)    cmd_fresh ;;
  *)
    echo "Usage: $0 {ensure|wipe|push|reset|fresh}"
    echo ""
    echo "  ensure - Start container engine if not running"
    echo "  wipe   - Drop all tables in the database"
    echo "  push   - Push Drizzle schema and seed master data"
    echo "  reset  - Wipe database + push schema + seed data"
    echo "  fresh  - Ensure containers are running + reset"
    exit 1
    ;;
esac
