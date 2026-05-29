#!/usr/bin/env bash
# ──────────────────────────────────────────────────
# Unified Setup & Reset Script — Burma Inventory
# Handles initial machine setup as well as full project resets.
# Detects and works with both Podman and Docker seamlessly.
# ──────────────────────────────────────────────────
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1" >&2; }
step() { echo -e "\n${CYAN}${BOLD}▸ $1${NC}"; }

show_help() {
  echo -e "${BOLD}🇲🇲  Burma Inventory — Unified System Setup${NC}"
  echo "Usage: ./scripts/setup.sh [options]"
  echo ""
  echo "Options:"
  echo "  -r, --reset    Destructively wipes databases, container volumes, node_modules, and rebuilds everything fresh"
  echo "  -y, --yes      Bypasses the confirmation prompt during a reset"
  echo "  -h, --help     Displays this help menu"
  echo ""
  echo "Examples:"
  echo "  ./scripts/setup.sh          # Idempotent setup (safe for daily use)"
  echo "  ./scripts/setup.sh --reset  # Full clean start (destructive)"
  echo ""
}

# ── 1. Parse Arguments ────────────────────────────
RESET_MODE=false
FORCE_YES=false

for arg in "$@"; do
  case $arg in
    --reset|-r)
      RESET_MODE=true
      shift
      ;;
    -y|--yes)
      FORCE_YES=true
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      # Ignore other unknown args
      ;;
  esac
done

echo -e "${BOLD}🇲🇲  Burma Inventory — Unified System Setup${NC}"
echo -e "   One script to initialize or reset your environment.\n"

# ── 2. Create Default .env File if Missing ────────
if [ ! -f ".env" ]; then
  step "Creating default .env file..."
  cat <<EOF > .env
# ──────────────────────────────────────────────────
# Burma Inventory — Environment Configuration
# ──────────────────────────────────────────────────

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/inventory_db?schema=public"

# Sync Server
SYNC_SERVER_PORT=3000
SYNC_SERVER_PREFIX=api
NX_TUI=false
REDIS_URL="redis://localhost:6379"

# Mobile Client
SYNC_API_URL=http://localhost:3000/api/sync
EOF
  log ".env file created with correct development defaults"
fi

# ── 3. Container Engine Auto-Detection ────────────
CONTAINER_ENGINE=""
COMPOSE_CMD=""

if command -v podman &>/dev/null; then
  CONTAINER_ENGINE="podman"
elif command -v docker &>/dev/null; then
  CONTAINER_ENGINE="docker"
else
  err "Neither 'podman' nor 'docker' CLI found. Please install a container engine and re-run."
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

log "Container engine detected: $CONTAINER_ENGINE ($(command -v "$CONTAINER_ENGINE"))"
log "Compose tool detected: $COMPOSE_CMD"

# ── 4. Podman Machine Check (macOS specific) ──────
if [ "$CONTAINER_ENGINE" = "podman" ]; then
  # On macOS, check if Podman machine needs to be started
  if uname -s | grep -q "Darwin"; then
    if podman machine list 2>/dev/null | grep -q -E "podman-machine|applehv|qemu"; then
      if ! podman machine list 2>/dev/null | grep -q "Currently running"; then
        step "Podman machine is stopped. Starting Podman virtual machine..."
        podman machine start || warn "Could not start Podman machine automatically. Make sure it is active."
      else
        log "Podman machine is already running"
      fi
    fi
  fi
fi

# ── 5. Helper function to wait for Database ──────
wait_for_db() {
  local container_name="burma_inventory_db"
  echo -n "⏳ Waiting for PostgreSQL to be ready"
  local wait_limit=45
  local count=0
  until "$CONTAINER_ENGINE" exec "$container_name" pg_isready -U postgres -d inventory_db >/dev/null 2>&1; do
    echo -n "."
    sleep 1
    count=$((count + 1))
    if [ "$count" -ge "$wait_limit" ]; then
      echo ""
      err "PostgreSQL did not become ready within ${wait_limit}s."
      echo "----------------------------------------"
      echo "Latest container logs:"
      "$CONTAINER_ENGINE" logs "$container_name" --tail 30 || true
      echo "----------------------------------------"
      exit 1
    fi
  done
  echo " (Connected!)"
  log "PostgreSQL is ready"
}

# ── 6. Handle Destructive Reset Mode ──────────────
if [ "$RESET_MODE" = true ]; then
  step "⚠️  Destructive Reset Requested"
  echo -e "This action is destructive and will:"
  echo -e "  - Stop local databases and DELETE container volumes (WIPING ALL LOCAL DATA)"
  echo -e "  - Delete all built files and NX temporary files (dist, .nx, tmp)"
  echo -e "  - Delete and reinstall all node_modules"
  echo -e "  - Rebuild the application and database schemas from scratch"
  echo ""

  if [ "$FORCE_YES" = false ]; then
    read -p "Are you absolutely sure you want to proceed? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Aborted."
      exit 0
    fi
  fi

  step "1/5  Wiping containers and persistent database volumes..."
  $COMPOSE_CMD down -v --remove-orphans || true
  log "Containers and database volumes wiped"

  step "2/5  Cleaning built directories, caches, and node_modules..."
  rm -rf dist .nx tmp node_modules package-lock.json mobile-web/node_modules mobile-web/package-lock.json metro-debug.log
  log "Cleaned build artifacts and node_modules"

  step "3/5  Installing all workspace dependencies..."
  npm install --no-audit
  log "Clean npm install completed"

  step "4/5  Starting database containers cleanly..."
  $COMPOSE_CMD up -d
  log "Database containers started"

  # Wait for database container to be ready
  wait_for_db

  step "5/5  Applying database schema & seeding master data..."
  DB_URL="postgresql://postgres:postgres@localhost:5433/inventory_db?schema=public"
  DATABASE_URL="$DB_URL" npx drizzle-kit push --config=drizzle.config.ts --force
  log "Drizzle database schema pushed and fully seeded"

  echo ""
  echo -e "${GREEN}${BOLD}🎉 Reset & Setup complete!${NC}"
  echo -e "   Run ${YELLOW}npm run dev${NC} to start the development environment."
  echo ""
  exit 0
fi

# ── 7. Non-Destructive Initial Setup ─────────────
step "1/5  Checking system prerequisites..."

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    err "Required tool not found: $1. Please install it and re-run this script."
    exit 1
  fi
}

check_cmd node
check_cmd npm

NODE_MAJOR=$(node -e "process.stdout.write(process.version.replace('v','').split('.')[0])")
if [ "$NODE_MAJOR" -lt 22 ]; then
  err "Node.js >= 22 is required (found $(node --version)). Please check .nvmrc and use nvm."
  exit 1
fi
log "Node $(node --version) — OK"

step "2/5  Installing workspace dependencies..."
echo "📦 Syncing package dependencies..."
npm install --no-audit
log "Workspace dependencies verified and synced"

step "3/5  Ensuring database containers are running..."
CONTAINER="burma_inventory_db"
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

if [ "$IS_RUNNING" = true ]; then
  log "Container ${CONTAINER} is already running"
else
  echo "🐳 Starting database containers..."
  $COMPOSE_CMD up -d
  log "Database containers started"
fi

# Wait for database container to be ready
wait_for_db

step "4/5  Applying database schema (Drizzle push)..."
TABLE_EXISTS=$("$CONTAINER_ENGINE" exec "$CONTAINER" psql -U postgres -d inventory_db -tAc \
  "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='items');" 2>/dev/null || echo "f")

if [ "$TABLE_EXISTS" = "t" ]; then
  warn "Schema tables already exist — running push anyway to verify structure and seed master data"
fi

DB_URL="postgresql://postgres:postgres@localhost:5433/inventory_db?schema=public"
DATABASE_URL="$DB_URL" npx drizzle-kit push --config=drizzle.config.ts --force
log "Schema applied and fully seeded"

step "5/5  Running initial sync-server build..."
echo "🏗️  Syncing builds..."
npx nx run sync-server:build:development
log "Initial build verified and synced"

echo ""
echo -e "${GREEN}${BOLD}🎉 Setup complete!${NC}"
echo -e "   Run ${YELLOW}npm run dev${NC} to start the development environment."
echo ""
