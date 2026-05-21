# PRD: Phase 6 - Automated Viber Chatbot

## Goal

Improve reporting efficiency and operational oversight by integrating a Viber Chatbot. This bot enables sales representatives to log interactions using text/voice messages on Viber, queries client ledger snapshots directly, and broadcasts real-time alerts to managers.

---

## 1. Core Requirements

### A. Conversational Data Entry (Rep-facing)

- Reps text/voice message details directly to the Viber Business Account (e.g., _"Visited Aung San Store, sold 50 units of SKU-PB-640, owner interested in premium line"_).
- The sync server forwards the incoming text/voice transcript to the **Gemma AI** service.
- Gemma parses the unstructured report into a structured JSON log matching our schema variables (`shopId`, `sku`, `quantity`, `notes`) and responds with a confirmation dialog card.

### B. Quick Ledger Queries (Rep-facing)

- Representatives query shop profiles directly within Viber:
  - `?info [Shop Name]`: Returns address, primary contact, and current sentiment score.
  - `?history [Shop Name]`: Lists the last three interactions and top-selling products.

### C. Automated Manager Alerts (Manager-facing)

- Pushes real-time alerts to the manager's Viber thread for:
  - Account Neglect warnings (e.g., high-value shop entering the 14-day zero-contact zone).
  - Quota Violation notifications (e.g., representative submits zero entries by 6:00 PM).
  - High-Priority Market Intelligence flagged by Gemma AI (e.g., competitor pricing drops).

---

## 2. Technical Architecture

```
User (Viber App) <==================> Viber API Gateway
                                            ||
                                            \/
                                  NestJS Webhook Endpoint
                                            ||
                  ======================================
                  ||                                  ||
                  \/                                  \/
           [Rep Messages]                      [System Alerts]
                  ||                                  ||
                  \/                                  \/
        Gemma NLP Parser Service              Notification Service
                  ||                                  ||
                  \/                                  \/
         Update PostgreSQL DB                 Forward to Viber User
```

---

## 3. Database Schema Extensions

### A. Prisma Schema Updates (`sync-server/prisma/schema.prisma`)

Extend models to store Viber user identifiers for mapping accounts:

```prisma
model ViberChannel {
  id             String   @id @default(uuid())
  userId         String   @unique @map("user_id") // Maps to User model
  viberProfileId String   @unique @map("viber_profile_id") // Viber chat user ID
  role           String   @default("REP") // "REP" or "MANAGER"
  createdAt      DateTime @default(now()) @map("created_at")

  user           User     @relation(fields: [userId], references: [id])

  @@map("viber_channels")
}
```

---

## 4. Implementation Steps

1. **Viber API Gateway Setup**: Register webhook endpoints (`POST /api/viber/webhook`) securely handling Viber HTTP callbacks.
2. **Gemma Natural Language Parser**: Create a structured prompt that parses unstructured Viber messages into valid database operations:
   - Example prompt outputs: `{ "action": "log", "shop": "Aung San", "status": "ORDER_PLACED", "items": [{ "sku": "SKU-PB-640", "qty": 50 }] }`
3. **Viber Query Dispatcher**: Implement a router matching patterns (`?info`, `?history`) and returning formatted text cards.
4. **Manager Alert Service**: Integrate Viber API triggers into NestJS lifecycle hooks (e.g., sync post-save and daily quota check triggers).
