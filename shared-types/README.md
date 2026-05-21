# Shared Types Module (`shared-types`)

This module defines common TypeScript types, interface contracts, and schema representations shared across the frontend React Native client (`mobile-web`) and the backend `sync-server`.

---

## 📂 Core File Structure

- `src/lib/shared-types.ts`: Contains core database model schemas, API sync request/response interfaces, and application enum states.

---

## ⚙️ Shared Enums & Statuses

To prevent data fragmentation via typos or mismatching states, the application uses strict, shared domain options:

### 1. Interaction Types

```typescript
export type InteractionType = 'PHONE_CALL' | 'VIBER' | 'SHOP_VISIT';
```

### 2. Commercial Statuses

```typescript
export type CommercialStatus = 'FOLLOWED_UP' | 'INTERESTED' | 'ORDER_PLACED' | 'NOT_INTERESTED';
```

### 3. Sentiment Trends

```typescript
export type SentimentTrend = 'IMPROVING' | 'STABLE' | 'DECLINING';
```

---

## 🗄️ Core Domain Models

These models match the fields of the PostgreSQL database tables on the backend and correspond to the client-side local database schemas:

- `User`: Representative user accounts.
- `Region`: Geographic sales territories.
- `Shop`: Stores visited by sales reps (contains GPS coordinates, LTV, and sentiment states).
- `Contact`: Shop owners and store phone numbers.
- `Item`: The Master SKU ledger (defines code, description, and price).
- `InteractionLog`: Single visit/call log containing status, next follow-up, and Viber screenshot.
- `InteractionItem`: Join table documenting which SKU products the customer was interested in or bought.
- `DailyQuota`: Targets set for reps' calls and visits.

---

## 📡 Synchronization Interface Payload Contracts

To ensure synchronization safety, the shared models define the structured payloads transmitted in sync requests:

```typescript
export interface WatermelonChangeSet<T> {
  created: T[];
  updated: T[];
  deleted: string[]; // List of IDs soft-deleted
}

export interface SyncPullPayload {
  lastPulledAt: number | null; // UNIX timestamp
  regionId?: string;
}

export interface SyncPullResponse {
  changes: {
    regions: WatermelonChangeSet<Region>;
    shops: WatermelonChangeSet<Shop>;
    contacts: WatermelonChangeSet<Contact>;
    items: WatermelonChangeSet<Item>;
    interaction_logs: WatermelonChangeSet<InteractionLog>;
    interaction_items: WatermelonChangeSet<InteractionItem>;
    daily_quotas: WatermelonChangeSet<DailyQuota>;
  };
  timestamp: number; // Server-stamped timestamp
}

export interface SyncPushPayload {
  changes: {
    regions: WatermelonChangeSet<Region>;
    shops: WatermelonChangeSet<Shop>;
    contacts: WatermelonChangeSet<Contact>;
    items: WatermelonChangeSet<Item>;
    interaction_logs: WatermelonChangeSet<InteractionLog>;
    interaction_items: WatermelonChangeSet<InteractionItem>;
    daily_quotas: WatermelonChangeSet<DailyQuota>;
  };
  lastPulledAt: number;
}
```
