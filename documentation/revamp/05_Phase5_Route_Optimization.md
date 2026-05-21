# PRD: Phase 5 - Route Optimization & Smart Visitation Scheduling

## Goal

Optimize sales representatives' field visits by calculating efficient travel routes using GPS coordinates, highlighting priority shops that are neglected or due for contact, and supporting fully offline route viewing.

---

## 1. Core Requirements

### A. Intelligent Route Calculation

- Calculate a path connecting selected shops starting from the representative's location or a regional hub.
- Highlight neglected shops (Red markers in the Warning/Neglected Zone) to prioritize them.
- Map coordinates in a list showing step-by-step visitation order.

### B. Offline Route Caching

- Pre-cache Leaflet map tiles along the planned route using the offline-first IndexedDB system (`tileDb`).
- Store planned routes in WatermelonDB so reps can view their daily schedule, addresses, and contacts without cellular service.

### C. Check-In Verification

- Check-in button matching GPS distance: Reps check in at a shop only if their device's GPS coordinates are within `100 meters` of the shop's recorded location.
- If offline, cache checked-in timestamps for automatic backend synchronization.

---

## 2. Relational Database Schema Extensions

### A. Prisma Schema Updates (`sync-server/prisma/schema.prisma`)

Add a new model for planned routes and checked-in logs:

```prisma
model PlannedRoute {
  id         String   @id @default(uuid())
  repId      String   @map("rep_id")
  date       DateTime @db.Date
  shopIds    String[] @map("shop_ids") // Ordered list of shop IDs to visit
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  rep        User     @relation(fields: [repId], references: [id])

  @@unique([repId, date])
  @@map("planned_routes")
}

model CheckInLog {
  id             String   @id @default(uuid())
  shopId         String   @map("shop_id")
  repId          String   @map("rep_id")
  checkInTime    DateTime @map("check_in_time")
  latitude       Float
  longitude      Float
  verified       Boolean  @default(false)
  isOfflineEntry Boolean  @default(false) @map("is_offline_entry")
  createdAt      DateTime @default(now()) @map("created_at")

  shop           Shop     @relation(fields: [shopId], references: [id])
  rep            User     @relation(fields: [repId], references: [id])

  @@map("check_in_logs")
}
```

### B. WatermelonDB Client Schema Extensions

Add corresponding local tables:

- `planned_routes`: columns `rep_id` (string), `date` (number), `shop_ids` (string JSON list), `created_at` (number), `updated_at` (number).
- `check_in_logs`: columns `shop_id` (string), `rep_id` (string), `check_in_time` (number), `latitude` (number), `longitude` (number), `verified` (boolean), `is_offline_entry` (boolean), `created_at` (number).

---

## 3. Implementation Steps

1. **Prisma & Local DB Migrations**: Run db migrations to add `planned_routes` and `check_in_logs`.
2. **Sync Service Integrations**: Update NestJS `SyncService` registry to handle syncing routes and check-in logs.
3. **Route Planning View (Desktop)**: Build a route designer in the leadership panel using Leaflet drag-and-drop to let managers compile routes and assign them to reps.
4. **Active Route View (Mobile)**: Build a card list detailing the rep's daily path, highlighting distances, and displaying contact cards.
5. **Check-In Verification Component**: Add GPS verification buttons that activate when the representative is nearby the target store.
