# Burma Inventory - Enterprise Architecture & Guiding Principles

This document defines the core architectural standards, engineering workflows, and design guidelines for the Burma Inventory application. All future developments, feature extensions, and refactoring tasks must strictly adhere to these principles.

---

## 1. Architectural Philosophy: Local-First Engineering

To address unstable regional power grids, frequent electricity blackouts, and spotty mobile networks, the Burma Inventory application is built around a **Local-First / Offline-First engineering model**.

- **Zero Latency Writes**: The client app performs reads and writes directly against a local embedded database at zero latency.
- **Out-of-Band Synchronization**: Data synchronization runs asynchronously in the background. The user is never blocked or shown spinner overlays waiting for network completions during core inventory capture.

### The Monorepo Stack (Nx)

The workspace is organized into a modular monorepo managed with **Nx** to separate concerns:

1. **`shared-types`**: The single source of truth for the database schema, model definitions, shared validation interfaces, and domain constants.
2. **`ui-components`**: The central design system built using Shopify Restyle. It packages typography, spacing tokens, and color schemes.
3. **`mobile-web`**: The user application built with Expo (React Native). It targets both desktop viewports (via web builds) and mobile devices (via native runtimes).
4. **`sync-server`**: A NestJS API backend built on Prisma ORM to communicate with the central cloud PostgreSQL database.

---

## 2. Monorepo Database Stack & Schema Sharing

Rather than using complex synchronization servers, the database layer consists of a direct mapping between client-side local storage and a server-side cloud database.

### Client-Side Engine: WatermelonDB & SQLite

- **Local Engine**: WatermelonDB is selected for high-speed local querying.
- **Adapters**:
  - **Native mobile platforms**: Runs on top of `expo-sqlite` utilizing the high-speed JSI (JavaScript Interface) SQLite adapter for maximum query throughput.
  - **Web platforms**: Runs LokiJS with incremental IndexedDB persistence.
- **Model Compilation Constraint**: WatermelonDB models utilize Babel property decorators (`@field`, `@date`, `@readonly`). These decorators are restricted strictly to models declared within `shared-types/src/lib/models.ts`. Do not import or author decorators in components, views, or business services.

### Server-Side Engine: NestJS & Prisma ORM

- **Server DB**: PostgreSQL database.
- **ORM Layer**: Prisma ORM maps cloud tables to TypeScript types and manages migrations.

### Strict Schema Synchronization Rules

To prevent schema drift and runtime sync failures:

1. **Schema Definition**: The database schema is defined once in `shared-types/src/lib/schema.ts` using the WatermelonDB `appSchema` builder.
2. **Type Mapping**: Every database field must map directly to TypeScript definitions in `shared-types/src/lib/shared-types.ts`.
3. **Prisma Schema**: `sync-server/prisma/schema.prisma` must be kept in perfect parity with `schema.ts`.
4. **Naming Conventions**:

- WatermelonDB table names, column names, and association fields use **snake_case** (e.g. `region_id`, `created_at_local`).
- Prisma models use **PascalCase** for tables and **camelCase** for column names (e.g. `regionId`, `createdAtLocal`).
- Mappers in `sync-server/src/app/sync/sync.service.ts` must explicitly translate between these naming patterns during push/pull sequences.

---

## 3. Strict State Validation & Pre-Commit Pipeline

Data validity must be enforced at every layer of the system to prevent corrupt data packets from polluting client databases or central repositories.

### State Validation Rules

- **Client-Side Validation**: Forms and inputs must perform validation checks (e.g., non-empty SKU, valid positive numbers for pricing and quantities) before calling repository database writes.
- **Server-Side Validation**: The NestJS sync router validates incoming payloads to ensure correct type structures and integrity constraints before committing transactions.

### Pre-Commit Gate

All code edits are strictly audited before they can be committed to the repository. The pre-commit gate enforces a clean build:

1. **Type Verification**: Deep workspace typecheck via `npm run typecheck` (`tsc --noEmit` targeting `tsconfig.base.json`).
2. **Linter Audit**: Rules enforced via `npm run lint` (`eslint` flat configurations).
3. **Format Standards**: Formatter checks via `npm run format:check` (`prettier`).
4. **Test Suite**: Executing unit and integration tests via `npm run test` (`jest`).
   _Note: Bypassing checks with `--no-verify` is strictly prohibited._

---

## 4. Network Failure Modes & Sync Conflict Resolution

A robust offline application must gracefully handle intermittent connectivity, data clashes, and partial push failures.

### Synchronization Operations

1. **Pull Changes**:
   - The client fetches all updates since `last_pulled_at` timestamp.
   - The server aggregates creations, updates, and soft-deletes since that date.
   - A last-write-wins resolution protocol is applied on the client database.
2. **Push Changes**:
   - The client sends accumulated local changes (`created`, `updated`, `deleted` records).
   - The sync server runs changes inside a database transaction (`$transaction`) to maintain referential integrity. If any part of the batch fails, the transaction is rolled back.
   - **Sync Sequencing**: Primary records (e.g., `interaction_logs`) are always pushed and written before join tables (e.g., `interaction_items`) to prevent foreign key errors.

### Failure Recovery & Retry Strategies

- **Offline Writes Queue**: When network requests fail, WatermelonDB automatically retains modifications in a localized pending state. The sync service queues writes locally until the device reports network connectivity.
- **Transient Failures**: Network failures during sync do not block the user. The client catches connection errors, keeps local state active, and retries the sync operation automatically when the network state changes.
- **Server Constraints**: If a record insertion fails on the server due to duplicate keys or validation exceptions, the server isolates the error, logs the mismatch, and continues processing the transaction or rejects the invalid batch gracefully without causing NestJS process crash-loops.

---

## 5. Error Isolation & Safe Conventions (`guardAsync`)

To prevent database exceptions or network failures from crashing the client runtime, developers must avoid unstandardized `try/catch` blocks or unhandled promise rejections.

All asynchronous writes, network transactions, and database operations must use the type-safe **Guard Tuple** convention (`guardAsync`).

### The `guardAsync` Utility

Located in `@burma-inventory/shared-types`, this helper captures exceptions and returns a clean tuple:

```typescript
export async function guardAsync<T, E = Error>(promise: Promise<T>): Promise<[T, null] | [null, E]> {
  try {
    const result = await promise;
    return [result, null];
  } catch (error) {
    return [null, error as E];
  }
}
```

### Mutation Write Rule

All repository writes, check-in operations, and sync updates must wrap the execution logic with `guardAsync`.

```typescript
import { guardAsync } from '@burma-inventory/shared-types';

export const handleAddRecord = async (payload: Payload) => {
  const [result, error] = await guardAsync(
    database.write(async () => {
      return await database.collections.get('items').create((item) => {
        item.sku = payload.sku;
      });
    }),
  );

  if (error) {
    Logger.error('Database write operation failed:', error);
    return { success: false, error: error.message };
  }
  return { success: true, data: result };
};
```

---

## 6. Responsive UI & Brand Design Specifications

The interface must feel polished, responsive, and tailored to the operational context. Layout behaviors are partitioned by viewport limits (breakpoint: **768px**).

### Desktop / Web Dashboard (`width >= 768px`)

- **Design Paradigm**: **Katana Cloud Inventory** (High-density administrative management).
- **Core Layout**:
  - Persistent left-hand navigation sidebar showing text labels and structural tabs.
  - Multi-column HTML grid tables with compact row heights to display maximum inventory details.
  - Split-pane interface: Left list pane for filtering, right detail pane for contextual details, histories, and ledger metrics.

### Mobile App & Scanners (`width < 768px`)

- **Design Paradigm**: **Sortly Mobile** (Rugged, industrial field execution).
- **Core Layout**:
  - Tap targets must be at least **48px x 48px** to support fast field selection.
  - Generous card-based list layouts with high-contrast borders and rounded corners (`borderRadius="l"`).
  - Fixed, persistent bottom navigation bar containing Lucide icons (`ClipboardList`, `Map`, `Activity`) alongside text labels.
  - Full-screen procedural flows: Complex actions (like scanning inventory items) navigate away from list screens entirely to provide a focused workspace with a clear back navigation button.

### Brand Color Badges & Typography

- Typography uses modern, highly readable sans-serif fonts (e.g. Outfit, Inter).
- Status and indicators must use consistent, context-driven background colors:

| Context                    | Visual Meaning                       | Color Hex/Token        |
| :------------------------- | :----------------------------------- | :--------------------- |
| **Positive Operations**    | Passed inspection, export-approved   | Emerald600 (`#059669`) |
| **System Exceptions**      | Failed inspection, stockouts, errors | Red600 (`#dc2626`)     |
| **Logistical Transitions** | Pending receipt, in-transit          | Slate600 (`#475569`)   |

---

## 7. Peripheral Hardware Scanner & Input Routing

To support high-frequency physical check-ins and intake logging in warehouses, input capturing is routing-aware.

### Keyboard HID Scanner Emulation

Warehouse barcode/QR scanners mimic USB keyboard inputs by streaming character entries in ultra-fast succession, followed by an `Enter` character.

1. **centralized Listener**: A global keyboard event listener captures input timing at the application root level.
2. **Delta Detection**: Keystrokes arriving at intervals of **less than 20ms** per character are classified as hardware barcode scanner reads.
3. **Bypassing Focused UI**: When a hardware scanner read is detected, the event:
   - Prevents propagation to any currently focused input elements (avoiding polluting open text forms).
   - Automatically parses the barcode data.
   - Triggers the corresponding lookup and writes the checkout/intake record directly to WatermelonDB SQLite.
