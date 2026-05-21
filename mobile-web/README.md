# Client Application Module (`mobile-web`)

The client application is built with React Native and Expo, targeting both modern desktop web browsers and native mobile applications. It uses an offline-first data lifecycle powered by WatermelonDB and synchronizes with a central server.

---

## 📂 Project Architecture

```
mobile-web/src/
├── app-root/                 # Views, Navigation, and Screens
│   ├── components/           # Subcomponents (ledger sidebar, detail sheets, filter cards)
│   ├── App.tsx               # Top-level shell with viewport-aware layout navigation
│   ├── ShopLedgerScreen.tsx  # Customer Ledger container (split-screen / card navigation)
│   ├── GeographicHeatmapScreen.tsx # Leaflet Map plotting client locations
│   └── TeamPulseScreen.tsx   # Manager dashboard tracking representative compliance
├── data/                     # WatermelonDB schemas, repositories, and models
│   ├── database.ts           # Local DB instance instantiation
│   └── repositories.ts       # Database helper queries for shops, contacts, logs
├── hooks/                    # Context fetching logic and query wrappers
├── utils/                    # Localization utilities (i18n), and authentication hooks
└── sync.ts                   # Sync synchronization coordinator
```

---

## 💾 Local Storage (WatermelonDB)

- **Source of Truth**: The client stores all transactional and master data in WatermelonDB.
- **Web Storage**: On web targets, WatermelonDB compiles schema changes to a browser-backed **IndexedDB** engine.
- **Native Storage**: On iOS/Android, it falls back to native **SQLite**.
- **Query Bindings**: React components observe data queries using `@nozbe/watermelondb` utilities. This ensures the UI updates reactively when data is added or modified locally.

---

## 📱 Responsive Layout Strategy

The UI dynamically adapts to the browser viewport size using `useWindowDimensions()` at a breakpoint of `768px`.

- **Desktop Mode (`isDesktop = width >= 768`)**:
  - Emulates **Katana Cloud Inventory** ERP.
  - Screen options are toggled in a top header panel using horizontal tab pills.
  - Lists and Details are shown side-by-side using multi-pane desktop layouts.
  - High information density with compact table components.
- **Mobile Mode (`!isDesktop`)**:
  - Emulates **Sortly** visual card aesthetics.
  - Active screens are managed via a fixed **Bottom Tab Navigation Bar** with distinct Lucide icons.
  - Shop lists render visual avatar cards with initials and green/red/indigo sentiment rings.
  - Shop interaction logs feature inline quick-actions (⚡ **Log Interaction**) directly on the list cards.
  - Tapping a card transitions the view to a dedicated full-screen pane with a clean "Back" arrow button.

---

## 🔄 Synchronization System

- **Background Sync Trigger**: Synchronization is initiated by `syncData(database)` inside a background cycle or manual click.
- **Request Mechanics**:
  - Fetches modifications from local storage since the last sync.
  - Queries `GET /api/sync` to pull backend changes.
  - Posts local changes via `POST /api/sync` inside a single API payload.
- **Timestamp Tracking**: Records offline interaction logs with the exact local device timestamp (`createdAtLocal`), allowing correct daily velocity graphing on the dashboard.
- **Image Compression**: Screenshots are compressed to `<200KB` on-device before writing to storage to conserve field representative bandwidth.

---

## 🌐 Localization (i18n)

The application fully supports multilingual configuration matching the Myanmar regional market:

- **Burmese (`my`)**: Primary translation target for field representatives.
- **English (`en`)**: Primary translation target for managers.
- Language configuration is toggled in the header and persisted locally.
