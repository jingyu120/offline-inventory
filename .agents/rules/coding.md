---
trigger: always_on
---

# Engineering Standards & Guardrails

The enforceable engineering contract for this repo. Pair it with
[`ai-instructions.md`](./ai-instructions.md) (product domain + offline-first
architecture). When these rules and a stale doc disagree, **these rules win** —
then fix the stale doc.

## 0. Golden rules (read first)

These exist because the codebase previously accumulated 1,000–1,500 line "god"
files, components doing their own DB access, copy-pasted logic, and docs that
described a stack that no longer existed. Do not reintroduce any of it.

1. **No god files.** A server service > ~400 lines or a React component > ~200
   lines must be decomposed (see §3, §4). Split _before_ it grows, not after.
2. **Respect the layers.** Components/controllers do IO and rendering only.
   Business logic lives in services/hooks; data access lives in
   repositories/the data layer. Never skip a layer (see §3).
3. **No `any` / `$Any`.** Use real types, `unknown` + narrowing, or utility
   types. (Tests may use `any` only where a mock genuinely requires it.)
4. **Wrap every async DB/network op in `guardAsync`** (from
   `@burma-inventory/shared-types`). No bare `fetch`/`axios`/`db` calls that can
   throw an unhandled rejection.
5. **No magic values.** Extract to a typed config layer (`AppConfig` on the
   server, `config/appConfig.ts` on the client) or named `readonly` constants.
6. **Never lower coverage thresholds** to make tests pass (see §8).
7. **Keep docs in sync — automatically and unprompted.** If a change makes any
   doc stale (README, `ARCHITECTURE.md`, these rule files, code comments,
   `.env.example`), update it in the **same change**, without being asked — a
   task is not done while a doc it touched is wrong (see §9). Stale docs are how
   this repo ended up describing Prisma/WatermelonDB it never used.

## 1. Build & verification commands

This is an **Nx monorepo** on **Node 22** (`.nvmrc`). Run `nvm use` before any
node command. Verify with the workspace scripts (never hand-roll per-project
commands):

- **Typecheck:** `npm run typecheck`
- **Lint:** `npm run lint`
- **Test (with coverage gate):** `npm run test`
- **Format:** `npm run format` / `npm run format:check`
- **Everything:** `npm run check`
- **Run the app:** `npm run dev` (see `scripts/` and root `README.md`)

## 2. Workflow

- **Plan-Then-Execute:** For non-trivial work, output a brief, high-density plan
  (architectural impact, schema/migration needs, target files) and wait for
  confirmation before editing.
- **No code omissions:** Output complete blocks or precise diffs. Never leave
  `// ... unchanged` or `// TODO` placeholders.
- **Atomic, layered changes:** Schema → core logic → API/router → UI, verifying
  at each layer. Keep a single logical change per step.
- **Test co-generation:** Every new service, hook, util, or endpoint ships with
  a co-located `*.spec.ts(x)` (see §8).
- **Never leave the tree broken:** typecheck, lint, and tests must pass before
  you consider a task done.

## 3. Layering & module boundaries (server)

Strict **Controller/Router → Service → Repository → Drizzle** flow.

- **Controllers/tRPC resolvers** handle transport/IO only: validate input
  (zod/DTO), call a service, shape the response. No business logic, no queries.
- **Services** hold business logic and orchestration. A service method does
  **one** logical thing; if it orchestrates many, it delegates to focused
  collaborator services (e.g. `ConflictResolutionService`,
  `AnomalyDetectionService`, `EodCompilerService`).
- **Repositories / the Drizzle layer** own query construction. Do not scatter
  raw Drizzle queries across services when they represent reusable data access.
- **Never inline raw SQL** or string-interpolate queries — use Drizzle's
  parameterized builder.
- **Validate at the boundary:** every request payload maps to a zod schema /
  DTO. Don't leak raw DB rows outbound; map to response shapes.
- **Heavy/async work off the request path:** LLM/OCR/analytics go through BullMQ
  (return `202`-style immediately); never block the sync pipeline.

## 4. Layering & module boundaries (client)

Strict **Screen → Hook(s) → Presentational components**, backed by the data
layer. Reference implementations: `features/audit` (ShopLedger),
`features/viber` (Order Drafter), `features/inventory` (Intake).

- **Components are declarative shells.** No data fetching, mutations, DB access,
  `fetch`/`trpcClient` calls, pricing/credit math, or state machines in a
  component body — those live in custom hooks (`features/<x>/hooks/`) or pure
  helper modules (`features/<x>/<topic>.ts`).
- **Data-access boundary (hard rule):** components and screens **must not**
  import `database` or `trpcClient` directly. Local reads/writes go through the
  data layer (`core/data/*` repositories) surfaced via a feature hook; server
  calls live in hooks. If a query is missing, add it to the hook or a feature
  helper — not inline in JSX.
- **Three states always:** every data-driven view renders Fetching, Empty/Null,
  and Error.
- **Decompose at the limits:** screen > ~200 lines → extract a `use<Feature>`
  hook for data/state and split JSX into sub-200-line presentational components.
  Reuse existing components in the feature folder; don't duplicate them.
- **Platform isolation:** no `Platform.OS` branching inside shared data-logic
  files — use `*.native.ts` / `*.web.ts` extension pairs.

## 5. Type safety

- **Strict TypeScript, no `any`/`$Any`** (Golden Rule 3). Cast to `unknown` and
  narrow, or use `Record<string, unknown>` / concrete types.
- **Explicit signatures:** public functions, hooks, services, and endpoints
  declare explicit parameter and return types.
- **Single source of truth for types:** derive variants with `Pick`/`Omit`/
  `Partial`/`ReturnType` and Drizzle `InferSelectModel`; never hand-duplicate a
  type that already exists in `@burma-inventory/shared-types`.
- **No ESLint disable comments.** Refactor to satisfy the rule (e.g. `_`-prefix
  unused args) instead of `// eslint-disable-next-line`.
- **Workspace import aliases only** (`@burma-inventory/...`). No `../../../`
  relative-path spaghetti across packages.

## 6. Error handling & resilience

- **`guardAsync` everywhere** for async DB/network/file work (Golden Rule 4);
  surface failures through the UI's toast/error-boundary, don't swallow them.
- **Defensive by default:** handle null/undefined returns, empty arrays/strings,
  timeouts, and negative/overflowing numbers before writing the happy path.
- **Offline-first:** failed network writes degrade to the local SQLite queue and
  retry on reconnect — never crash the runtime.

## 7. Clean code & SRP

- **SRP:** functions/hooks/classes do one thing. A util > ~25 lines or a method
  doing more than one orchestration step gets decomposed into pure functions.
- **Self-documenting code:** comments explain _why_ (non-obvious constraints),
  never _what_. Use descriptive names (`isUserEligibleForDiscount`, not
  `checkDisc`).
- **DRY — Rule of Three:** a block/calculation copied to 3+ places must be
  extracted (helper/hook/base service). Concretely: do not ship N near-identical
  methods (e.g. per-table upload-URL updaters) — parameterize one.
- **But avoid the wrong abstraction:** duplication is cheaper than coupling two
  domains that merely look alike today. Merge only when intent is truly shared.

## 8. Testing & the coverage ratchet

- **Co-located specs**, named after the source file (`sync.service.ts` →
  `sync.service.spec.ts`). Top-level `describe` matches the unit name; nest per
  method/interaction.
- **Isolate:** mock Drizzle/Postgres, HTTP, Ollama, and storage with Jest. No
  real network or DB writes. Use factory helpers (`createMockShop()`), not
  inline mock sprawl.
- **UI:** wrap in the Restyle `ThemeProvider`; query via
  `@testing-library/react-native` roles/testIDs; assert interaction states.
- **NestJS:** build deps with `Test.createTestingModule()` and provider
  overrides.
- **Coverage ratchet (do not fight it):** `npm run test` enforces per-project
  thresholds that auto-bump upward (`scripts/bump-thresholds.js`); **never lower
  them.** Note the v8 provider only measures files a test imports — so new code
  pulled into a tested import chain needs its own tests, and a new module added
  beside untested screens is coverage-neutral until a test imports it.

## 9. Keep documentation in sync (automatically)

**Documentation is part of the change, not a follow-up.** Whenever a change you
make causes a doc to go stale, you must update that doc in the **same change,
proactively — without being asked**. "Done" is defined to include accurate docs;
a PR that leaves a doc describing code that no longer exists is incomplete. This
is non-negotiable — drifted docs are exactly how this repo ended up documenting
Prisma/WatermelonDB/Express it never used.

Before finishing any task, scan for docs your change invalidated and fix them.
Trigger → action:

- Folder/file moved or renamed, stack or pattern changed → update
  [`ARCHITECTURE.md`](../../ARCHITECTURE.md) and the affected package
  `README.md` (their structure trees and prose).
- New/changed/removed npm script or CLI flag → update the root `README.md`
  command table and [`scripts/README.md`](../../scripts/README.md).
- New engineering rule, anti-pattern, or convention → update **these** rule
  files (`.agents/rules/`).
- New/changed env var → update `.env.example`.
- Behavior/flow change a user feature doc describes → update
  `documentation/` (e.g. `USER_GUIDE.md`, `GUIDING_PRINCIPLES.md`).
- Code comments that no longer match the code → fix or delete them.
- **Schema parity:** the Postgres (`schema.ts`) and SQLite (`schema-sqlite.ts`)
  Drizzle schemas must stay aligned for shared tables; the
  `db/schema-parity.spec.ts` guard enforces the allowed divergences — update it
  deliberately, never silence it.

If you are unsure whether a doc is now stale, grep it for the symbol/path/stack
you changed and verify, rather than assuming it is fine.

## 10. Configuration

- **No raw `process.env` / `window.ENV`** outside the central config layer
  (server `AppConfig`, client `config/appConfig.ts`, validated env modules).
- **Behavioral parameters** (limits, thresholds, retry intervals, due-dates)
  come from config, never hardcoded in services.
- **Secrets** come from env via the config service; update `.env.example` when
  adding a variable; never hardcode credentials.
- **Babel/Expo gotcha:** the client uses `babel-preset-expo`, which already
  applies `loose: true` to the class-feature plugins. Do **not** add a top-level
  `assumptions` block or re-declare those plugins — it conflicts with the preset
  and spams a warning on every compiled file.
