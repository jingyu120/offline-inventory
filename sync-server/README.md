# Backend Sync Server (`sync-server`)

The sync server acts as the central datastore and synchronization coordinator. It exposes REST API endpoints for synchronization pull/push workflows, runs nightly supervisor auditing cron jobs, and manages local Gemma AI text processing services.

---

## 📂 Project Architecture

```
sync-server/
├── prisma/
│   ├── schema.prisma   # PostgreSQL relational data definitions
│   └── seed.ts         # Base master SKUs and shops seed generator
└── src/
    ├── app/
    │   ├── sync.service.ts # Core sync pull/push orchestration handler
    │   ├── sync.controller.ts # API routing endpoints
    │   ├── gemma.service.ts # Gemma AI parser, sentiment classification, and compiler
    │   └── eod.cron.ts    # Nightly manager summaries email schedule
    ├── main.ts         # Express server init
    └── prisma.service.ts # Global Prisma client injection
```

---

## 📡 API Routing Endpoints

All core API operations are mapped under `/api`:

### 1. Synchronization Mechanics

- **`GET /api/sync`**:
  - Pulls database updates since `last_pulled_at`.
  - Filters results according to the requesting representative's `regionId`.
- **`POST /api/sync`**:
  - Receives lists of created, updated, or soft-deleted records from the client.
  - Updates PostgreSQL in a single transactional pipeline (`$transaction`).
  - Resolves conflicts using a **Last-Write-Wins** strategy based on `updatedAt` timestamps.

### 2. EOD Summaries

- **`GET /api/eod/compile`**: compiles an EOD summary of sales velocity and compliance metrics.
- **`POST /api/eod/adjust-quotas`**: pushes adjustments to quotas based on performance data.

---

## 🤖 Gemma AI Integration Services

The server exposes integration services for the local/hosted Google **Gemma AI** model:

1. **OCR / Voice Transcription Parsing**: Resolves freeform raw notes logged by reps into structured transaction values and SKU lists.
2. **Sentiment Analysis**: Evaluates customer feedback text, scoring interactions to determine shop sentiment indicators (`IMPROVING`, `STABLE`, `DECLINING`).
3. **EOD Summarization**: Triggered at 8:00 PM to compile rep activities, sales numbers, and alerts into an EOD summary report.

---

## ⏰ Nightly Scheduler (Cron Auditing)

A background job scheduler executes compliance and velocity audits:

- **Daily Quotas**: Compares logged interactions against daily representative quotas (visits, phone calls, Viber contacts).
- **Batch Updates Detection**: Scans user logs to identify "Batch Updates". If a representative logs more than 5 shop entries within a compressed 15-minute window, the system flags the day as potentially containing dumped records rather than real-time field entries.
- **Auto-Emailer**: Dispatches the Gemma-compiled EOD report to management.
