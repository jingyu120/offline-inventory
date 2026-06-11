# Client Application (`mobile-web`)

Expo (React Native) app targeting **native devices and the web** (via
`react-native-web`). Offline-first: it reads/writes a local SQLite database at
zero latency and syncs to `sync-server` in the background.

> System design lives in [`ARCHITECTURE.md`](../ARCHITECTURE.md); engineering
> rules in [`.agents/rules/`](../.agents/rules). This README is a package map.

## Structure

```
mobile-web/src/
├── app-root/App.tsx         # Thin composition shell + lifecycle hooks
├── config/appConfig.ts      # Typed client config (no raw process.env)
├── core/                    # Infrastructure
│   ├── database/            # SQLite: database.native.ts (op-sqlite) / .web.ts (sql.js+IndexedDB)
│   ├── data/repositories.ts # THE local data-access layer (mappers + fetchers)
│   ├── i18n/translations.ts # Burmese (my) / English (en) dictionaries
│   ├── store/               # Zustand stores
│   ├── trpc/trpcClient.ts   # Typed client for the server AppRouter
│   └── utils/               # crypto, geo, pricing, telemetry, guards, …
└── features/<domain>/       # admin · audit · inventory · sync · viber
    ├── screens/             # Declarative screen shells
    ├── components/          # Presentational sub-components (<200 lines)
    └── hooks/               # Data fetching, mutations, state machines
```

## Conventions (enforced — see `.agents/rules/coding.md`)

- **Data-access boundary:** screens/components never import `database` or
  `trpcClient` directly — they go through `core/data` repositories surfaced via
  a `features/<domain>/hooks/use*` hook. All async writes use `guardAsync`.
- **Decomposition:** screen > ~200 lines → extract a hook + sub-components.
  Reference patterns: `features/audit` (ShopLedger), `features/viber`
  (Order Drafter), `features/inventory` (Intake).
- **Styling:** Shopify Restyle tokens via `@burma-inventory/ui-components` only —
  no Tailwind, `StyleSheet.create`, or raw `<View>`/`<TouchableOpacity>`.
- **Platform code:** `*.native.ts` / `*.web.ts` extension pairs, not
  `Platform.OS` branches in shared logic.

## Local storage

A local **SQLite** DB accessed through **Drizzle ORM** —
`@op-engineering/op-sqlite` (synchronous JSI) on native, `sql.js` (WASM)
persisted to **IndexedDB** on web. Table definitions live in
`@burma-inventory/shared-types` `db/schema-sqlite.ts`; the runtime DDL lives in
`core/database/database.{web,native}.ts` (keep the two in sync).

## Responsive layout

Adapts at a `768px` breakpoint via `useWindowDimensions()`: a dense multi-pane
desktop layout (header tab navigation) and a card-based mobile layout (bottom
tab bar).

## Develop

From the repo root: `npm run dev` (starts server + Metro); web opens at
`http://localhost:8081`.
