# Guiding Principles & Coding Rules

This document outlines the core architecture choices, design standards, and development workflows for the Burma Inventory application. All future modifications, new features, and refactoring tasks must adhere strictly to these principles.

---

## 1. Architectural Philosophy: Offline-First

Due to frequent regional electrical outages and unstable mobile networks in the Myanmar market, this application is built with a strict **Offline-First** architecture.

- **Source of Truth**: The client-side database (**WatermelonDB/SQLite**) is the immediate source of truth. The user interface _must never_ block on network requests for read or write operations.
- **Reactive UI**: UI components must observe database queries reactively (using WatermelonDB `@nozbe/watermelondb` decorators or reactive React hooks) to automatically update when local data changes.
- **Background Synchronization**: Sync with the remote database occurs in the background via the `/api/sync` endpoints (`pull` and `push`). Data writes are stamped with a device-local timestamp (`created_at_local`) and placed in a synchronization queue.
- **Soft Deletes**: Deletion of records is handled via a `deleted_at` (mapped to `deletedAt` in Prisma) timestamp. Records are marked as deleted locally and pushed to the sync server before being purged.

---

## 2. Responsive UI Design: Katana Web vs. Sortly Mobile

The interface must dynamically adapt based on the viewport width (breakpoint: `768px`).

### Desktop / Web (`isDesktop = width >= 768`)

- **Design Principle**: **Katana Cloud Inventory**
- **Characteristics**:
  - Dense, compact table-based grids with high information density.
  - Left-hand navigation sidebar or horizontal top bar with full text-labeled tabs.
  - Side-by-side split panes for list and details (ledger + sidebar details).
  - Explicit multi-column metrics and lists.

### Mobile (`!isDesktop`)

- **Design Principle**: **Sortly**
- **Characteristics**:
  - Tap-friendly card-based lists with generous margins and rounded corners (`borderRadius="l"`).
  - A fixed **bottom tab navigation bar** with Lucide icons (`ClipboardList`, `Map`, `Activity`) and text labels.
  - Visual circle avatars using initials with sentiment-based background colors ( Emerald for positive, Red for negative, Indigo/Slate for neutral).
  - Floating action buttons (FABs) and interactive floating badges.
  - Full-screen or single-pane workflows (e.g. clicking a list card navigates to a full-screen details view with a clear "Back" button, rather than a split view).
  - Bottom sheet overlay slides for contextual detail views on maps.

---

## 3. Strict React Best Practices

To prevent infinite loops, performance bottlenecks, and memory leaks:

- **Stable References**: Always wrap callbacks passed down to subcomponents in `useCallback()`. Ensure dependencies are stable.
- **Ref-Based Event Handlers**: If a callback depends on state that updates frequently, use a mutable ref (`useRef()`) to store the latest handler to avoid breaking child component memoization.
- **Strict Hook Dependencies**: All variables used inside `useEffect` must be declared in its dependency array. If an effect triggers a state update, ensure it is guarded to prevent rendering cycles.
- **Cross-Platform Safety**: Always wrap browser-only APIs (`window`, `document`, `navigator`, `indexedDB`) in `Platform.OS === 'web'` conditionals to prevent crashes on native iOS/Android targets.

---

## 4. Database & Sync Constraints

- **Immutable Device Timestamps**: `createdAtLocal` must be stamped using the device clock the moment the user clicks "Save". This value _must never_ be altered by the sync server, guaranteeing accurate field velocity reporting.
- **Sync Order**: Join tables (e.g., `InteractionItem`) must be synced _after_ their primary parent tables (e.g., `InteractionLog`) to prevent database foreign key constraint failures.
- **Conflict Resolution**: Client writes use a last-write-wins protocol. During a push, conflicts are resolved in PostgreSQL using transaction batching.

---

## 5. Development Pipeline and Pre-Commit Gate

Our pre-commit engine prevents breaking changes from being committed:

- **Build Checks**: Every commit runs the pre-commit script, which checks:
  1. TypeScript type-safety across all packages (`npx tsc --noEmit`).
  2. Prettier code formatting (`nx format:check`).
  3. ESLint style and quality rules (`nx lint`).
  4. Core unit test suites (`nx test`).
- **No Bypassing**: Do not bypass these checks using `--no-verify` unless in an absolute emergency, as type mismatches in the shared schema will break the sync server immediately.
