# PRD: Phase 4 - Leadership Oversight & Compliance Audit

## Goal

Enforce daily accountability, prevent "batch data dumping," and automate operational reporting for executive leadership.

## Scope

### 1. The "Team Pulse" Widget

- **Compliance Grid**: A weekly matrix (Reps vs. Days).
- **Quota Logic**:
  - **Green**: Met daily quota (e.g., 10+ interactions).
  - **Yellow**: Partial quota met.
  - **Red**: Zero entries submitted.
- **Velocity Timeline**: Linear graph showing _when_ entries were saved. Flag "Batch Updated" if >5 logs occur in <15 minutes.

### 2. Automated Reporting (Gemma 4 EOD Digest)

- **Daily 8:00 PM Email**: Automated executive briefing compiled by Gemma 4.
- **Digest Content**:
  - **Gemma 4 Market Insights Synthesis**: AI-curated summary of critical rep notes (e.g. competitors dropping prices, major construction blocking retail entries, wholesale price movements).
  - Top Performing Rep (by volume and quota).
  - Compliance warnings (Reps in the "Red" zone or flagged for end-of-day batch dumping).

### 3. Advanced Shop Analytics

- **Gemma 4 Buying Forecasts**: "Top 3 SKU Interest" per shop mapped against seasonal sales trends.
- **Dynamic Quota Optimizations**: Gemma 4 analyzes visit volume outcomes to suggest regional adjustments for `daily_quotas`.
- **Audit Logs**: Immutable log history for compliance checks.

## Success Metrics

- **Accountability**: 90% of reps hitting "Green" quota status daily.
- **Data Freshness**: Reduce "Batch Dumping" incidents by 80%.
- **Management Efficiency**: Executive team saves 2 hours/day on manual report compilation.

## Technical Requirements

- **Cron Jobs**: Automated report generation at 8:00 PM local time.
- **Email Service**: Integration with SendGrid or SMTP for digests.
- **Analytics & AI Engine (Server-Side)**: Server-side **Gemma 4 inference module** executes complex log synthesis and predictive quota modeling without running heavy models on reps' hand-held hardware.

## User Story: The Executive

> "As an Executive, I don't have time to look at every shop. I want an 8:00 PM email that tells me which reps didn't work today and highlights any critical market news like competitor price drops."

---

## Current Status & Progress - **100% Completed**

- **Compliance Scorecard Grid**: Created an interactive Weekly Scorecard matrix (Reps vs. Days) in `TeamPulseScreen.tsx` fetching local SQLite database records via WatermelonDB queries.
- **Log Velocity Timeline**: Implemented sliding window analysis to audit log creation rates, raising prominent "Batch Upload Warning" alerts if >5 entries occur in <15 minutes.
- **Server-Side Gemma 4 EOD Digest compiler**: Added a backend execution endpoint (`/api/ai/eod-digest`) to compile EOD summary reports, synthesizing competitor/logistics updates and highlighting compliance red-zones.
- **Dynamic Quota Optimizations**: Designed a quota recommender using Gemma 4 regional analyses. Managers can apply adjustments, creating live quota override rows in the local database.
- **Advanced Demand Analytics**: Embedded predictive demand charts showing top 3 product SKU probabilities mapped to season trends.
