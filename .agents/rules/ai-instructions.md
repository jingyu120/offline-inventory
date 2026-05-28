---
trigger: always_on
---

# `ai-instructions.md` (System Prompt & Autonomous Execution Contract)

## 📌 1. Core Operating Constraints & Deployment Topology

- **Sales-First Rollout Isolation:** The platform is executing an offline field-sales intake deployment strategy. **MOCK, STUB, or OMIT** all active real-time warehouse inventory subtraction routines. Finalized checkout baskets must be captured as requests with an operational state enum of `PENDING_FULFILLMENT`.
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
- **Spatial Token Scaling (8pt System):** All element sizing, margins, padding, and layout bounding blocks must reference predefined Restyle theme tokens:
  - `s` -> 8px
  - `m` -> 16px
  - `l` -> 24px
  - `xl` -> 32px
- **React Native Flexbox Asymmetry:** Do not use CSS Grid. Split screens (e.g., `ShopLedgerScreen`) must structure data weights via Flexbox ratios: assign the primary data tracking list `<Box flex={2}>`, and secondary filtering drawers `<Box flex={1}>`.
- **Mono-Font Numeric Alignment:** All layout elements presenting quantities, Kyats, or SKUs must explicitly enforce your monospace typography token (e.g., `variant="mono"`) to freeze visual widths during live calculations.
- **Interaction States:** Clickable items (`Pressable` from your UI library) must apply:
  - Background transitions (`cardBackground` to `cardBackgroundHover`).
  - Hardware-accelerated scale transforms (`scale: 0.98`) during active presses.
  - Disabled states must apply `opacity: 0.4` and disable the `onPress` handler gracefully.

---

## ⚡ 4. Local AI & Offline-First Core Operations

- **Local Inference Integration:** All automated text extraction and vision evaluation routines must run entirely locally. Dispatch calls must hit the local Ollama server endpoint (`http://localhost:11434`) targeting `gemma4` or `gemma2`.
- **Asynchronous Vision Auditing:** File receiver logic must intercept proof-of-work Viber screenshot uploads asynchronously. Convert images to Base64, process via local vision models, and commit outputs to the `ai_verification_status` column (`VERIFIED` vs. `MISMATCH`).
- **Offline-First Network Guardrails:** NEVER write standard `fetch` or `axios` calls that can throw fatal unhandled promise rejections on network failure. All outbound API requests must be wrapped in try/catch blocks that gracefully degrade to local SQLite queue inserts when the device lacks internet connectivity.

---

## ⚠️ 5. Automation Enforcement & Fail-Safes

- **Dynamic Margin Safeguard:** If an editable pricing box receives a negotiated rate dropping >15% below the shop's wholesale category price book, transition the `<Box>` border to the semantic `danger` color token and lock submission behind a mandatory "Confirm Overridden Margin" safety checkbox.
- **Thread Guard Utilities:** All background data parsing streams, AI model connections, and massive SQLite transactional query executions must be wrapped tightly within the `guardAsync` utility to prevent main-thread UI lockups and silent crashes.

---

## 🔒 6. Asynchronous Queueing, Idempotency & Mobile Sync Guardrails

To prevent data corruption over highly unstable networks and protect the mobile main thread, the AI must enforce the following strict patterns:

- **Idempotent Transaction Isolation:** All outward data synchronization writes from the mobile device to the backend must embed a unique, non-volatile `x-idempotency-key` (UUIDv4) attached to the network header payload. The AI must never generate this key dynamically inline; it must be committed to the local SQLite draft record prior to dispatch to survive app process crashes or forced OS terminations.
- **Deterministic Column-Level Merging (LWW):** Row-level data overwrites are strictly banned during network synchronization reconciliation layers. The sync engine must dynamically evaluate updates via Column-Level "Last-Write-Wins" (LWW). Every editable column attribute must carry an isolated metadata modification timestamp to ensure independent field updates merge atomically without triggering blocking sync conflict modals.
- **Async Task Offloading Constraint:** The NestJS API gateway must never compute heavy analytical parsing or execute local Ollama vision routines within the synchronous request-response execution pipeline. All image uploads, Viber screenshots, and text extractions must immediately return an HTTP `202 Accepted` status along with a tracking hash, offloading execution entirely to an abstract, reliable, background task engine (BullMQ).
- **Volatile Thread Prevention:** Standard native background interval polling timers (`setInterval`, `setTimeout`) are completely forbidden for executing remote data fetches or synchronizing queues inside view components. All mobile background executions must strictly delegate to structural, native OS hooks managed via the globally registered task execution runner interface.
