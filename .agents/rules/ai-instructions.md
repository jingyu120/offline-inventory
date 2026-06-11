---
trigger: always_on
---

# AI Instructions — Product Domain & Architecture Contract

Domain, product, and offline-first architecture rules. Pair with
[`coding.md`](./coding.md) (enforceable engineering standards). For the full
system design see [`ARCHITECTURE.md`](../../ARCHITECTURE.md).

## 🗺️ 0. Repository map (where things live)

Nx monorepo, Node 22. Use workspace aliases (`@burma-inventory/*`), never deep
relative paths.

- **`shared-types/`** — single source of truth: Drizzle schemas
  (`src/lib/db/schema.ts` = Postgres, `src/lib/db/schema-sqlite.ts` = SQLite,
  `src/lib/db/schema-relations.ts`), domain/record types (`src/lib/types/*`:
  `records.ts`, `domain.ts`, `sync.ts`), zod validation + constants
  (`src/lib/types/shared-types.ts`), the tRPC `AppRouter` type
  (`src/lib/api/trpc.ts`), and `guardAsync` (`src/lib/utils/guard.ts`).
- **`sync-server/`** — NestJS backend. `app/core/*` = infrastructure (drizzle,
  config `AppConfig`, auth, trpc, queue, seed); `app/features/*` = domain
  (`sync/` with its conflict/anomaly/audit collaborators, `ai/` with its
  model-dispatcher/sentiment/eod/payment/screenshot services, `health/`).
- **`mobile-web/`** — Expo RN + web. `src/core/*` = infrastructure (database,
  data repositories `core/data/*`, i18n `core/i18n/translations.ts`, store,
  trpc, utils); `src/features/<domain>/{screens,components,hooks}` = UI.
- **`ui-components/`** — Restyle design system (theme, primitives, Button, Card,
  Table, TextField, DropdownSelector, Skeleton, shadows).

## 🎯 1. Absolute Directives: Business Domain & Flow

- **Domain Lockdown (CRITICAL):** This is strictly an **Internal Inventory &
  Sales Accountability engine** for regional Myanmar distribution. Focus on
  internal stock, B2B client sales, and personnel accountability. OMIT
  cross-border transit, customs, import tracking, and FX logistics.
- **Intake Quarantine Paradigm:** Warehouse intake is frictionless but
  safeguarded. New inventory defaults to `PENDING_APPROVAL` and is mathematically
  quarantined — it **cannot be deducted or added to a sales cart** until a
  manager advances it to `AVAILABLE`.
- **Transaction Accountability:** Every transaction cleanly separates human
  context: `shop_id`/`client_id` (who bought), `executed_by_id` (who keyed it),
  `salesperson_id` (who owns commission), `approved_by_id` (which manager
  authorized).

## 📌 2. Core Operating Constraints & Deployment Topology

- **Sales-First Rollout Isolation:** MOCK/STUB/OMIT real-time warehouse stock
  subtraction against `AVAILABLE` stock until approval flows are met. Checkout
  baskets are captured as requests with state `PENDING_FULFILLMENT`.
- **Multilingual Localization:** Field reps operate in **Burmese (ဗမာစာ)**;
  back-office/admin use **English**. Default user-facing strings to Burmese
  (`my`) using the dictionary in `mobile-web/src/core/i18n/translations.ts`;
  expose English (`en`) toggles only in admin views.
- **No hardcoded user strings:** all user-facing copy goes through the i18n
  layer (the translation guard, `npm run check-translations`, enforces this).

## 🗃️ 3. Data Integration & Schema Consistency

Structural schema changes (`shared-types/src/lib/db/schema.ts` and its SQLite
counterpart) must reflect master balance-sheet realities **and stay in parity**
(see the `schema-parity.spec.ts` guard; `coding.md` §9):

- **Parentheses Allocation Logic:** Values like `(1,756)` denote **Pending
  Committed Orders** — strip parentheses, convert to positive integer, commit to
  `pending_allocation_count`.
- **Signed Integer Configurations:** Product quantities are signed `integer()`
  to absorb legacy deficit structures without sync-abort errors.
- **Data Suffix Isolation:** Variant dimensions, finish codes (`CP`, `BL`), and
  structural classes (`RE`, `MR`) are parsed out of item-name text into sub-type
  fields for pill selectors.
- **Stock Quality Segregation:** `stock_condition` enum supports `GOOD`, `BAD`,
  `WET` for dynamic clearance bookings.
- **B2B Bulk Project Tracking:** a `Project` model links orders so reps can route
  volume to enterprise contracts (e.g. _Galaxy Tower-3_).

## 🏗️ 4. Frontend Architecture (Shopify Restyle & React Native)

**CRITICAL BAN:** No Tailwind, `className` strings, CSS Grid (`col-span`), raw
`StyleSheet.create`, or raw `react-native` UI imports (`<View>`,
`<TouchableOpacity>`). (For component/data-layer boundaries see `coding.md` §4.)

- **Component Sourcing:** import ALL layout/typography primitives from
  `@burma-inventory/ui-components`. No one-off synthetic UI inside screen files.
- **8pt Spatial Tokens:** size/margin/padding reference theme tokens only —
  `none: 0`, `xs: 4`, `s: 8`, `m: 16`, `l: 24`, `xl: 40` (px).
- **Flexbox, not Grid:** split screens via Flexbox ratios — primary list
  `<Box flex={2}>`, secondary drawer `<Box flex={1}>`.
- **Mono-Font Numeric Alignment:** quantities, Kyat metrics, and SKUs use the
  monospace font token (`fontFamily: 'monospace'`) to freeze widths during live
  calculation.
- **Interaction States:** clickable items apply background transitions, scale
  transforms (`scale: 0.98`), and disabled states (`opacity: 0.4`).

## ⚡ 5. Local AI & Offline-First Core

- **Local Inference Only:** text extraction and vision routines hit the local
  Ollama endpoint (`http://localhost:11434`, `gemma4`/`gemma2`) via the server's
  `ModelDispatcherService` — never an external cloud LLM.
- **Async Vision Auditing:** Viber proof screenshots are intercepted
  asynchronously, converted to Base64, processed by local vision models, and
  committed to `ai_verification_status` (`VERIFIED` vs `MISMATCH`).
- **Offline-First Network Guardrails:** never write bare `fetch`/`axios` that can
  throw a fatal rejection. Wrap outbound requests in **`guardAsync`** and degrade
  gracefully to the local SQLite queue (`coding.md` §6).

## ⚠️ 6. Automation Enforcement & Fail-Safes

- **Dynamic Margin Safeguard:** if a negotiated rate drops >15% below the shop's
  wholesale price-book floor, flip the field border to the `danger` token and
  lock submission behind a mandatory "Confirm Overridden Margin" checkbox. (The
  15% factor lives in config, not inline — `coding.md` §10.)
- **Thread-Guard Utilities:** background parsing, AI connections, and large
  SQLite transactions are wrapped in `guardAsync` to prevent main-thread lockups
  and silent crashes.

## 🔒 7. Async Queueing, Idempotency & Sync Guardrails

- **Idempotent writes:** outbound sync writes embed a non-volatile
  `x-idempotency-key` (UUIDv4) committed to the local draft record _before_
  dispatch.
- **Column-Level Last-Write-Wins:** row-level overwrites during sync are banned;
  the engine merges per-field via LWW using per-column modification timestamps
  (`ConflictResolutionService`).
- **Async offloading:** the NestJS gateway never runs heavy parsing or Ollama
  vision in the synchronous path — return immediately and offload to BullMQ.
- **No volatile timers in views:** `setInterval`/`setTimeout` for remote fetches
  or queue sync inside components are forbidden; use structural OS/app hooks.

## 🛡️ 8. Auditing, Cryptography & Identity

- **Immutable Event Sourcing:** destructive `UPDATE`/`DELETE` of historical
  context is banned. Any financial/inventory mutation also commits an
  `audit_events` row (`previous_state`/`new_state` as JSONB) in the same
  transaction.
- **Cryptographic Hash Chaining:** each local `AuditEvent` is hashed and chained
  to the prior event's hash to detect offline tampering.
- **Abstracted Actor Context:** never hardcode user identities. Resolve
  `actor_id` from the abstracted `ActorService` (mobile) / `ActorInterceptor`
  (backend) so a real JWT gateway drops in later without churn.
- **Trace Propagation:** a unique `x-trace-id` generated at workflow onset is
  attached to every linked draft cart, screenshot upload, AI job, and
  `AuditEvent` for end-to-end observability.
