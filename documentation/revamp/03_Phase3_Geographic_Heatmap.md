# PRD: Phase 3 - Market Intelligence & Geographic Heatmap

## Goal
Visualize market distribution and relationship health on a map to enable proactive management and identify neglected high-value accounts.

## Scope

### 1. The Dot Matrix (Geographic Heatmap)
- **Interactive Map**: Plot all shops based on GPS coordinates.
- **Pin Color (Recency)**:
  - **Bright Green**: Contacted < 48h ago.
  - **Faded Green**: Contacted < 7 days ago.
  - **Yellow**: No contact 8–14 days.
  - **Red**: No contact > 14 days (Neglect Zone).
- **Pin Size (Potential)**: Scale bubble size based on Shop "Account Value" (High-volume vs. Retail).

### 2. Strategic Filters
- **SKU Interest Filter**: Show only shops interested in "Product X".
- **Rep Filter**: View territory performance by specific sales rep.
- **Recency Toggle**: Highlight only "Red" (Neglected) bubbles for immediate action.

### 3. Click-to-Context Ledger (Side Panel)
- **Profile Snapshot**: Instant access to owner contact and LTV (Lifetime Value).
- **Chronological Feed**: A scrollable timeline of every interaction, note, and Viber screenshot for that specific shop.
- **Sentiment Trend**: Visual arrow (↗️ Stable, etc.) based on the last 3 commercial status logs.

## Success Metrics
- **Visibility**: Reduce "Neglected" (Red) accounts by 50% within the first month.
- **Strategic Utility**: Management can identify regional demand patterns for specific SKUs.

## Technical Requirements
- **Map Library**: Google Maps or OpenStreetMap integration (web/desktop dashboard).
- **Client-side Clustering**: Handle 500+ pins without lag.
- **Sentiment Logic**: Simple heuristic engine (Order Placed > Interested > Followed Up > Not Interested).

## User Story: The Sales Manager
> "As a Sales Manager, I want to open the map on Monday morning and see which 'High-Value' shops are glowing red. I can then instantly message the assigned rep to visit them today."
