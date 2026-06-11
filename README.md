# Burma Inventory System

A lightweight, offline-first Sales & Inventory Relationship Manager built for regional sales representatives and management. The system transitions family-run operations away from chaotic chat-group reporting (Viber) to a structured, data-driven database, ensuring resilience against frequent network dropouts and electrical blackouts.

---

## 💡 How the App Works

1. **Local Logging**: Sales reps visit or message shops and log their interactions (calls, Viber, in-person visits) in under 30 seconds.
2. **Offline-First Resilience**: If the internet or electricity is down, records are stored securely in local database storage.
3. **Seamless Synchronization**: The application continuously monitors network status and background syncs queued records to the server database.
4. **Viber Integration**: Reps deep-link directly into Viber conversations and upload compressed proof-of-work chat screenshots.
5. **Relationship Heatmap**: Managers view an interactive, color-coded map showing account health (Neglected vs Active) based on contact recency.
6. **Oversight Dashboard**: Management tracks rep compliance via a daily grid and receives EOD summary reports compiled by local Gemma AI services.

---

## 🏗️ Project Architecture

This application is built in a TypeScript monorepo managed with **Nx**:

- **[mobile-web/](./mobile-web)**: The frontend React Native/Expo app. Adapts between **Katana Cloud Inventory** (Desktop table/grid views) and **Sortly** (Mobile touch card views).
- **[sync-server/](./sync-server)**: NestJS + Drizzle ORM API server (tRPC + REST) processing synchronized changes, BullMQ background jobs, and local Gemma AI parsing.
- **[ui-components/](./ui-components)**: Shared UI components built with `@shopify/restyle`.
- **[shared-types/](./shared-types)**: Common data types and interfaces.

Refer to the [**ARCHITECTURE.md**](./ARCHITECTURE.md) and [**GUIDING_PRINCIPLES.md**](./GUIDING_PRINCIPLES.md) files for more information.

---

## ⚡ Setup & Execution

### Prerequisites

- **Node.js v22+** — check `.nvmrc` and use `nvm` to match the version
- **Docker** — for the local PostgreSQL database

### First-Time Setup (after `git clone`)

Run the one-shot setup script. It is **non-destructive** by default — it skips steps that are already complete (e.g. existing `node_modules` or a running DB) and automatically detects whether you use **Docker** or **Podman**:

```bash
npm run setup
```

This single command will:

1. Verify Node.js ≥ 22 and a container engine (Docker or Podman) are available
2. `npm install` root + workspace dependencies cleanly
3. Start the PostgreSQL and Redis containers (if not already running)
4. Wait for the DB to be ready and push the Drizzle schema and seed master dataset
5. Run the initial `sync-server` build so `dist/` exists

Then simply start developing:

```bash
npm run dev
```

---

### Other Useful Commands

**Lifecycle**

| Command               | Description                                                          |
| --------------------- | -------------------------------------------------------------------- |
| `npm run dev`         | Start all services (DB check → build → NX watch + serve)             |
| `npm run setup`       | Non-destructive one-shot setup (safe to re-run)                      |
| `npm run clean-setup` | **Destructive** full reset — wipes volumes, databases & node_modules |
| `npm run build`       | Build all buildable projects                                         |
| `npm run check`       | Typecheck + lint + test + format-check                               |
| `npm run clean`       | Clear Nx cache and build artifacts (`dist`, `tmp`, `coverage`)       |

**Containers** (Docker/Podman, auto-detected)

| Command              | Description                                                           |
| -------------------- | --------------------------------------------------------------------- |
| `npm run db:up`      | Start containers; self-heals "name already in use" errors (data kept) |
| `npm run db:down`    | Stop & remove containers (keeps the data volume)                      |
| `npm run db:restart` | `down` + `up`                                                         |
| `npm run db:fix`     | Force-clear stale containers blocking startup, then start (data kept) |
| `npm run db:status`  | Show engine + container states                                        |
| `npm run db:logs`    | Tail container logs (default: postgres)                               |
| `npm run db:clean`   | **Destructive** — remove containers AND the data volume               |

**Schema**

| Command               | Description                                        |
| --------------------- | -------------------------------------------------- |
| `npm run db:push`     | Push the Drizzle schema and seed master data       |
| `npm run db:generate` | Generate a Drizzle SQL migration from the schema   |
| `npm run db:studio`   | Open Drizzle Studio against the local DB           |
| `npm run db:wipe`     | Drop & recreate the public schema (empties the DB) |
| `npm run db:reset`    | `wipe` + `push` (preserves the container volume)   |
| `npm run db:fresh`    | Ensure containers are up, then `reset`             |

### Code Validation

```bash
npm run check
```

---

## 📘 Future Roadmaps & Plans

Refer to the [**documentation/revamp/**](./documentation/revamp) directory for full development history and future implementation specs:

- `00_Master_Plan.md`: Revamp phases and goals.
- `05_Phase5_Route_Optimization.md`: Intelligent routing coordinates.
- `06_Phase6_Automated_Viber_Chatbot.md`: Auto-replies and data entry via chat.
- `07_Phase7_Predictive_Analytics_Forecasting.md`: AI demand planning.
