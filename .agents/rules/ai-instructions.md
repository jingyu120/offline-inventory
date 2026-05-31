---
trigger: always_on
---

# `ai-instructions.md` (System Prompt & Autonomous Execution Contract)

## 🎯 Absolute Directives: Business Domain & Flow

- **Domain Lockdown (CRITICAL):** This platform is strictly an **Internal Inventory & Sales Accountability engine** for regional Myanmar distribution. Focus entirely on internal stock levels, client B2B sales, and personnel accountability. OMIT all cross-border transit, customs, import tracking, and currency exchange logistics.
- **Intake Quarantine Paradigm:** Warehouse intake must be frictionless but safeguarded. Inventory added to the system defaults to a `PENDING_APPROVAL` status. It is mathematically quarantined and **cannot be deducted or added to a sales cart** until a manager advances the state to `AVAILABLE`.
- **Transaction Accountability:** Every single transaction (Sales, Edits, Discards) must cleanly separate human context: `client_id` (Who bought it), `executed_by_id` (Who keyed the order into the app), `salesperson_id` (Who owns the commission), and `approved_by_id` (Which manager authorized it).

---

## 📌 1. Core Operating Constraints & Deployment Topology

- **Sales-First Rollout Isolation:** The platform executes an offline field-sales intake deployment strategy. **MOCK, STUB, or OMIT** all active real-time warehouse inventory subtraction routines against `AVAILABLE` stock until explicit admin approval flows are met. Checkout baskets must be captured as requests with an operational state enum of `PENDING_FULFILLMENT`.
- **Multilingual Localization Matrix:** The field-sales force operates in **Burmese (ဗမာစာ)**; back-office admin and engineering layout layers use **English**. Default all frontend user-facing display strings to Burmese (`my`), matching the dictionary mappings in `mobile-web/src/utils/translations.ts`. Provide English (`en`) visibility toggles strictly within administrative views.
- **Nx Monorepo Pathing:** Strictly prohibit relative path spaghetti (e.g., `../../../`). You must use the configured workspace alias paths (e.g., `@burma-inventory/shared-types`, `@burma-inventory/ui-components`).

---

## 🗃️ 2. Spreadsheet Data Integration & Schema Consistency

Autonomous structural modifications to schemas (`shared-types/src/lib/schema.ts`) or data ingest logic must strictly reflect master balance sheet realities:

- **Parentheses Allocation Logic:** Data entities enclosed in parentheses (e.g., `(1,756)`) denote **Pending Committed Orders**. Parsing transformations must strip parentheses, convert strings to positive integers, and commit values to `pending_allocation_count`.
- **Signed Integer Configurations:** Configure product quantity attributes as explicit signed integers (`integer()`) to handle legacy deficit structures safely without throwing sync abort errors.
- **Data Suffix Isolation:** Variant dimensions, finishing codes (`CP`, `BL`), and structural classes (`RE`, `MR`) must be parsed out of main item name text lines. Store these attributes as clear sub-type arrays to populate layout pill selectors.
- **Stock Quality Segregation:** Maintain a `stock_condition` enum supporting `GOOD`, `BAD`, and `WET` to allow field representatives to book clearance transactions dynamically.
- **B2B Bulk Project Tracking:** Maintain a `Project` database model linked to orders. Representatives must be allowed to route volume items straight to enterprise contract profiles (e.g., _Galaxy Tower-3_).

---

## 🏗️ 3. Frontend Architecture Standards (Shopify Restyle & React Native)

**CRITICAL BAN:** This repository strictly prohibits Tailwind CSS, `className` strings, CSS Grid (`col-span`), raw `StyleSheet.create`, and native `react-native` UI imports like `<View>` or `<TouchableOpacity>`.

- **Component Sourcing:** You must import ALL layout and typography primitives exclusively from `@burma-inventory/ui-components`. Do not invent one-off synthetic UI components inside screen files.
- **Spatial Token Scaling (8pt System):** All element sizing, margins, padding, and layout bounding blocks must reference predefined Restyle theme tokens (`s`: 8px, `m`: 16px, `l`: 24px, `xl`: 32px).
- **React Native Flexbox Asymmetry:** Do not use CSS Grid. Split screens (e.g., `ShopLedgerScreen`) must structure data weights via Flexbox ratios: assign the primary data tracking list `<Box flex={2}>`, and secondary filtering drawers `<Box flex={1}>`.
- **Mono-Font Numeric Alignment:** All layout elements presenting quantities, Kyats, or SKUs must explicitly enforce your monospace typography token (e.g., `variant="mono"`) to freeze visual widths during live calculations.
- **Interaction States:** Clickable items (`Pressable` from your UI library) must apply Background transitions (`cardBackground` to `cardBackgroundHover`), scale transforms (`scale: 0.98`), and disabled states (`opacity: 0.4`).

---

## ⚡ 4. Local AI & Offline-First Core Operations

- **Local Inference Integration:** All automated text extraction and vision evaluation routines must run entirely locally. Dispatch calls must hit the local Ollama server endpoint (`http://localhost:11434`) targeting `gemma4` or `gemma2`.
- **Asynchronous Vision Auditing:** File receiver logic must intercept proof-of-work Viber screenshot uploads asynchronously. Convert images to Base64, process via local vision models, and commit outputs to the `ai_verification_status` column (`VERIFIED` vs. `MISMATCH`).
- **Offline-First Network Guardrails:** NEVER write standard `fetch` or `axios` calls that can throw fatal unhandled promise rejections on network failure. All outbound API requests must be wrapped in try/catch blocks that gracefully degrade to local SQLite queue inserts.

---

## ⚠️ 5. Automation Enforcement & Fail-Safes

- **Dynamic Margin Safeguard:** If an editable pricing box receives a negotiated rate dropping >15% below the shop's wholesale category price book, transition the `<Box>` border to the semantic `danger` color token and lock submission behind a mandatory "Confirm Overridden Margin" safety checkbox.
- **Thread Guard Utilities:** All background data parsing streams, AI model connections, and massive SQLite transactional query executions must be wrapped tightly within the `guardAsync` utility to prevent main-thread UI lockups and silent crashes.

---

## 🔒 6. Asynchronous Queueing, Idempotency & Mobile Sync Guardrails

- **Idempotent Transaction Isolation:** All outward data synchronization writes must embed a unique, non-volatile `x-idempotency-key` (UUIDv4) committed to the local SQLite draft record _prior_ to network dispatch.
- **Deterministic Column-Level Merging (LWW):** Row-level data overwrites are strictly banned during network synchronization. The sync engine must dynamically evaluate updates via Column-Level "Last-Write-Wins" (LWW) using isolated metadata modification timestamps.
- **Async Task Offloading Constraint:** The NestJS API gateway must never compute heavy analytical parsing or execute local Ollama vision routines within the synchronous pipeline. Endpoints must immediately return an HTTP `202 Accepted` status and offload execution to BullMQ.
- **Volatile Thread Prevention:** Standard native background interval polling timers (`setInterval`, `setTimeout`) are completely forbidden for executing remote data fetches or synchronizing queues inside view components. Rely on structural, native OS hooks.

---

## 🛡️ 7. Auditing, Cryptography & Identity Constraints

- **Immutable Event Sourcing:** Direct SQL `UPDATE` or `DELETE` overwrites that destroy historical context are banned. Any modification to financial or inventory data must simultaneously commit a row to the `AuditEvents` Drizzle schema, capturing `previous_state` and `new_state` as JSONB.
- **Cryptographic Hash Chaining:** To prevent offline tampering by field operators, the mobile application must natively hash every local `AuditEvent` payload, chaining it mathematically to the hash of the preceding event.
- **Abstracted Actor Context:** Until a formal JWT gateway is implemented, the AI must never hardcode user identities. All queries, carts, and transactions must dynamically request the `actor_id` from the abstracted `ActorService` (mobile) or `ActorInterceptor` (backend) to ensure zero-friction authentication upgrades later.
- **Trace Context Propagation:** A unique `x-trace-id` must be generated at the onset of a workflow and attached to every linked SQLite draft cart, Viber screenshot upload, AI worker job, and `AuditEvent` to ensure 100% downstream observability.

---

## 🛠️ 8. TypeScript Coding Standards & Linting Guards

- **Forbid `any` Type Usage:** The use of the `any` type is strictly forbidden across all application code, packages, interfaces, and services. Cast values to `unknown`, `Record<string, unknown>`, or concrete interfaces/types instead. The only exception is inside test specification files (`*.spec.ts`, `*.spec.tsx`, `*.test.ts`, `*.test.tsx`).
- **Prohibit ESLint Disable Comments:** You must never write inline comments to disable, ignore, or bypass ESLint rules (e.g., `/* eslint-disable */`, `// eslint-disable-next-line`). Code must be refactored cleanly to naturally resolve warnings (such as using a leading underscore `_` prefix for declared but unused method arguments).
