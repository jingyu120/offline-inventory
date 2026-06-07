# Foundational Offline-First Monorepo Template

Welcome to the **Foundational Offline-First Monorepo Template**. This repository is designed as a production-ready reference architecture and boilerplate for building highly scalable, offline-first multi-platform applications.

---

## 1. Architecture Overview

The codebase is organized as a monorepo managed with **Nx** and uses a modular, layered architecture to maintain a strict separation of concerns.

```
                  ┌─────────────────────────────────────────┐
                  │              shared-types               │
                  │   (Drizzle/SQLite schemas, tRPC types)  │
                  └────────────┬───────────────┬────────────┘
                               │               │
                               ▼               ▼
          ┌──────────────────────────┐   ┌──────────────────────────┐
          │        mobile-web        │   │       sync-server        │
          │    (React Native/Expo)   │   │     (NestJS Backend)     │
          │                          │   │                          │
          │    ┌────────────────┐    │   │    ┌────────────────┐    │
          │    │  WatermelonDB  │    │   │    │   Drizzle/PG   │    │
          │    │    (SQLite)    │    │   │    │  (PostgreSQL)  │    │
          │    └────────────────┘    │   │    └────────────────┘    │
          └────────────┬─────────────┘   └────────────┬─────────────┘
                       │                              │
                       ▼                              ▼
          ┌──────────────────────────┐                │
          │      ui-components       │◄───────────────┘
          │    (Shopify Restyle)     │
          └──────────────────────────┘
```

### Monorepo Structure

- [**`shared-types/`**](./shared-types): Single source of truth for all domain entities, validation schemas, and API contracts.
  - `src/lib/db/`: Database schema definitions (PostgreSQL for backend, SQLite for client).
  - `src/lib/api/`: tRPC router type definitions and endpoint resolver types.
  - `src/lib/ai/`: Zod schemas for AI prompt parsing and structured outputs.
  - `src/lib/types/`: Base TypeScript interfaces shared across all components.
- [**`ui-components/`**](./ui-components): Shared presentation system built on top of `@shopify/restyle`. Houses core visual atoms (Buttons, Cards, Inputs, Themes).
- [**`mobile-web/`**](./mobile-web): Multi-platform frontend client targeting iOS, Android, and Web browsers, powered by Expo and React Native.
- [**`sync-server/`**](./sync-server): Backend API server powered by NestJS. Integrates with tRPC, PostgreSQL (via Drizzle ORM), BullMQ, and Redis.

---

## 2. Bootstrapping & Renaming the Template

To use this template for a new application, you can easily rename the package namespace scope and folder references in a single command.

### Step 1: Run the Renaming Script

Execute the custom bootstrapping script to replace the template namespace (`@burma-inventory`) with your own package name:

```bash
node scripts/rename-project.js --to=@my-awesome-app
```

This will automatically update:

- Workspace `package.json` package names and dependencies.
- Root configuration files (`tsconfig.base.json`, `nx.json`).
- All relative and path-mapped import statements across the source code.

### Step 2: Configure Environment Variables

Copy the template environmental variables to local files:

```bash
cp .env.example .env
cp sync-server/.env.example sync-server/.env
cp mobile-web/.env.example mobile-web/.env
```

### Step 3: Run Database Migrations

Initialize your local PostgreSQL database:

```bash
npm run db:fresh
```

### Step 4: Start the Development Servers

Start both backend API and client expo server concurrently in development mode:

```bash
npm run dev
```

---

## 3. How Offline-First Synchronization Works

This template provides a production-grade **two-way delta synchronization engine** aligning the client-side local database (WatermelonDB/SQLite) and the server-side cloud database (PostgreSQL).

```
Client (SQLite/WatermelonDB)                      Server (Postgres/Drizzle)
            │                                                 │
            │ ─── 1. Pull Delta (GET /sync?lastPulledAt) ───► │
            │                                                 │ [Compute Server Changes]
            │ ◄── 2. Apply Changes + New Timestamp ────────── │
  [Resolve Conflicts]                                         │
            │                                                 │
            │ ─── 3. Push Delta (POST /sync [local mutations])►│
            │                                                 │ [Process Transaction]
            │                                                 │ [Last-Write-Wins Resolution]
            │ ◄── 4. Acknowledge Push Success ──────────────── │
```

1. **Pull Changes**: The client requests all updates created or updated since `last_pulled_at`. The NestJS server evaluates and returns the delta.
2. **Apply Local Modifications**: The WatermelonDB transaction safely integrates remote changes, resolving conflicts locally.
3. **Push Changes**: Local modifications (accumulated offline) are bundled as created/updated/deleted records and posted to the server.
4. **Transaction Integrity**: The NestJS server applies updates inside a single database transaction. If conflicts arise, they are resolved using a **Last-Write-Wins** strategy based on `updatedAt` timestamps.

---

## 4. How to Add a New Feature Module

To expand the application, follow this standardized architectural workflow:

### Step 1: Define Schemas and Types

Create or edit your schema in `shared-types/src/lib/db/` and re-export it in `shared-types/src/index.ts`.
For PostgreSQL:

```typescript
// shared-types/src/lib/db/schema.ts
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  completed: boolean('completed').default(false).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

For SQLite (WatermelonDB mapping):

```typescript
// shared-types/src/lib/db/schema-sqlite.ts
export const sqliteTasksSchema = tableSchema({
  name: 'tasks',
  columns: [
    { name: 'title', type: 'string' },
    { name: 'completed', type: 'boolean' },
    { name: 'updated_at', type: 'number' },
  ],
});
```

### Step 2: Declare tRPC Endpoints

Register the request/response payloads in `shared-types/src/lib/api/trpc.ts`:

```typescript
export const trpcResolvers = {
  createTask: z.object({ title: z.string() }),
};
```

### Step 3: Implement Backend Service & Controller

Create a NestJS feature module under `sync-server/src/app/features/` to handle queries/mutations and database interactions.

### Step 4: Implement Client-Side UI

Consume the shared type-safe tRPC client in `mobile-web` and bind it to visual elements built using the shared `ui-components` library.

---

## 5. Development Guidelines & Best Practices

- **Strict Path Mappings**: Avoid relative imports to other workspaces (e.g. `../../ui-components/src/...`). Always use the mapped paths configured in `tsconfig.base.json` (like `@burma-inventory/ui-components`).
- **Platform-Specific Splits**: For modules that depend on platform APIs, utilize the `.web.ts` and `.native.ts` file split conventions (e.g., `location.web.ts` and `location.native.ts`). Metro and Webpack automatically resolve the appropriate extension depending on target platform.
- **Empty Mock Declarations**: For test suite mocks, write `(_args) => undefined` instead of `() => {}` to prevent linter violations.
- **Zero Inline ESLint Suppressions**: Maintain strict lint standards by fixing root causes rather than using line overrides.
