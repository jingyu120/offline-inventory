# PRD: Phase 1 - Foundational Infrastructure & Master Data

## Goal
Establish a reliable, offline-first data backbone and centralize "Master Data" (Shops and SKUs) to eliminate manual text entry and fragmentation.

## Scope

### 1. Schema Expansion (The "Core Four")
Update the shared schema and database migrations to support:
- **Shops**: Name, Owner, Contact, Geo-coordinates, Rep assigned.
- **Contacts**: Name, Phone (Viber), Email, Linked Shop.
- **SKUs/Items**: Master ledger of products (no manual typing).
- **Interactions (Draft)**: Base table for logging field activities.

### 2. Enhanced Offline-First Sync
- **WatermelonDB Sync Protocol**: Implement the pull/push logic for the new tables.
- **Conflict Resolution**: Last-write-wins strategy for field logs.
- **Background Sync Workers**: Ensure the app attempts sync automatically when connectivity returns.
- **Sync Status UI**: A header indicator showing "Pending Uploads" count.

### 3. Basic Shop Ledger (Mobile)
- A searchable list of shops.
- Detailed view of a shop showing basic contact info and historical interaction logs (read-only for now).

## Success Metrics
- **Zero Data Loss**: 100% of entries created offline are eventually synced.
- **Performance**: Shop search returns results in <200ms on device.
- **Data Integrity**: Zero manual strings for product names in the database.

## Technical Requirements
- **Migration**: Prisma migrations for `sync-server`.
- **Schema Mapping**: Map Snake_case (WatermelonDB) to CamelCase (Prisma/Shared Types).
- **Local Persistence**: Ensure SQLite is correctly configured for large shop lists (1000+ entries).

## User Story: The Offline Rep
> "As a rep in a rural area with no signal, I want to be able to find my assigned shops in the app and see their basic info without an internet connection, so I can plan my route."
