# Burma Sales & Inventory Revamp: Master Plan

## Vision
To transition the family business's marketing operations from a reactive, chat-reliant team into a data-driven sales engine by providing a robust, offline-first system that bridges the gap between field activities and management visibility.

## Strategic Roadmap

The revamp is divided into four distinct phases, prioritizing infrastructure stability and core data collection before moving to advanced visualization and oversight.

| Phase | Title | Focus | Key Deliverable |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Foundational Infrastructure** | Offline-first sync & Master Data | Reliable Sync Server + Shop/SKU Ledger |
| **Phase 2** | **Interaction Logging** | Mobile-optimized field reporting | 30-sec Logging Form + Viber Integration |
| **Phase 3** | **Geographic Heatmap** | Market intelligence visualization | Map-based Relationship Dashboard |
| **Phase 4** | **Manager Oversight** | Accountability & Compliance | Team Pulse Grid + Automated EOD Digests |

---

## Detailed Phase Breakdown

### [Phase 1: Foundational Infrastructure](./01_Phase1_Foundational_Infrastructure.md)
Establishing the backbone. We migrate the current simple inventory schema to a robust relational model supporting Shops, Contacts, and Products. We ensure the Sync Server is stable and handles high-latency/offline scenarios typical of the Myanmar market.

### [Phase 2: High-Friction Interaction Logging](./02_Phase2_Interaction_Logging.md)
The "Front-line" tool. This phase focuses on the Rep experience. The goal is to replace Viber group chat dumping with a structured, 3 taps-to-save mobile interface that includes Viber proof-of-work screenshots and deep-linking.

### [Phase 3: Geographic Heatmap](./03_Phase3_Geographic_Heatmap.md)
The "Strategic View". We translate raw logs into a geographic "Relationship Heatmap". Management can visually identify account neglect (Red Bubbles) and high-value opportunities based on recency and volume.

### [Phase 4: Leadership Oversight](./04_Phase4_Leadership_Oversight.md)
The "Operational Engine". This phase adds the layer of accountability. Automated digests, "Team Pulse" grids for quota tracking, and velocity analysis to prevent data dumping at the end of the day.

---

## Technical Stack
- **Frontend**: React Native / Expo (Mobile-web)
- **Database**: WatermelonDB (SQLite for offline-first)
- **Backend**: Node.js Sync Server with Prisma
- **Auth**: Device ID based hardware verification
- **Deployment**: Localized server (due to power/internet stability)
