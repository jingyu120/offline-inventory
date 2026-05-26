# `ai-instructions.md` (System Prompt & Autonomous Execution Contract)

## 📌 1. Core Operating Constraints & Deployment Topology

- **Sales-First Rollout Isolation:** The platform is executing an offline field-sales intake deployment strategy. **MOCK, STUB, or OMIT** all active real-time warehouse inventory subtraction or stock deduction routines. All finalized checkout baskets must be captured cleanly as requested items with a default operational state enum of `PENDING_FULFILLMENT`.
- **Multilingual Localization Matrix:** The field-sales force operates in **Burmese (ဗမာစာ)**; back-office admin and engineering layout layers use **English**. Default all frontend user-facing display strings to Burmese (`my`), matching the token dictionary mappings in `mobile-web/src/utils/translations.ts`. Provide English (`en`) visibility toggles strictly within explicit administrative or logging views.
- **Styling Framework Ban:** This repository strictly prohibits the use of Tailwind CSS, `className` strings, inline standard CSS parameters, or HTML/Web style attributes. The entire UI environment is constructed using **Shopify Restyle** type-safe tokens. All layouts must use strongly-typed `<Box>` and `<Text>` component primitives exported from `@burma-inventory/ui-components`.

---

## 🗃️ 2. Spreadsheet Data Integration & Schema Consistency

Autonomous structural modifications to schemas (`shared-types/src/lib/schema.ts`) or data ingest logic must strictly reflect your master balance sheet data realities:

- **Parentheses Allocation Logic:** Data entities enclosed in parentheses (e.g., `(1,756)` units of Crocodile GP Grout) denote **Pending Committed Orders**, not negative balances or layout errors. Parsing transformations must strip parentheses symbols, convert strings to positive integers, and commit values directly into the `pending_allocation_count` tracking column.
- **Signed Integer Configurations:** Configure product quantity attributes as explicit signed integers (`integer()`) to handle legacy deficit structures safely across backend Postgres and client SQLite environments without throwing structural constraints or sync abort errors.
- **Data Suffix Isolation:** Variant dimensions, finishing codes (`CP` for Polished Chrome, `BL` for Brass Lacquered), and structural classes (`RE` for Regular, `MR` for Moisture Resistant) must be parsed out of main item name text lines. Store these attributes as clear sub-type or array relationships to populate layout pill selectors cleanly.
- **Stock Quality Segregation:** Natively support inventory condition metrics. Maintain a `stock_condition` enum supporting `GOOD`, `BAD`, and `WET` options to allow field representatives to book clearance transactions for water-damaged or clearance stock items dynamically.
- **B2B Bulk Project Tracking:** Provide a dedicated `Project` database layout model linked to orders. Field representatives must be allowed to route volume items straight to enterprise commercial construction contract profiles (e.g., _Galaxy Tower-3_, _Zaw Residence_, _Wisteria KT_) to isolate structural job velocity from standard retailer routes.

---

## 🏗️ 3. Frontend Component Architecture Standards (Shopify Restyle)

The agent must autonomously enforce type-safe Shopify Restyle components across all screen refactors. Bypassing these properties with inline web styles is an automatic build-breaking infraction:

### Spatial Token Scaling System

All element sizing, margins, padding, and layout bounding blocks must reference pre-configured theme string tokens mapping strictly to an 8-point spatial matrix:

- `s` -> 8px (Tight structural gaps, labels, item details)
- `m` -> 16px (Standard layout padding, card inner boxes, text margins)
- `l` -> 24px (Screen borders, prominent section containers)
- `xl` -> 32px (Major view wrappers, asymmetric spatial offsets)

### Layout Densities & Typographic Hierarchy

- **Asymmetric Grid Splitting:** Layout screens (e.g., `ShopLedgerScreen`) must structure data weights via explicit layout configurations: primary data tracking lists or baskets must occupy an asset layout width of `col-span-8`, while secondary details or filtering drawers align inside a tight `col-span-4` space.
- **Mono-Font Numeric Alignment:** All rendering items presenting quantities, Kyat cash metrics, product code SKUs, or package conversion parameters must explicitly enforce your monospace typography token (`fontFamily: 'monospace'` or equivalent font primitive modifier). This freezes visual text layouts from dancing or shifting dimensions during real-time field count modifications.
- **Stacked Inputs:** Data collection boxes must use vertical layout structures—stacking clear text labels above dark matte entry containers equipped with type-safe focus rings tracking: `focus-within:ring-2 focus-within:ring-emerald-500/50`.

### Interaction States & Micro-Animations

Clickable items (`Pressable`) must apply immediate visual feedback loops mapping directly to your base theme token properties:

- **Hover State:** Transition container backgrounds from default surfaces to mid-tone shades (e.g., `cardBackground` to `cardBackgroundHover`) and enhance boundaries to `border-zinc-700`.
- **Active Press State:** Execute hardware-accelerated transforms to scale layouts down slightly during click interactions (`scale: 0.98`) to deliver responsive, physical haptic-style feedback.
- **Disabled Null Boundaries:** If a query returns no historical transaction arrays for an account (e.g., order duplication selectors targeted at a brand-new storefront profile), apply an explicit `opacity: 0.4` alpha mask and shift active input interaction pointers to `cursor: not-allowed`.

### Theme-Safe Semantic Color Palette

Status states, alert badges, and condition labels must be colored exclusively via your type-safe semantic color tags:

- Verified Records / Active Allocations / Good Stock -> `color="success"` or `backgroundColor="successLight"`
- Margin Guidelines Exceptions / Discount Overrides -> `color="warning"` or `backgroundColor="warningLight"`
- Audit Mismatches / Damaged Stock / Sync Deficit Errors -> `color="danger"` or `backgroundColor="dangerLight"`

---

## ⚡ 4. Local AI Operations Core (Gemma 4 Pipeline)

- **Local Inference Integration:** All automated parsing summaries, text extraction loops, and image evaluation routines must run on local server infrastructure. The codebase prohibits connections to external subscription cloud models. Dispatch calls must hit your local Ollama server endpoint (`http://localhost:11434`) targeting the local `gemma4` or `gemma2` inference models.
- **Structured Analytics Compilation:** The `compileEod(date)` task must run inside try/catch isolation guards. It must pull down raw text text notes captured by field representatives, analyze market demand, and structure data blocks cleanly into predefined JSON return arrays tracking `topPerformingRep`, `marketSynthesis`, and `complianceWarnings`.
- **Asynchronous Vision Screenshot Auditing:** File receiver logic inside `sync.controller.ts` must intercept proof-of-work Viber screenshot uploads asynchronously via local task handlers. The vision engine must convert saved image binaries into Base64 formats, process text orders via local vision logic models, and commit confirmation outputs directly to the `ai_verification_status` table row parameters (`VERIFIED` vs. `MISMATCH`).

---

## ⚠️ 5. Automation Enforcement & Fail-Safes

- **Dynamic Margin Safeguard:** If an editable pricing box inside `SelectedItemsList.tsx` receives a custom negotiated rate that dips more than 15% below the shop's designated wholesale category price book, transition the text border outline to your semantic `danger` color token and lock the submission routine behind a mandatory "Confirm Overridden Margin" safety checkbox gate.
- **Thread Guard Utilities:** All background data parsing streams, AI model connection blocks, and raw transactional query executions must be wrapped tightly within the project's strict `guardAsync` utility layout to ensure unexpected data execution errors do not cause core server thread exceptions or terminal platform lockups.
