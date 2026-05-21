# Revamp Documentation & Feature Plans

This directory holds the roadmap documentation, product requirement documents (PRDs), and design specs outlining both completed and future feature phases for the Burma Sales & Inventory system.

---

## 📂 Folder Organization

- **[`revamp/`](./revamp)**: Contains the multi-phase implementation roadmap mapping the transition from messaging groups (Viber) to a structured, offline-first, AI-assisted platform.

---

## 🗺️ Revamp Roadmaps & Phase Specs

Refer to individual phase documents for detailed technical specifications, database schemas, and UX guidelines:

1. **[`00_Master_Plan.md`](./revamp/00_Master_Plan.md)**: The strategic vision, core status metrics, and timeline summarizing Phases 1 through 10.
2. **[`01_Phase1_Foundational_Infrastructure.md`](./revamp/01_Phase1_Foundational_Infrastructure.md)**: DB migration protocols (WatermelonDB + Prisma) and configuration-driven synchronization setup.
3. **[`02_Phase2_Interaction_Logging.md`](./revamp/02_Phase2_Interaction_Logging.md)**: Sales interaction forms, voice note parsing, and Viber screenshot integration.
4. **[`03_Phase3_Geographic_Heatmap.md`](./revamp/03_Phase3_Geographic_Heatmap.md)**: Leaflet-based relationship heatmap mapping client neglect zones and sentiment parameters.
5. **[`04_Phase4_Leadership_Oversight.md`](./revamp/04_Phase4_Leadership_Oversight.md)**: Compliance reports, quota tracking, EOD digests, and velocity logging checks.
6. **[`05_Phase5_Route_Optimization.md`](./revamp/05_Phase5_Route_Optimization.md)**: GPS route mapping, offline Leaflet map cache schemes, and distance-restricted check-ins.
7. **[`06_Phase6_Automated_Viber_Chatbot.md`](./revamp/06_Phase6_Automated_Viber_Chatbot.md)**: Conversational Viber integration enabling direct text/voice entries to Gemma AI services.
8. **[`07_Phase7_Predictive_Analytics_Forecasting.md`](./revamp/07_Phase7_Predictive_Analytics_Forecasting.md)**: Order frequency models, demand forecasting, stockout warnings, and churn classification.
9. **[`08_Phase8_Asynchronous_Image_Sync.md`](./revamp/08_Phase8_Asynchronous_Image_Sync.md)**: Details separate, high-latency-friendly queues for uploading binary proof-of-work screenshot attachments.
10. **[`09_Phase9_Multi_Currency_Price_Books.md`](./revamp/09_Phase9_Multi_Currency_Price_Books.md)**: Covers multi-currency handling (MMK, USD, THB) and regional pricing lists synced offline.
11. **[`10_Phase10_Gamified_Rep_Engagement.md`](./revamp/10_Phase10_Gamified_Rep_Engagement.md)**: Outlines gamification triggers, streaks, and performance leaderboards.
