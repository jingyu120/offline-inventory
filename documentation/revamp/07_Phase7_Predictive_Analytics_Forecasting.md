# PRD: Phase 7 - Predictive Analytics & Demand Forecasting

## Goal

Optimize product distribution, avoid stockouts, and protect revenue streams by analyzing customer transaction histories to predict order frequencies, forecast demand, and identify customer churn markers.

---

## 1. Core Requirements

### A. Customer Reorder & Stockout Predictions

- Analyze order frequencies and volumes per shop for individual SKUs (e.g. Aung San Store orders `SKU-PB-640` every 10 days).
- Flag accounts that are overdue for an order (e.g., 14 days since last order) as **"High Stockout Risk"**.
- Automatically populate reorder recommendations in the representative's local interface.

### B. Churn Prediction (Sentiment + Recency Analysis)

- Combine rep-logged sentiment scores (`DECLINING` status) and contact intervals.
- Calculate a **"Churn Risk Factor"** (Low, Medium, High) for each store.
- Alert managers via the dashboard when high-value accounts show negative trends.

### C. Predictive Heatmaps

- Extend the Relationship Heatmap with a "Forecast View":
  - Adjust bubble sizes based on predicted 90-day Lifetime Value (LTV) growth.
  - Render color codes predicting regional inventory demand shifts (e.g., Mandalay region showing a 30% increase in premium line interest).

---

## 2. Technical Architecture

```
PostgreSQL (Transaction Records)
        ||
        \/
Prisma Service (Aggregation Queries)
        ||
        \/
Gemma AI Forecasting Service
        ||
        \/
- Churn Risk Calculations
- Recommended Reorder Lists
- Predicted 90-day LTV Growth
        ||
        \/
Saved to Database Tables (Daily Cron)
        ||
        \/
Client App (WatermelonDB Sync)
```

---

## 3. Database Schema Extensions

### A. Prisma Schema Updates (`sync-server/prisma/schema.prisma`)

Add tables to cache prediction outputs computed during nightly cron operations:

```prisma
model PredictionLog {
  id             String   @id @default(uuid())
  shopId         String   @map("shop_id")
  predictedLtv   Decimal  @db.Decimal(12, 2) @map("predicted_ltv")
  churnRisk      String   @map("churn_risk") // E.g., "LOW", "MEDIUM", "HIGH"
  stockoutRisk   String   @map("stockout_risk") // E.g., "LOW", "MEDIUM", "HIGH"
  lastUpdated    DateTime @updatedAt @map("last_updated")

  shop           Shop     @relation(fields: [shopId], references: [id])

  @@map("prediction_logs")
}

model RecommendedOrder {
  id             String   @id @default(uuid())
  shopId         String   @map("shop_id")
  itemId         String   @map("item_id")
  quantity       Int
  confidence     Float
  createdAt      DateTime @default(now()) @map("created_at")

  shop           Shop     @relation(fields: [shopId], references: [id])
  item           Item     @relation(fields: [itemId], references: [id])

  @@map("recommended_orders")
}
```

---

## 4. Implementation Steps

1. **Database Integration**: Seed and deploy Prisma and WatermelonDB prediction schemas.
2. **Sync Services Setup**: Register prediction endpoints so reps pull recommended orders and risk logs locally.
3. **Gemma AI Forecasting Service**: Implement prompts that evaluate shop purchase histories and return structured risk ratings.
4. **Prediction Dashboards**: Add charts to the desktop management panel showing sales forecasting lines and lists of accounts at risk of churn.
