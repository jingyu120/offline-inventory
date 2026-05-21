#!/usr/bin/env bash
# ──────────────────────────────────────────────────
# Database Management Script
# Usage: ./scripts/db.sh [command]
#   reset  - Wipe database and re-apply schema
#   wipe   - Drop all tables
#   push   - Apply Prisma schema
#   seed   - Insert demo data (TODO)
# ──────────────────────────────────────────────────
set -euo pipefail

CONTAINER="burma_inventory_db"
DB_USER="postgres"
DB_NAME="inventory_db"
SCHEMA_PATH="sync-server/prisma/schema.prisma"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1" >&2; }

ensure_docker() {
  if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    warn "Container ${CONTAINER} not running. Starting..."
    docker compose up -d
    sleep 3
    log "Container started"
  fi
}

cmd_wipe() {
  ensure_docker
  docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
    -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" \
    > /dev/null 2>&1
  log "Database wiped (schema public dropped and recreated)"
}

cmd_push() {
  ensure_docker
  # Use docker exec to run SQL directly — avoids Prisma CLI auth issues on macOS
  # Generate SQL from Prisma schema
  echo "Applying schema via Prisma..."

  # Explicit URL with gssencmode=disable bypasses macOS Kerberos/GSSAPI auth failures
  DB_URL="postgresql://postgres:postgres@localhost:5433/inventory_db?schema=public&gssencmode=disable"

  npx prisma db push \
    --schema "$SCHEMA_PATH" \
    --url "$DB_URL" \
    --accept-data-loss 2>&1 || {
    warn "Prisma db push failed (known macOS Kerberos issue)."
    warn "Falling back to docker exec method..."

    # Generate a migration SQL and apply it via docker exec
    npx prisma migrate diff \
      --from-empty \
      --to-schema "$SCHEMA_PATH" \
      --url "$DB_URL" \
      --script \
      | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME"
    log "Schema applied via SQL fallback"
    return
  }
  log "Schema pushed via Prisma"
}

cmd_generate() {
  npx prisma generate --schema "$SCHEMA_PATH"
  log "Prisma client generated"
}

cmd_reset() {
  cmd_wipe
  cmd_push
  cmd_generate
  log "Database fully reset and ready"
}

cmd_fresh() {
  ensure_docker
  cmd_reset
}

# ── Main ─────────────────────────────────────────
case "${1:-help}" in
  wipe)     cmd_wipe ;;
  push)     cmd_push ;;
  generate) cmd_generate ;;
  reset)    cmd_reset ;;
  fresh)    cmd_fresh ;;
  *)
    echo "Usage: $0 {wipe|push|generate|reset|fresh}"
    echo ""
    echo "  wipe     - Drop all tables in the database"
    echo "  push     - Apply Prisma schema to database"
    echo "  generate - Generate Prisma client"
    echo "  reset    - wipe + push + generate"
    echo "  fresh    - Ensure Docker is up + reset"
    exit 1
    ;;
esac
