# Shared Types (`shared-types`)

The **single source of truth** shared by `mobile-web` and `sync-server`:
database schemas, domain/record types, runtime validation, the tRPC contract,
and core primitives. Import via `@burma-inventory/shared-types`.

> System design: [`ARCHITECTURE.md`](../ARCHITECTURE.md). Rules:
> [`.agents/rules/`](../.agents/rules).

## Structure

```
shared-types/src/lib/
├── db/
│   ├── schema.ts            # PostgreSQL Drizzle tables (server)
│   ├── schema-sqlite.ts     # SQLite Drizzle tables (client)
│   ├── schema-relations.ts  # Drizzle relational metadata (kept out of the table layer)
│   └── schema-parity.spec.ts# Guard: fails on unintended PG↔SQLite drift
├── types/
│   ├── records.ts           # snake_case on-disk / on-the-wire record interfaces
│   ├── domain.ts            # camelCase app-facing interfaces
│   ├── sync.ts              # sync transport types (WatermelonChangeSet, SyncTableName)
│   └── shared-types.ts      # domain constants + zod validation; barrel re-export
├── api/trpc.ts              # tRPC appRouter schema + exported AppRouter type
├── utils/guard.ts           # guardAsync error-isolation primitive
└── ai/semanticSearch.ts     # TF-IDF item search used by client + server
```

## Schema parity (important)

The Postgres and SQLite schemas are kept aligned for all **shared** tables. Two
divergences are intentional and **enforced by `db/schema-parity.spec.ts`**:

1. Platform-only tables — server-only (`users`, `sync_audit_logs`,
   `idempotency_keys`), client-only (`image_upload_queue`, `draft_carts`).
2. Server-only columns on shared tables — `deleted_at` (soft-delete) and
   `interaction_logs.ai_verification_*`.

Adding a column to one platform without the other, or a new shared table that
drifts, will fail that test. Update the schemas **and** the parity allowlist
together — never silence the guard.

## Conventions

- **Derive, don't duplicate** types (`Pick`/`Omit`/`InferSelectModel`); the
  snake_case records and camelCase domain types are the two intentional shapes.
- The barrel `types/shared-types.ts` preserves the public import path — keep
  runtime values (zod, constants, `guardAsync`) importable from it.
- No coverage threshold here, but the existing specs (incl. the parity guard)
  must stay green.
