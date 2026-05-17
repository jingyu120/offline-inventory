# PRD: Phase 3 - Market Intelligence & Geographic Heatmap

## Goal

Visualize market distribution and relationship health on an interactive map to enable proactive management and identify neglected high-value accounts.

## Scope

### 1. The Dot Matrix (Geographic Heatmap)

- **Interactive Map**: Plot all shops based on precise GPS coordinates (Latitude & Longitude).
- **Pin Color (Recency)**:
  - **Bright Green**: Contacted < 48h ago.
  - **Faded Green**: Contacted < 7 days ago.
  - **Yellow**: No contact 8–14 days (Warning Zone).
  - **Red**: No contact > 14 days (Neglect Zone).
- **Pin Size (Potential)**: Scale bubble size dynamically based on Shop "Account Value" (LTV / High-volume buyer vs. small retail shop).

### 2. Strategic Filters

- **SKU Interest Filter**: Show only shops interested in specific product SKUs.
- **Rep Filter**: View regional performance by specific sales rep.
- **Region Filter**: Filter map bubbles specifically by the assigned Region (e.g. Yangon, Mandalay).
- **Recency Toggle**: Highlight only "Red" (Neglected) bubbles for immediate assignment.

### 3. Click-to-Context Ledger (Side Panel)

- **Profile Snapshot**: Instant access to Shop Name, Owner Contact, Coordinates, and Total Lifetime Value (LTV).
- **Chronological Feed**: A scrollable, immutable timeline of historical notes and Viber screenshots logged by reps.
- **Sentiment Trend**: Visual arrow indicator (↗️ Improving, ➡️ Stable, ↘️ Declining) calculated automatically based on the last 3 commercial status logs.

## Success Metrics

- **Visibility**: Reduce "Neglected" (Red) accounts by 50% within the first month.
- **Strategic Utility**: Management can identify regional demand patterns for specific SKUs.

## Technical Requirements

- **Map Library**: Google Maps or OpenStreetMap integration (web/desktop dashboard).
- **Client-side Clustering**: Handle 500+ pins smoothly without lag.
- **Sentiment Logic**: Simple heuristic engine (Order Placed > Interested > Followed Up > Not Interested).

## User Story: The Sales Manager

> "As a Sales Manager, I want to open the map on Monday morning and see which 'High-Value' shops are glowing red. I can then instantly message the assigned rep to visit them today."

---

## Current Status & Progress - **Planned**

- **Database Backbone**: Partially complete. Geolocation attributes (`latitude`, `longitude`) are already included in the `Shop` models in SQLite and Prisma schema files to support plotting.
- **Next Steps**: Integrating Google Maps / Leaflet mapping libraries and designing the dashboard layouts.

