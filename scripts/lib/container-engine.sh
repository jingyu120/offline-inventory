#!/usr/bin/env bash
# ──────────────────────────────────────────────────
# Shared container-engine helpers (Podman/Docker).
#
# SOURCE this file — do not execute it directly:
#   source "$(dirname "$0")/lib/container-engine.sh"
#
# Provides: colored logging, engine/compose auto-detection, and resilient
# compose lifecycle helpers that recover from the common
# "container name already in use" error caused by stale stopped containers.
# ──────────────────────────────────────────────────

# ── Colors & logging ──────────────────────────────
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

# ── Known containers (must match docker-compose.yml container_name) ──
DB_CONTAINER="burma_inventory_db"
REDIS_CONTAINER="burma_inventory_redis"
PGBOUNCER_CONTAINER="burma_inventory_pgbouncer"
ALL_CONTAINERS=("$DB_CONTAINER" "$REDIS_CONTAINER" "$PGBOUNCER_CONTAINER")

DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-inventory_db}"

# ── Engine & compose-provider detection (idempotent) ──
CONTAINER_ENGINE=""
COMPOSE_CMD=""

detect_container_engine() {
  [ -n "$CONTAINER_ENGINE" ] && return 0

  if command -v podman &>/dev/null; then
    CONTAINER_ENGINE="podman"
  elif command -v docker &>/dev/null; then
    CONTAINER_ENGINE="docker"
  else
    err "Neither 'podman' nor 'docker' CLI found. Please install a container engine."
    return 1
  fi

  if command -v podman-compose &>/dev/null && [ "$CONTAINER_ENGINE" = "podman" ]; then
    COMPOSE_CMD="podman-compose"
  elif "$CONTAINER_ENGINE" compose version &>/dev/null; then
    COMPOSE_CMD="$CONTAINER_ENGINE compose"
  elif command -v docker-compose &>/dev/null; then
    COMPOSE_CMD="docker-compose"
  else
    COMPOSE_CMD="$CONTAINER_ENGINE compose"
  fi
}

# ── State queries ─────────────────────────────────
container_running() { # $1 = container name
  "$CONTAINER_ENGINE" ps --format '{{.Names}}' 2>/dev/null | grep -q "^$1$"
}

container_exists() { # $1 = container name (any state, incl. stopped/created)
  "$CONTAINER_ENGINE" ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^$1$"
}

# ── macOS: ensure the Podman VM is running ────────
start_podman_machine_if_needed() {
  [ "$CONTAINER_ENGINE" = "podman" ] || return 0
  uname -s | grep -q "Darwin" || return 0
  if podman machine list 2>/dev/null | grep -qE "podman-machine|applehv|qemu"; then
    if ! podman machine list 2>/dev/null | grep -q "Currently running"; then
      step "Starting Podman virtual machine..."
      podman machine start || warn "Could not start Podman machine automatically."
    fi
  fi
}

# Force-remove the project's named containers to clear "name already in use"
# conflicts. This NEVER touches named volumes, so database data is preserved.
remove_stale_containers() {
  for c in "${ALL_CONTAINERS[@]}"; do
    if container_exists "$c"; then
      "$CONTAINER_ENGINE" rm -f "$c" >/dev/null 2>&1 || true
    fi
  done
}

# Bring containers up, self-healing from stale-container name conflicts.
# Data in the `pgdata` named volume is preserved across recovery.
compose_up() {
  detect_container_engine || return 1
  start_podman_machine_if_needed

  local errfile
  errfile="$(mktemp)"

  if $COMPOSE_CMD up -d 2>"$errfile"; then
    cat "$errfile" >&2 || true
    rm -f "$errfile"
    return 0
  fi

  if grep -qi "already in use\|in use by" "$errfile"; then
    warn "Stale containers are blocking startup — recovering (data volume preserved)..."
    $COMPOSE_CMD down --remove-orphans >/dev/null 2>&1 || true
    remove_stale_containers
    rm -f "$errfile"
    $COMPOSE_CMD up -d
  else
    cat "$errfile" >&2
    rm -f "$errfile"
    return 1
  fi
}

# Stop & remove containers, KEEPING the data volume.
compose_down() {
  detect_container_engine || return 1
  $COMPOSE_CMD down --remove-orphans
}

# Stop & remove containers AND the data volume (DESTRUCTIVE).
compose_clean() {
  detect_container_engine || return 1
  $COMPOSE_CMD down -v --remove-orphans
}

# Block until PostgreSQL accepts connections (or time out).
wait_for_db() {
  detect_container_engine || return 1
  echo -n "⏳ Waiting for PostgreSQL to be ready"
  local limit=45 count=0
  until "$CONTAINER_ENGINE" exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
    echo -n "."
    sleep 1
    count=$((count + 1))
    if [ "$count" -ge "$limit" ]; then
      echo ""
      err "PostgreSQL did not become ready within ${limit}s."
      "$CONTAINER_ENGINE" logs "$DB_CONTAINER" --tail 30 2>/dev/null || true
      return 1
    fi
  done
  echo " (Connected!)"
  log "PostgreSQL is ready"
}

# Idempotent: start containers only if the DB isn't already running, then wait.
ensure_containers() {
  detect_container_engine || return 1
  if container_running "$DB_CONTAINER"; then
    return 0
  fi
  warn "Containers not running. Starting..."
  compose_up
  wait_for_db
}
