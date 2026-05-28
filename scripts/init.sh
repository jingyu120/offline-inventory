#!/usr/bin/env bash
# ──────────────────────────────────────────────────
# Init Script — Fresh Clone Setup
# Run this once after `git clone` to make `npm run dev` work.
# Unlike clean-setup.sh this script is NON-DESTRUCTIVE:
#   - It will NOT wipe existing node_modules if they already exist.
#   - It will NOT drop the database or existing Docker volumes.
#   - It WILL start the Docker container if it is not running.
#   - It WILL push the schema if the DB tables are missing.
# ──────────────────────────────────────────────────
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1" >&2; }
step() { echo -e "\n${CYAN}${BOLD}$1${NC}"; }

echo -e "${BOLD}🇲🇲  Burma Inventory — First-Time Setup${NC}"
echo -e "   Non-destructive init for a freshly cloned repo.\n"

# ── 1. Prerequisites check ────────────────────────
step "1/5  Checking prerequisites..."

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    err "Required tool not found: $1. Please install it and re-run this script."
    exit 1
  fi
  log "$1 found ($(command -v "$1"))"
}

check_cmd node
check_cmd npm
check_cmd docker

NODE_MAJOR=$(node -e "process.stdout.write(process.version.replace('v','').split('.')[0])")
if [ "$NODE_MAJOR" -lt 22 ]; then
  err "Node.js >= 22 is required (found $(node --version)). Check .nvmrc and use nvm."
  exit 1
fi
log "Node $(node --version) — OK"

# ── 2. Install root dependencies ──────────────────
step "2/5  Installing all workspace dependencies..."
if [ -d "node_modules" ]; then
  warn "node_modules already exists — skipping install (delete node_modules to force reinstall)"
else
  npm install --no-audit
  log "All workspace dependencies installed (root + mobile-web, shared-types, ui-components, sync-server)"
fi

# ── 3. Start Docker database container ───────────
step "3/5  Ensuring database container is running..."
CONTAINER="burma_inventory_db"
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  log "Container ${CONTAINER} is already running"
else
  echo "🐳 Starting database container..."
  docker compose up -d
  log "Database container started"
fi

# Wait for Postgres to accept connections (up to 45 s)
echo "⏳ Waiting for PostgreSQL to be ready..."
WAIT_LIMIT=45
count=0
until docker exec "$CONTAINER" pg_isready -U postgres -d inventory_db >/dev/null 2>&1; do
  sleep 1
  count=$((count + 1))
  if [ "$count" -ge "$WAIT_LIMIT" ]; then
    err "PostgreSQL did not become ready within ${WAIT_LIMIT}s."
    err "Check 'docker compose logs ${CONTAINER}' for details."
    exit 1
  fi
done
log "PostgreSQL is ready"

# ── 4. Push database schema ───────────────────────
step "4/5  Applying database schema (Drizzle push)..."
# Check if the core 'items' table already exists to skip redundant push
TABLE_EXISTS=$(docker exec "$CONTAINER" psql -U postgres -d inventory_db -tAc \
  "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='items');" 2>/dev/null || echo "f")

if [ "$TABLE_EXISTS" = "t" ]; then
  warn "Schema tables already exist — running push anyway to apply any new migrations"
fi

DB_URL="postgresql://postgres:postgres@localhost:5433/inventory_db?schema=public"
DATABASE_URL="$DB_URL" npx drizzle-kit push --config=drizzle.config.ts --force
log "Schema applied"

# ── 5. Initial server build ───────────────────────
step "5/5  Running initial sync-server build..."
if [ -d "dist/sync-server" ]; then
  warn "dist/sync-server already exists — skipping build (delete dist/ to force rebuild)"
else
  npx nx run sync-server:build:development
  log "Initial build complete"
fi

# ── Done ──────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}🎉 Setup complete!${NC}"
echo -e "   Run ${YELLOW}npm run dev${NC} to start the development environment."
echo ""
