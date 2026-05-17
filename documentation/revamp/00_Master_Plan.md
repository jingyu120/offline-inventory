# Burma Sales & Inventory Revamp: Master Plan

## Vision
To transition the family business's marketing operations from a reactive, chat-reliant team into a data-driven sales engine by providing a robust, offline-first system that bridges the gap between field activities and management visibility.

## Strategic Roadmap

The revamp is divided into four distinct phases, prioritizing infrastructure stability and core data collection before moving to advanced visualization and oversight.

| Phase | Title | Focus | Key Deliverable | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | **Foundational Infrastructure** | Offline-first sync & Master Data | Reliable Sync Server + Shop/SKU Ledger | **100% Completed** |
| **Phase 2** | **Interaction Logging** | **Gemma 4 AI Copilot** & Field Reporting | 30-sec Voice/Text Form + Viber Integration | **In Progress** (Schema/models ready) |
| **Phase 3** | **Geographic Heatmap** | **Gemma 4 Sentiment Analytics** & Mapping | Map-based Relationship Dashboard | **Planned** (GPS coordinates ready) |
| **Phase 4** | **Manager Oversight** | **Gemma 4 EOD Summarization** & Compliance | Team Pulse Grid + Automated Digests | **Planned** (Daily quota schema ready) |

---

## Detailed Phase Breakdown

### [Phase 1: Foundational Infrastructure](./01_Phase1_Foundational_Infrastructure.md) - **Completed**
Establishing the backbone. We migrate the current simple inventory schema to a robust relational model supporting Shops, Contacts, and Products. We ensure the Sync Server is stable and handles high-latency/offline scenarios typical of the Myanmar market.

### [Phase 2: High-Friction Interaction Logging](./02_Phase2_Interaction_Logging.md) - **In Progress**
The "Front-line" tool. This phase focuses on the Rep experience. The goal is to replace Viber group chat dumping with a structured, 3 taps-to-save mobile interface that includes Viber proof-of-work screenshots and deep-linking.

### [Phase 3: Geographic Heatmap](./03_Phase3_Geographic_Heatmap.md) - **Planned**
The "Strategic View". We translate raw logs into a geographic "Relationship Heatmap". Management can visually identify account neglect (Red Bubbles) and high-value opportunities based on recency and volume.

### [Phase 4: Leadership Oversight](./04_Phase4_Leadership_Oversight.md) - **Planned**
The "Operational Engine". This phase adds the layer of accountability. Automated digests, "Team Pulse" grids for quota tracking, and velocity analysis to prevent data dumping at the end of the day.

---

## Current Project Status (May 2026)

- **Phase 1 Accomplishments**:
  - **Prisma & WatermelonDB relational schemas** successfully aligned for all 7 entities (`regions`, `shops`, `contacts`, `items`, `interaction_logs`, `interaction_items`, `daily_quotas`).
  - **Config-Driven Sync Module** on sync-server: Replaced legacy boilerplate with `TABLE_REGISTRY` that automates incremental push & pull with soft delete support and transaction batching.
  - **Automatic macOS Docker Workaround**: Replaced native Prisma db push issues with a smart shell wrapper (`scripts/db.sh`) that dynamically generates DDL migrations and runs them over containerized Postgres direct-access.
  - **Prism Service & Global Configuration**: Extracted database connection to a globally injected global module and unified `.env` management.
  - **Robust Pre-Commit Hook**: Git pre-commit checks run and require all workspace packages to pass type-checking, formatting, ESLint, and builds before allowing code commits.
- **Frontend State**:
  - The main application interface (`mobile-web`) is fully updated to render dynamic, region-scoped shop list grids with contact and status details.

---

## Technical Stack
- **Frontend**: React Native / Expo (Mobile-web)
- **Database**: WatermelonDB (SQLite for offline-first)
- **Backend**: Node.js Sync Server with NestJS & Prisma
- **AI Engine**: Google Gemma 4 (Local/hosted LLM for OCR, voice parsing, sentiment scoring, and summarization)
- **Auth**: Device ID based hardware verification
- **Deployment**: Localized server (due to power/internet stability)
