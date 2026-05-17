# PRD: Phase 1 - Foundational Infrastructure & Master Data

## Goal

Establish a resilient, offline-first data backbone and centralize Master Data (Shops, SKUs, and Regions) to eliminate manual entry errors and support high-latency regional syncs.

---

## 1. Relational Database Schema (Prisma PostgreSQL)

You MUST implement the following schemas and relationships in `sync-server/prisma/schema.prisma`. All datetime stamps in PostgreSQL are mapped to CamelCase fields with `@map("snake_case")` matching database standards.

```prisma
// Expanded User Model
model User {
  id        String   @id @default(uuid())
  username  String   @unique
  password  String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relationships
  regionId        String?          @map("region_id")
  region          Region?          @relation(fields: [regionId], references: [id])
  assignedShops   Shop[]
  interactionLogs InteractionLog[]
  dailyQuotas     DailyQuota[]

  @@map("users")
}

// 1. Regions Table (Geographic Scaling & Routing)
model Region {
  id        String   @id @default(uuid())
  name      String   @unique
  division  String   // E.g., "Yangon Division", "Shan State"
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  shops     Shop[]
  reps      User[]

  @@map("regions")
}

// 2. Shops Table (With Lat/Long for Visual Heatmapping)
model Shop {
  id             String   @id @default(uuid())
  name           String
  address        String
  latitude       Float?   // GPS Coordinates for visual map representation
  longitude      Float?   // GPS Coordinates for visual map representation
  regionId       String   @map("region_id")
  assignedRepId  String?  @map("assigned_rep_id")
  lifetimeValue  Decimal  @default(0) @db.Decimal(12, 2) @map("lifetime_value")
  sentimentTrend String   @default("STABLE") @map("sentiment_trend") // E.g., "IMPROVING", "STABLE", "DECLINING"
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")
  deletedAt      DateTime? @map("deleted_at")

  region        Region           @relation(fields: [regionId], references: [id])
  assignedRep   User?            @relation(fields: [assignedRepId], references: [id])
  contacts      Contact[]
  interactions  InteractionLog[]

  @@map("shops")
}

// 3. Contacts Table
model Contact {
  id          String   @id @default(uuid())
  shopId      String   @map("shop_id")
  name        String
  phoneNumber String   @map("phone_number")
  email       String?
  isPrimary   Boolean  @default(false) @map("is_primary")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  shop        Shop     @relation(fields: [shopId], references: [id], onDelete: Cascade)

  @@map("contacts")
}

// 4. Items Table (SKU Master Ledger)
model Item {
  id        String   @id @default(uuid())
  sku       String   @unique // E.g., "SKU-PB-640"
  name      String
  unitPrice Decimal  @db.Decimal(10, 2) @map("unit_price")
  category  String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  interactionItems InteractionItem[]

  @@map("items")
}

// 5. InteractionLogs Table (Daily Activity Logging)
model InteractionLog {
  id                 String   @id @default(uuid())
  shopId             String   @map("shop_id")
  repId              String   @map("rep_id")
  type               String   // E.g., "PHONE_CALL", "VIBER", "SHOP_VISIT"
  commercialStatus   String   @map("commercial_status") // E.g., "FOLLOWED_UP", "INTERESTED", "ORDER_PLACED", "NOT_INTERESTED"
  notes              String   @db.Text
  nextFollowUpDate   DateTime? @map("next_follow_up_date")
  viberScreenshotUrl String?  @map("viber_screenshot_url")
  createdAtLocal     DateTime @map("created_at_local") // Captured instantly using the device clock when rep clicks "Save"
  syncedAtServer     DateTime? @map("synced_at_server")
  isOfflineEntry     Boolean  @default(false) @map("is_offline_entry")
  deviceId           String   @map("device_id")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")
  deletedAt          DateTime? @map("deleted_at")

  shop               Shop              @relation(fields: [shopId], references: [id])
  rep                User              @relation(fields: [repId], references: [id])
  interactionItems   InteractionItem[]

  @@map("interaction_logs")
}

// 6. InteractionItems Table (Item 1: Many-to-Many Bridge)
model InteractionItem {
  id                 String   @id @default(uuid())
  interactionLogId   String   @map("interaction_log_id")
  itemId             String   @map("item_id")
  quantity           Int      @default(1)
  unitPriceAtSale    Decimal  @db.Decimal(10, 2) @map("unit_price_at_sale")
  interestLevel      String?  @map("interest_level") // E.g., "HIGH", "MEDIUM", "LOW"

  interaction        InteractionLog @relation(fields: [interactionLogId], references: [id], onDelete: Cascade)
  item               Item           @relation(fields: [itemId], references: [id])

  @@map("interaction_items")
}

// 7. DailyQuotas Table (Item 4: Dynamic Target Accountability)
model DailyQuota {
  id            String   @id @default(uuid())
  userId        String   @map("user_id")
  targetVisits  Int      @default(0) @map("target_visits")
  targetPhone   Int      @default(0) @map("target_phone")
  targetViber   Int      @default(0) @map("target_viber")
  effectiveFrom DateTime @map("effective_from")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  deletedAt     DateTime? @map("deleted_at")

  user          User     @relation(fields: [userId], references: [id])

  @@map("daily_quotas")
}
```

---

## 2. Local Database Schema (WatermelonDB / SQLite)

The mobile client uses WatermelonDB. Ensure the client-side schema matches the backend tables in lowercase snake_case. Storing coordinates as numeric fields and timestamps as UNIX millisecond values (`number`) is mandatory for compliance with WatermelonDB query filters.

```typescript
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 2, // Incremented version to support schema expansion
  tables: [
    tableSchema({
      name: 'regions',
      columns: [
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'division', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'shops',
      columns: [
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'address', type: 'string' },
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
        { name: 'region_id', type: 'string', isIndexed: true },
        { name: 'assigned_rep_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'lifetime_value', type: 'number' },
        { name: 'sentiment_trend', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'contacts',
      columns: [
        { name: 'shop_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'phone_number', type: 'string' },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'is_primary', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'items',
      columns: [
        { name: 'sku', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'unit_price', type: 'number' },
        { name: 'category', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'interaction_logs',
      columns: [
        { name: 'shop_id', type: 'string', isIndexed: true },
        { name: 'rep_id', type: 'string', isIndexed: true },
        { name: 'type', type: 'string' },
        { name: 'commercial_status', type: 'string' },
        { name: 'notes', type: 'string' },
        { name: 'next_follow_up_date', type: 'number', isOptional: true },
        { name: 'viber_screenshot_url', type: 'string', isOptional: true },
        { name: 'created_at_local', type: 'number' },
        { name: 'synced_at_server', type: 'number', isOptional: true },
        { name: 'is_offline_entry', type: 'boolean' },
        { name: 'device_id', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'interaction_items',
      columns: [
        { name: 'interaction_log_id', type: 'string', isIndexed: true },
        { name: 'item_id', type: 'string', isIndexed: true },
        { name: 'quantity', type: 'number' },
        { name: 'unit_price_at_sale', type: 'number' },
        { name: 'interest_level', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'daily_quotas',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'target_visits', type: 'number' },
        { name: 'target_phone', type: 'number' },
        { name: 'target_viber', type: 'number' },
        { name: 'effective_from', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
```

---

## 3. Enhanced Sync Protocol Implementation (pull/push mechanics)

The sync server MUST support all 7 tables in both push and pull phases. Follow the established sync pattern in NestJS (`sync.service.ts`).

### Pull Phase (`GET /api/sync?last_pulled_at=<timestamp>`)

1.  **Selective Sync Filtering**: Users must only sync Master Data belonging to their active `region_id` or that has global accessibility.
2.  **Schema Payload Structure**: The returned payload must match the format:
    ```typescript
    export interface PullChangesResponse {
      changes: {
        regions: WatermelonChangeSet<RegionRecord>;
        shops: WatermelonChangeSet<ShopRecord>;
        contacts: WatermelonChangeSet<ContactRecord>;
        items: WatermelonChangeSet<ItemRecord>;
        interaction_logs: WatermelonChangeSet<InteractionLogRecord>;
        interaction_items: WatermelonChangeSet<InteractionItemRecord>;
        daily_quotas: WatermelonChangeSet<DailyQuotaRecord>;
      };
      timestamp: number;
    }
    ```
3.  **Soft Deletes Handling**: Check for `deletedAt` field timestamp checks. Do not return records with `deletedAt` populated unless they fell within the synced deleted list.

### Push Phase (`POST /api/sync`)

1.  **Strict Transaction Batching**: Updates to related models (e.g. inserting an `InteractionLog` along with its linked `InteractionItem` records) must be executed in a single backend database transaction using `$transaction`.
2.  **Conflict Resolution**: Use a **Last-Write-Wins** strategy based on `updatedAt` timestamps. If a local entry was updated offline and collides with a server change, the latest `updatedAt` timestamp prevails.
3.  **Timestamp Correction**: When syncing `InteractionLog` values, silently map the server's sync timestamp to `syncedAtServer` while leaving the immutable device clock timestamp `createdAtLocal` completely unchanged.

---

## 4. Specific Edge Cases to Handle

1.  **Sync Collision on Join Tables**: Ensure `InteractionItem` rows are synced _after_ their parent `InteractionLog` records have successfully completed creation on the server to prevent Foreign Key constraint crashes.
2.  **Mobile Date/Time Drift**: If a device's internal clock is incorrect due to manual user shifts, prioritize local sequence order. Keep `createdAtLocal` exactly as the device reports it for consistency verification, but rely on the server clock to assign `syncedAtServer` during cloud database commit steps.
3.  **Network Resilience & Retry Limits**: In low signal zones, client-side sync loops can crash. Configure Axios sync requests with a `30-second timeout` limit and back-off retry logic (exponential retry delay: 2s, 4s, 8s).
4.  **Soft Deletes Garbage Collection**: Keep deleted records in SQLite locally until the sync response confirms they are officially logged by the server. Once synced, purge local soft-deleted records from SQLite to preserve device memory.

---

## 5. Phase 1 Implementation Status - **100% Completed**

- **Database Schemas & Relations**: Full schemas for regions, shops, contacts, items, logs, items-log join, and quotas are fully deployed in PostgreSQL and SQLite formats.
- **Sync Protocol Backend**: Fully automated config-driven mapping logic with registry handles incremental synchronization, soft delete propagation, and `$transaction` safety checks.
- **macOS Dev Sandbox**: Solved native macOS client credential bugs using SQL fallback scripts.
- **Precommit Check Engine**: Integrated custom git hook gating all builds.
- **UI Integration**: Fully integrated inside the `ShopLedgerScreen` component, demonstrating dynamic data representation of the relational structure.

