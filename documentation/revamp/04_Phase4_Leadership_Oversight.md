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
- **Velocity Timeline**: Linear graph showing *when* entries were saved. Flag "Batch Updated" if >5 logs occur in <15 minutes.

### 2. Automated Reporting (EOD Digest)
- **Daily 8:00 PM Email**: Automated summary sent to management.
- **Digest Content**:
  - Top Performing Rep (by volume and quota).
  - High-Priority Market Intel (Notes flagged with "Competitor pricing" or "Store closing").
  - Compliance warnings (Reps in the "Red" zone).

### 3. Advanced Shop Analytics
- **Buying Patterns**: "Top 3 SKU Interest" per shop.
- **Churn Risk**: Automatic flagging of shops with declining sentiment trends over 30 days.
- **Audit Logs**: Immutable log history for compliance checks.

## Success Metrics
- **Accountability**: 90% of reps hitting "Green" quota status daily.
- **Data Freshness**: Reduce "Batch Dumping" incidents by 80%.
- **Management Efficiency**: Executive team saves 2 hours/day on manual report compilation.

## Technical Requirements
- **Cron Jobs**: Automated report generation at 8:00 PM local time.
- **Email Service**: Integration with SendGrid or SMTP for digests.
- **Analytics Engine**: Backend queries to calculate velocity and sentiment trends.

## User Story: The Executive
> "As an Executive, I don't have time to look at every shop. I want an 8:00 PM email that tells me which reps didn't work today and highlights any critical market news like competitor price drops."

---

## Current Status & Progress - **Planned**

- **Relational Models & Database Setup**: Completed. The daily quota tracking tables `daily_quotas` are defined in the schema to hold sales targets per rep/user.
- **Next Steps**: Setting up server-side cron triggers and mailing modules for automated summaries, and rendering the weekly compliance scorecard grid.

