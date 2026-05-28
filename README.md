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
- **[sync-server/](./sync-server)**: Express + Prisma API server processing synchronized changes, scheduled EOD cron tasks, and local Gemma AI parsing.
- **[ui-components/](./ui-components)**: Shared UI components built with `@shopify/restyle`.
- **[shared-types/](./shared-types)**: Common data types and interfaces.

Refer to the [**ARCHITECTURE.md**](./ARCHITECTURE.md) and [**GUIDING_PRINCIPLES.md**](./GUIDING_PRINCIPLES.md) files for more information.

---

## ⚡ Setup & Execution

### Prerequisites

- **Node.js v22+** — check `.nvmrc` and use `nvm` to match the version
- **Docker** — for the local PostgreSQL database

### First-Time Setup (after `git clone`)

Run the one-shot init script. It is **non-destructive** — it skips steps that are already complete (e.g. existing `node_modules` or a running DB):

```bash
npm run init
```

This single command will:

1. Verify Node.js ≥ 22 and Docker are available
2. `npm install` root + `mobile-web` dependencies
3. Start the Docker PostgreSQL container (if not already running)
4. Wait for the DB to be ready and push the Drizzle schema
5. Run the initial `sync-server` build so `dist/` exists

Then simply start developing:

```bash
npm run dev
```

---

### Other Useful Commands

| Command               | Description                                                 |
| --------------------- | ----------------------------------------------------------- |
| `npm run dev`         | Start all services (DB check → build → NX watch + serve)    |
| `npm run db:push`     | Push Drizzle schema to the running DB                       |
| `npm run db:reset`    | Wipe + re-push schema (preserves Docker volume)             |
| `npm run check`       | Typecheck + lint + test + format-check                      |
| `npm run clean-setup` | **Destructive** full reset — wipes DB volume & node_modules |

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
