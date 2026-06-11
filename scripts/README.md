# Utility Scripts (`scripts`)

Shell scripts and helpers for the local development lifecycle: environment
setup, container/database management, the dev server, and pre-commit checks.
Most are exposed as `npm run` scripts (see the root `README.md` command table).

## Lifecycle

### [`setup.sh`](./setup.sh) — `npm run setup` / `npm run clean-setup`

Unified setup/reset. Auto-detects **Docker or Podman**. Default mode is
non-destructive (deps → containers → wait for DB → push schema → initial build).
`--reset` (`npm run clean-setup`) wipes volumes, `node_modules`, and lockfiles
for a clean rebuild.

### [`start-dev.sh`](./start-dev.sh) — `npm run dev`

Ensures containers + schema are up, frees ports 3000/8081, pre-builds the
server, then serves `sync-server` (nodemon over webpack watch) and `mobile-web`
(Expo/Metro) together with clean, prefix-free streamed output.

### [`precommit.sh`](./precommit.sh) — `npm run precommit`

Format → translation check → typecheck → lint → test → build, as a pre-commit
gate.

## Database & containers

### [`containers.sh`](./containers.sh) — `npm run db:up|down|restart|fix|status|logs|clean`

Container lifecycle over the shared engine helper. `up` self-heals the
"container name already in use" error (tears down and recreates, **preserving
the data volume**); `fix` force-clears stale containers; `clean` is destructive
(removes the data volume).

### [`db.sh`](./db.sh) — `npm run db:push|generate|studio|wipe|reset|fresh`

Schema operations (Postgres + Drizzle): `ensure`/`ensure-schema` (start +
push-if-missing), `push` (apply + seed), `generate` (create a migration),
`studio` (Drizzle Studio), `wipe`, `reset`, `fresh`.

### [`lib/container-engine.sh`](./lib/container-engine.sh)

Sourced helper shared by `setup.sh`, `db.sh`, and `containers.sh`: engine/compose
auto-detection, the self-healing `compose_up`, `wait_for_db`, and stale-container
recovery. Not executed directly.

## Quality & maintenance helpers

- [`check-translations.js`](./check-translations.js) — `npm run check-translations`;
  fails on hardcoded user-facing strings (enforces i18n).
- [`bump-thresholds.js`](./bump-thresholds.js) — runs after `npm run test`;
  ratchets Jest coverage thresholds upward (never down).
- [`rename-project.js`](./rename-project.js) — rename the workspace/app.
