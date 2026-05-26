# Burma Sales & Inventory Manager: Developer Guide & Guiding Principles

This document defines the core product vision, system specifications, architectural standards, engineering workflows, and design guidelines for the **Burma Sales & Inventory Manager** application. All future developments, feature extensions, and refactoring tasks must strictly adhere to these principles.

---

## 🧭 1. Product Vision & Specifications

### The Problem

- **Data Fragmentation:** Store relationships, order history, and market intelligence were managed manually across fragmented Excel sheets, personal notebooks, and chaotic instant messaging group chats (Viber). Critical market news, customer friction points, and product interest were buried and lost in chat histories.
- **Lack of Operational Visibility:** Management could not easily see geographic distribution, regional demand patterns, or territory/shop neglect.
- **Infrastructure Instability:** Frequent regional electrical outages and unreliable mobile networks in Myanmar cause frequent internet disruptions, making standard cloud-only apps impractical for real-time data logging in the field.

### Vision & Proposed Solution

A lightweight, mobile-responsive software system that acts as the single source of truth for the marketing team. Built with an **Offline-First Architecture**, the solution comprises:

1. A friction-free mobile interaction logging form for reps that queues logs locally during network drops.
2. Direct integration with Viber workflows (deep-linking and screenshot uploads).
3. Visual representation of relationship health via an interactive geographic heatmap dashboard for management.
4. Automated Daily Supervisor Oversight Engine (Team Pulse and EOD Summaries).

### Target Use Cases

- **Use Case 1 (The Tele/Field Rep):** A representative finishes a Viber call or messaging session with a shop owner. They open the mobile interface, select the shop, log the outcome with 3 taps, attach a screenshot of the chat as proof, and schedule the next follow-up date.
- **Use Case 2 (The Sale/Brand Manager):** A manager opens the heatmap dashboard, filters it to show "High-Value" accounts that have not been contacted in over 14 days (Red Bubbles), and instantly assigns those leads to reps.
- **Use Case 3 (The Compliance Audit):** An executive checks the "Team Pulse" widget at 8:00 PM to view quota compliance and review the timeline to ensure entries were submitted consistently throughout the day (detecting batch-dumping).
- **Use Case 4 (The Offline Logging):** A rep visits a shop during a cellular network outage. They log the interaction completely offline; the app queues it locally and silently syncs it later that evening when connection is restored.

---

## 🏗️ 2. Architectural Philosophy: Local-First Engineering

To address unstable regional power grids and spotty mobile networks, the application is built around a **Local-First / Offline-First engineering model**.

- **Zero Latency Writes:** The client app performs reads and writes directly against a local embedded database at zero latency.
- **Out-of-Band Synchronization:** Data synchronization runs asynchronously in the background. The user is never blocked by network spinner overlays during core inventory capture.

### The Monorepo Stack (Nx)

The workspace is organized into a modular monorepo managed with **Nx** to separate concerns:

1. **`shared-types`:** The single source of truth for the database schema, model definitions, shared validation interfaces, and domain constants.
2. **`ui-components`:** The central design system built using Shopify Restyle. It packages typography, spacing tokens, and color schemes.
3. **`mobile-web`:** The user application built with Expo (React Native). It targets both desktop viewports (via web builds) and mobile devices (via native runtimes).
4. **`sync-server`:** A NestJS API backend built on Prisma ORM to communicate with the central cloud PostgreSQL database.

---

## 🔌 3. Allowed Tech Stack & Core Drivers

- **Backend Platform:** NestJS with Fastify framework (`@nestjs/platform-fastify`) for high-throughput JSON batch parsing.
- **Database Query Builder:** Drizzle ORM used universally across all SQLite/Postgres schemas.
- **Mobile Runtime Driver:** Synchronous JSI direct SQLite access via `@op-engineering/op-sqlite`.
- **Web Browser Driver:** WebAssembly compiled binary implementation via `sql.js` backing onto browser-persistent IndexedDB storage space.

---

## ⚡ 4. Platform Isolation & Boundary Guardrails

To ensure the current application build (`mobile-web`) remains clean and structured for an eventual separation into independent Field Mobile and Admin Web apps:

### Platform-Specific Operations

- **File Extension Separation:** Do not use `Platform.OS === 'web'` or `if (isWeb)` conditional chains inside a single data logic file. You must explicitly isolate environment-specific runtime operations into side-by-side files utilizing platform extensions (e.g., `sync.native.ts` and `sync.web.ts`).

### Screen Layout Boundaries

- **Strict Decoupling:** Do not share child UI components, text fields, or hooks between field-level screen entry flows and management oversight views to optimize files early.
- **Layout Separation:** Isolate administrative screens (e.g., `TeamPulseScreen.tsx`, `GeographicHeatmapScreen.tsx`) into completely independent folder structures away from field rep workflows (`InteractionLoggingScreen.tsx`).

### Hardware Profiles & Telemetry Routing

- **Telemetry Rules:** Query environment profiles via `expo-device` and `expo-location` before mounting hardware components.
- **Enforcement:** If a user logs in via a desktop web browser viewport, routing hooks must explicitly block field-only features—disabling low-level hardware keyboard listeners, native camera modules, and preventing web clients from spoofing distance-verified GPS check-ins.

---

## 🗃️ 5. Database Schema Parity & Synchronization

### Client-Side Engine: WatermelonDB & SQLite

- **Local Engine:** WatermelonDB is selected for high-speed local querying.
- **Model Compilation Constraint:** WatermelonDB models utilize Babel property decorators (`@field`, `@date`, `@readonly`). These decorators are restricted strictly to models declared within `shared-types/src/lib/models.ts`. Do not import or author decorators in components, views, or business services.

### Server-Side Engine: NestJS & Prisma ORM

- **Server DB:** PostgreSQL database.
- **ORM Layer:** Prisma ORM maps cloud tables to TypeScript types and manages migrations.

### Schema Parity & Mapping Rules

To prevent schema drift and runtime sync failures:

1. **Schema Definition:** The database schema is defined once in `shared-types/src/lib/schema.ts` using the WatermelonDB `appSchema` builder.
2. **Type Mapping:** Every database field must map directly to TypeScript definitions in `shared-types/src/lib/shared-types.ts`.
3. **Prisma Parity:** `sync-server/prisma/schema.prisma` must be kept in perfect parity with `schema.ts`.
4. **Naming Conventions:**
   - WatermelonDB table names, column names, and association fields use **snake_case** (e.g., `pending_allocation_count`, `fulfillment_status`).
   - Prisma models use **PascalCase** for tables and **camelCase** for column names (e.g., `pendingAllocationCount`, `fulfillmentStatus`).
   - Mappers in `sync-server/src/app/sync/sync.service.ts` must explicitly translate between these naming patterns during push/pull sequences.

### Synchronization Operations

1. **Pull Changes:**
   - The client fetches all updates since the `last_pulled_at` timestamp.
   - The server aggregates creations, updates, and soft-deletes since that date.
   - A last-write-wins resolution protocol is applied on the client database.
2. **Push Changes:**
   - The client sends accumulated local changes (`created`, `updated`, `deleted` records).
   - The sync server runs changes inside a database transaction (`$transaction`) to maintain referential integrity. If any part of the batch fails, the transaction is rolled back.
   - **Sync Sequencing:** Primary records (e.g., `interaction_logs`) are always pushed and written before join tables (e.g., `interaction_items`) to prevent foreign key errors.

### Failure Recovery & Retry Strategies

- **Offline Writes Queue:** When network requests fail, WatermelonDB automatically retains modifications in a localized pending state. The sync service queues writes locally until the device reports network connectivity.
- **Transient Failures:** Network failures during sync do not block the user. The client catches connection errors, keeps local state active, and retries the sync operation automatically when the network state changes.
- **Server Constraints:** If a record insertion fails on the server due to duplicate keys or validation exceptions, the server isolates the error, logs the mismatch, and continues processing the transaction or rejects the invalid batch gracefully without causing NestJS process crash-loops.

---

## 🔏 6. Code Conventions & Error Isolation (`guardAsync`)

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

### State Validation Rules

- **Client-Side Validation:** Forms and inputs must perform validation checks (e.g., non-empty SKU, valid positive numbers for pricing and quantities) before calling repository database writes.
- **Server-Side Validation:** The NestJS sync router validates incoming payloads to ensure correct type structures and integrity constraints before committing transactions.

### Pre-Commit Gate

All code edits are strictly audited before they can be committed to the repository. The pre-commit gate enforces a clean build:

1. **Type Verification:** Deep workspace typecheck via `npm run typecheck` (`tsc --noEmit` targeting `tsconfig.base.json`).
2. **Linter Audit:** Rules enforced via `npm run lint` (`eslint` flat configurations).
3. **Format Standards:** Formatter checks via `npm run format:check` (`prettier`).
4. **Test Suite:** Executing unit and integration tests via `npm run test` (`jest`).

---

## 🎨 7. Responsive UI & Brand Design Specifications

The interface must feel polished, responsive, and tailored to the operational context. Layout behaviors are partitioned by viewport limits (breakpoint: **768px**). Tailwind CSS is strictly prohibited; all styles must use the type-safe **Shopify Restyle** tokens.

### Spatial Token Scaling System

All element sizing, margins, padding, and layout bounding blocks must reference pre-configured theme string tokens mapping strictly to an 8-point spatial matrix:

- `s` -> 8px (Tight structural gaps, labels, item details)
- `m` -> 16px (Standard layout padding, card inner boxes, text margins)
- `l` -> 24px (Screen borders, prominent section containers)
- `xl` -> 32px (Major view wrappers)

### Layout Densities & Typographic Hierarchy

- **Asymmetric Grid Splitting:** Layout screens (e.g., `ShopLedgerScreen`) must structure data weights via explicit layout configurations: primary data tracking lists or baskets must occupy an asset layout width of `col-span-8`, while secondary details or filtering drawers align inside a tight `col-span-4` space.
- **Mono-Font Numeric Alignment:** All rendering items presenting quantities, Kyat cash metrics, product code SKUs, or package conversion parameters must explicitly enforce your monospace typography token (`fontFamily: 'monospace'` or equivalent font primitive modifier) to avoid visual layout shifts.

### Semantic Color Badging

Status states, alert badges, and condition labels must be colored exclusively via type-safe semantic color tags:

| Status / Context         | Visual Meaning                                       | Restyle Token              | Hex Code                |
| :----------------------- | :--------------------------------------------------- | :------------------------- | :---------------------- |
| **Positive / Good**      | Verified Records, Active Allocations, Good Stock     | `success` / `successLight` | `#059669` (Emerald 600) |
| **Exception / Danger**   | Audit Mismatches, Damaged Stock, Sync Deficit Errors | `danger` / `dangerLight`   | `#dc2626` (Red 600)     |
| **Transition / Warning** | Margin exceptions, Discount overrides                | `warning` / `warningLight` | `#d97706` (Amber 600)   |

---

## 🔌 8. Peripheral Hardware Scanner & Input Routing

To support high-frequency physical check-ins and intake logging in warehouses, input capturing is routing-aware.

### Keyboard HID Scanner Emulation

Warehouse barcode/QR scanners mimic USB keyboard inputs by streaming character entries in ultra-fast succession, followed by an `Enter` character.

1. **Centralized Listener:** A global keyboard event listener captures input timing at the application root level.
2. **Delta Detection:** Keystrokes arriving at intervals of **less than 20ms** per character are classified as hardware barcode scanner reads.
3. **Bypassing Focused UI:** When a hardware scanner read is detected, the event:
   - Prevents propagation to any currently focused input elements (avoiding polluting open text forms).
   - Automatically parses the barcode data.
   - Triggers the corresponding lookup and writes the checkout/intake record directly to WatermelonDB SQLite.
