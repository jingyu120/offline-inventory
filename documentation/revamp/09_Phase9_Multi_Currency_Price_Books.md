# PRD: Phase 9 - Multi-Currency & Regional Price Books

## Goal

Provide flexibility in volatile financial environments by enabling offline multi-currency calculations (MMK, USD, THB) and region/customer-specific price books (wholesale vs. retail sheets) for sales reps.

---

## 1. Core Requirements

### A. Multi-Currency Transactions

- Support logging sales orders or interaction items in multiple currencies:
  - **MMK** (Myanmar Kyat): Local default.
  - **USD** (US Dollar): Used for premium accounts or major distributor volumes.
  - **THB** (Thai Baht): Common in border trade zones.
- Record transactions in the transaction currency while storing converted MMK totals for consolidated management reporting.

### B. Regional & Client-Specific Price Books

- Maintain multiple price books on the backend (e.g. "Mandalay Wholesale", "Yangon Retail", "Premium Partner Special").
- Assign a default `PriceBook` to a `Region`, or override it for specific high-volume `Shop` records.
- Synced price books must be cached in WatermelonDB so reps see client-appropriate prices automatically offline.

### C. Daily Offline Exchange Rates

- A daily background task fetches exchange rates and synchronizes them to the client's local database.
- Calculations (e.g. converting USD wholesale values to MMK equivalent for quota updates) are computed locally using cached rates.

---

## 2. Relational Database Schema Extensions

### A. Prisma Schema Updates (`sync-server/prisma/schema.prisma`)

Add price book structures and exchange rate definitions:

```prisma
enum Currency {
  MMK
  USD
  THB
}

model PriceBook {
  id        String          @id @default(uuid())
  name      String
  regionId  String?         @map("region_id")
  createdAt DateTime        @default(now()) @map("created_at")
  updatedAt DateTime        @updatedAt @map("updated_at")

  items     PriceBookItem[]
  shops     Shop[]

  @@map("price_books")
}

model PriceBookItem {
  id          String    @id @default(uuid())
  priceBookId String    @map("price_book_id")
  itemId      String    @map("item_id")
  price       Decimal   @db.Decimal(12, 2)
  currency    Currency  @default(MMK)
  createdAt   DateTime  @default(now()) @map("created_at")

  priceBook   PriceBook @relation(fields: [priceBookId], references: [id])
  item        Item      @relation(fields: [itemId], references: [id])

  @@unique([priceBookId, itemId])
  @@map("price_book_items")
}

model ExchangeRate {
  id           String   @id @default(uuid())
  fromCurrency Currency @map("from_currency")
  toCurrency   Currency @map("to_currency")
  rate         Decimal  @db.Decimal(12, 6)
  effectiveAt  DateTime @db.Date @map("effective_at")
  createdAt    DateTime @default(now()) @map("created_at")

  @@unique([fromCurrency, toCurrency, effectiveAt])
  @@map("exchange_rates")
}

// Extend existing models
model Shop {
  // ... other fields ...
  priceBookId String?    @map("price_book_id")
  priceBook   PriceBook? @relation(fields: [priceBookId], references: [id])
}

model InteractionItem {
  // ... other fields ...
  unitPrice        Decimal  @db.Decimal(12, 2) @map("unit_price")
  selectedCurrency Currency @default(MMK) @map("selected_currency")
}
```

### B. WatermelonDB Client Schema Extensions

Add corresponding local tables:

- `price_books`: `id` (string), `name` (string), `region_id` (string, optional).
- `price_book_items`: `id` (string), `price_book_id` (string), `item_id` (string), `price` (number), `currency` (string).
- `exchange_rates`: `id` (string), `from_currency` (string), `to_currency` (string), `rate` (number), `effective_at` (number).
- Add `price_book_id` column to client `shops` table.
- Add `unit_price` and `selected_currency` to client `interaction_items` table.

---

## 3. Implementation Steps

1. **Database Setup**: Apply the Prisma and WatermelonDB pricing schemas.
2. **Exchange Rate Sync Worker**: Build a NestJS cron service fetching market exchange rates daily and seeding the `ExchangeRate` model.
3. **Sync Endpoint Extensions**: Include price books, regional mappings, and daily exchange rates in the sync controller delta payloads.
4. **Client Price Resolver**: Write a helper utility `getPriceForShop(shop, item)` on the client that matches the shop's assigned price book and falls back to the default catalog.
5. **Interactive UI Adjustments**: Add currency selection dropdowns to the interaction logging view, displaying currency symbols and local calculations.
