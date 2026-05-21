# Burma Sales & Inventory Revamp: Master Plan

## Vision

To transition the family business's marketing operations from a reactive, chat-reliant team into a data-driven sales engine by providing a robust, offline-first system that bridges the gap between field activities and management visibility.

## Strategic Roadmap

The revamp is divided into distinct phases, prioritizing infrastructure stability and core data collection before moving to advanced visualization, automated workflows, and forecasting.

| Phase        | Title                           | Focus                                      | Key Deliverable                            | Status             |
| :----------- | :------------------------------ | :----------------------------------------- | :----------------------------------------- | :----------------- |
| **Phase 1**  | **Foundational Infrastructure** | Offline-first sync & Master Data           | Reliable Sync Server + Shop/SKU Ledger     | **100% Completed** |
| **Phase 2**  | **Interaction Logging**         | **Gemma 4 AI Copilot** & Field Reporting   | 30-sec Voice/Text Form + Viber Integration | **100% Completed** |
| **Phase 3**  | **Geographic Heatmap**          | **Gemma 4 Sentiment Analytics** & Mapping  | Map-based Relationship Dashboard           | **100% Completed** |
| **Phase 4**  | **Manager Oversight**           | **Gemma 4 EOD Summarization** & Compliance | Team Pulse Grid + Automated Digests        | **100% Completed** |
| **Phase 5**  | **Route Optimization**          | GPS Dispatch & Routing                     | Offline Route Maps & Check-In Validation   | **Planned**        |
| **Phase 6**  | **Viber Chatbot Automation**    | Automated Data Entry                       | Direct Viber NLP Logging & Alerts          | **Planned**        |
| **Phase 7**  | **Predictive Analytics**        | Demand & Churn Forecasting                 | Recommended Order Engine & Churn Alerts    | **Planned**        |
| **Phase 8**  | **Asynchronous Image Sync**     | Decoupled Media Transfers                  | Background Upload Queue & WiFi Filtering   | **Planned**        |
| **Phase 9**  | **Multi-Currency Price Books**  | Financial Context & Pricing                | Multi-Currency Orders & Region Price Books | **Planned**        |
| **Phase 10** | **Gamified Rep Engagement**     | Driving User Adoption                      | Points Engine, Streaks, & Leaderboards     | **Planned**        |

---

## Detailed Phase Breakdown

### [Phase 1: Foundational Infrastructure](./01_Phase1_Foundational_Infrastructure.md) - **Completed**

Establishing the backbone. We migrate the current simple inventory schema to a robust relational model supporting Shops, Contacts, and Products. We ensure the Sync Server is stable and handles high-latency/offline scenarios typical of the Myanmar market.

### [Phase 2: High-Friction Interaction Logging](./02_Phase2_Interaction_Logging.md) - **Completed**

The "Front-line" tool. This phase focuses on the Rep experience. The goal is to replace Viber group chat dumping with a structured, 3 taps-to-save mobile interface that includes Viber proof-of-work screenshots and deep-linking.

### [Phase 3: Geographic Heatmap](./03_Phase3_Geographic_Heatmap.md) - **Completed**

The "Strategic View". We translate raw logs into a geographic "Relationship Heatmap". Management can visually identify account neglect (Red Bubbles) and high-value opportunities based on recency and volume.

### [Phase 4: Leadership Oversight](./04_Phase4_Leadership_Oversight.md) - **Completed**

The "Operational Engine". This phase adds the layer of accountability. Automated digests, "Team Pulse" grids for quota tracking, and velocity analysis to prevent data dumping at the end of the day.

### [Phase 5: Route Optimization & Scheduling](./05_Phase5_Route_Optimization.md) - **Planned**

Optimizes travel paths for reps. Maps daily check-in tasks based on store coordinates, highlights neglected clients, and supports offline route access with distance-based check-in verification.

### [Phase 6: Automated Viber Chatbot](./06_Phase6_Automated_Viber_Chatbot.md) - **Planned**

Leverages conversational chat interfaces to record customer interactions using Viber. Reps text reports to the bot, which automatically parses transactions using Gemma AI, and pushes notifications directly to managers.

### [Phase 7: Predictive Analytics & Forecasting](./07_Phase7_Predictive_Analytics_Forecasting.md) - **Planned**

Calculates SKU order frequency and historical demand per shop to predict stockouts, flags stores at risk of churn, and projects LTV growth metrics onto management dashboards.

### [Phase 8: Asynchronous Image Sync](./08_Phase8_Asynchronous_Image_Sync.md) - **Planned**

Decoupled queues uploading binary attachments (proof-of-work screenshot uploads) independently from core metadata synchronization loops. Prevents blocking client operations and saves mobile network bandwidth.

### [Phase 9: Multi-Currency & Regional Price Books](./09_Phase9_Multi_Currency_Price_Books.md) - **Planned**

Extends offline transactions to support multi-currency ordering (MMK, USD, THB), caches regional client-level price sheets, and synchronizes daily exchange rates for automated localized conversion calculations.

### [Phase 10: Gamified Representative Engagement](./10_Phase10_Gamified_Rep_Engagement.md) - **Planned**

Drives compliance and prompt reporting behavior using scoring rules. Awards points for real-time entries, applies multipliers for consecutive streaks, enforces data-dumping penalties, and displays live performance leaderboards.

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
