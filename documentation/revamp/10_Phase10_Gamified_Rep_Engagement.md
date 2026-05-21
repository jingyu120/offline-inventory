# PRD: Phase 10 - Gamified Representative Engagement

## Goal

Drive adoption of the structured application and discourage late-day batch logging (data dumping) by introducing engagement points, streak multipliers, and friendly regional leaderboards for field representatives.

---

## 1. Core Requirements

### A. Point Allocation Engine

Reps accumulate points for positive operational behaviors, which are computed on the client and validated on the sync server:

- **Real-Time Visitation Log**: +50 pts (entry submitted within 30 minutes of `createdAtLocal`).
- **Quota Achieved**: +100 pts (reaching daily target for visits or phone calls).
- **Sentiment Turnaround**: +30 pts (successfully shifting a shop's sentiment status from `DECLINING` to `IMPROVING`).
- **Data Dumping Penalty**: +0 pts for any entries logged during flagged "Batch Updates" (more than 5 shops logged in a single 15-minute window).

### B. Visitation Streaks

- Track consecutive days with at least 3 unique shop interactions.
- Apply a multiplier to all points earned during active streaks (e.g., 5-day streak = `1.2x` points, 10-day streak = `1.5x` points).
- Streaks reset to zero if a representative fails to log activities for 48 hours.

### C. Team Leaderboards & Badges

- A simplified dashboard widget displays current weekly rankings.
- System issues badges visible on profiles:
  - **"Road Warrior"**: Logged 10+ in-person shop visits in a single week.
  - **"Real-Time Champion"**: Maintained a 90% real-time (non-batch) logging rate over 14 days.
  - **"Closer"**: Logged 5+ items sold within a single day.

---

## 2. Relational Database Schema Extensions

### A. Prisma Schema Updates (`sync-server/prisma/schema.prisma`)

Add scoring logs and user progression fields:

```prisma
model RepScore {
  id             String   @id @default(uuid())
  repId          String   @unique @map("rep_id")
  points         Int      @default(0)
  streakCount    Int      @default(0) @map("streak_count")
  lastActiveDate DateTime? @db.Date @map("last_active_date")
  updatedAt      DateTime @updatedAt @map("updated_at")

  rep            User     @relation(fields: [repId], references: [id])

  @@map("rep_scores")
}

model PointsLog {
  id             String   @id @default(uuid())
  repId          String   @map("rep_id")
  points         Int
  reason         String   // E.g., "REAL_TIME_LOG", "DAILY_QUOTA_MET", "STREAK_BONUS"
  interactionId  String?  @map("interaction_id")
  createdAt      DateTime @default(now()) @map("created_at")

  rep            User     @relation(fields: [repId], references: [id])

  @@map("points_logs")
}
```

### B. WatermelonDB Client Schema Extensions

Add matching tables:

- `rep_scores`: `id` (string), `rep_id` (string), `points` (number), `streak_count` (number), `last_active_date` (number).
- `points_logs`: `id` (string), `rep_id` (string), `points` (number), `reason` (string), `interaction_id` (string, optional), `created_at` (number).

---

## 3. Implementation Steps

1. **Schema Migration**: Set up the leaderboard and points log tables on the backend and client.
2. **Sync Service Logic**:
   - Write scoring hooks in NestJS that run when sync packets are saved.
   - Evaluate `createdAtLocal` against server `createdAt` to check for real-time compliance.
   - Aggregate points and send updated totals in pull responses.
3. **Engagement Widget (Mobile)**: Build a widget showing the user's current rank, active streak count, and latest badges.
4. **Leaderboard Grid (Desktop)**: Build a leaderboard panel on the management dashboard showing points, compliance percentages, and real-time logging speed.
