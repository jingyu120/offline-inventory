# Backend Sync Server (`sync-server`)

**NestJS** backend (Express/Fastify adapters) exposing a **tRPC** router plus
REST controllers. It orchestrates offline sync push/pull, AI processing, and
background jobs against **PostgreSQL via Drizzle ORM**.

> System design: [`ARCHITECTURE.md`](../ARCHITECTURE.md). Rules:
> [`.agents/rules/`](../.agents/rules).

## Structure (Controller/Router → Service → Repository → Drizzle)

```
sync-server/src/app/
├── core/                       # Infrastructure
│   ├── drizzle/                # Connection service (read/write split)
│   ├── seed/                   # Fixtures + DatabaseSeeder (boot seed)
│   ├── config/app-config.ts    # AppConfig — all thresholds/magic values
│   ├── auth/                   # ActorInterceptor / ActorService
│   ├── trpc/                   # tRPC router + controller (mounts AppRouter)
│   ├── queue/                  # BullMQ queue + worker (DLQ)
│   └── pipes/                  # zod validation pipe
└── features/
    ├── sync/                   # SyncService (orchestrator) + collaborators:
    │                           #   ConflictResolutionService, AnomalyDetectionService,
    │                           #   audit/audit-hash, sync-registry (snake↔camel)
    ├── ai/                     # AiService facade →
    │                           #   ModelDispatcher / Sentiment / EodCompiler /
    │                           #   PaymentOcr / ScreenshotVerifier
    └── health/
```

## Transports & key endpoints (`/api`)

- **tRPC** (`/api/trpc/*`) is the typed primary transport: `sync.pull`,
  `sync.push`, `eodDigest`, `analyzeSentiment`, `getSyncLogs`,
  `quotaOptimizations`, mismatch/DLQ procedures.
- **REST** controllers handle multipart **uploads** (`POST /api/sync/upload`),
  tiles, the Viber webhook, and health — delegating sync to the same
  `SyncService`.

## Conventions (enforced — see `.agents/rules/coding.md`)

- Controllers/resolvers do IO only; services hold logic; query construction
  stays in the Drizzle/repository layer. No god services.
- Thresholds (anomaly multiplier/window, batch-dump window, auto-invoice
  due/grace days, LLM retry/backoff) live in `AppConfig`, never inline.
- Heavy AI/OCR/analytics offload to BullMQ — never block the sync path.
- Mutations to financial/inventory data also append an `audit_events` row
  (hash-chained) in the same transaction.

## Run

`npm run dev` (root) builds and serves this with hot-reload (nodemon over the
webpack watch). Server: `http://localhost:3000/api`.
