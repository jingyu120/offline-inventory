# Burma Inventory System

A lightweight, offline-first Sales & Inventory Relationship Manager built for regional sales representatives and management. The system transitions family-run operations away from chaotic chat-group reporting (Viber) to a structured, data-driven database, ensuring resilience against frequent network dropouts and electrical blackouts.

---

## 💡 How the App Works

1. **Local Logging**: Sales reps visit or message shops and log their interactions (calls, Viber, in-person visits) in under 30 seconds.
2. **Offline-First Resilience**: If the internet or electricity is down, records are stored securely in local database storage.
3. **Seamless Synchronization**: The application continuously monitors network status and background syncs queued records to the server database.
4. **Viber Integration**: Reps deep-link directly into Viber conversations and upload compressed proof-of-work chat screenshots.
5. **Relationship Heatmap**: Managers view an interactive, color-coded map showing account health (Neglected vs Active) based on contact recency.
6. **Oversight Dashboard**: Management tracks rep compliance via a daily grid and receives EOD summary reports compiled by local Gemma AI services.

---

## 🏗️ Project Architecture

This application is built in a TypeScript monorepo managed with **Nx**:

- **[mobile-web/](file:///Users/justin.zhang/Desktop/burma/burma-inventory/mobile-web)**: The frontend React Native/Expo app. Adapts between **Katana Cloud Inventory** (Desktop table/grid views) and **Sortly** (Mobile touch card views).
- **[sync-server/](file:///Users/justin.zhang/Desktop/burma/burma-inventory/sync-server)**: Express + Prisma API server processing synchronized changes, scheduled EOD cron tasks, and local Gemma AI parsing.
- **[ui-components/](file:///Users/justin.zhang/Desktop/burma/burma-inventory/ui-components)**: Shared UI components built with `@shopify/restyle`.
- **[shared-types/](file:///Users/justin.zhang/Desktop/burma/burma-inventory/shared-types)**: Common data types and interfaces.

Refer to the [**ARCHITECTURE.md**](file:///Users/justin.zhang/Desktop/burma/burma-inventory/ARCHITECTURE.md) and [**GUIDING_PRINCIPLES.md**](file:///Users/justin.zhang/Desktop/burma/burma-inventory/GUIDING_PRINCIPLES.md) files for more information.

---

## ⚡ Setup & Execution

### Prerequisites

- Node.js (v18+)
- Docker (for local PostgreSQL database)

### Installation

Install dependencies in the root directory:

```bash
npm install
```

### Running the Services

1. **Start the Database**:
   Launch the containerized Postgres database:

   ```bash
   npm run db:up
   ```

2. **Run Sync Server**:
   Start the sync backend in development mode:

   ```bash
   npx nx serve sync-server
   ```

3. **Run Client Application**:
   Start the Expo development server:

   ```bash
   npx nx start mobile-web
   ```

4. **Run Code Validation**:
   Validate code formatting, lint rules, types, and unit tests:
   ```bash
   npm run check
   ```

---

## 📘 Future Roadmaps & Plans

Refer to the [**documentation/revamp/**](file:///Users/justin.zhang/Desktop/burma/burma-inventory/documentation/revamp) directory for full development history and future implementation specs:

- `00_Master_Plan.md`: Revamp phases and goals.
- `05_Phase5_Route_Optimization.md`: Intelligent routing coordinates.
- `06_Phase6_Automated_Viber_Chatbot.md`: Auto-replies and data entry via chat.
- `07_Phase7_Predictive_Analytics_Forecasting.md`: AI demand planning.
