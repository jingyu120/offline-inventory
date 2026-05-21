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
- **Sentiment Trend**: Visual arrow indicator (↗️ Improving, ➡️ Stable, ↘️ Declining) computed dynamically using **Gemma 4 semantic analysis** over rep notes, highlighting churn risks.

## Success Metrics

- **Visibility**: Reduce "Neglected" (Red) accounts by 50% within the first month.
- **Strategic Utility**: Management can identify regional demand patterns for specific SKUs.

## Technical Requirements

- **Map Library**: Google Maps or OpenStreetMap integration (web/desktop dashboard).
- **Client-side Clustering**: Handle 500+ pins smoothly without lag.
- **Sentiment & Churn Engine (Backend Hosted)**: Built on the **Gemma 4 LLM** via a backend-hosted inference endpoint. By evaluating relationship logs server-side, it minimizes mobile CPU/memory footprint, returning lightweight trend predictions directly to the client.

## User Story: The Sales Manager

> "As a Sales Manager, I want to open the map on Monday morning and see which 'High-Value' shops are glowing red. I can then instantly message the assigned rep to visit them today."

---

## Current Status & Progress - **100% Completed**

- **Dynamic Interactive Map**: Implemented `GeographicHeatmapScreen.tsx` integrating OpenStreetMap/Leaflet dynamically. Plots all shops with color-coded recency pins (Green/Yellow/Red) and LTV-scaled bubble sizes.
- **Strategic Filtering Toolbar**: Added multi-select filters for SKU interests, assigned reps, regions, and recency toggles.
- **Detailed Account Side Panel**: Configured a slide-out profile panel showcasing shop info, contacts, historical log timeline, and Gemma 4 computed relationship sentiment trends.
- **Server-side Gemma 4 Sentiment Analysis**: Exposed an `/api/ai/analyze-sentiment` endpoint on NestJS sync-server that processes notes and outputs semantic trends (IMPROVING/STABLE/DECLINING) and churn risk recommendations.
