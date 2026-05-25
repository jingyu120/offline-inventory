# Antigravity AI Agent Rules: Platform Isolation & Architecture Guardrails

This document establishes strict architectural boundaries for the unified monorepo. It ensures that the current single application build (`mobile-web`) remains clean and structured so it can be seamlessly split into independent Field Mobile and Admin Web applications later.

## 1. Allowed Tech Stack & Core Drivers

- **Backend Platform:** NestJS with Fastify framework (`@nestjs/platform-fastify`) for high-throughput JSON batch parsing.
- **Database Query Builder:** Drizzle ORM used universally across all clients.
- **Mobile Runtime Driver:** Synchronous JSI direct SQLite access via `@op-engineering/op-sqlite`.
- **Web Browser Driver:** WebAssembly compiled binary implementation via `sql.js` backing onto browser-persistent IndexedDB storage space.

## 2. Mandatory File-Splitting Rules for Platform Drivers

- **Anti-Pattern:** Do not use `Platform.OS === 'web'` or `if (isWeb)` conditional chains inside a single data logic file.
- **Required Practice:** You must explicitly isolate environment-specific runtime operations into side-by-side files utilizing platform extensions (e.g., `sync.native.ts` and `sync.web.ts`).

## 3. Strict Screen Layout Separation

- **Anti-Pattern:** Do not share child UI components, text fields, or hooks between field-level screen entry flows and management oversight views to optimize files early.
- **Required Practice:** Isolate administrative screens (e.g., `TeamPulseScreen.tsx`, `GeographicHeatmapScreen.tsx`) into completely independent folder structures away from field rep workflows (`InteractionLoggingScreen.tsx`). They must remain decoupled so the entire folder can be lifted and shifted into a separate module later.

## 4. Hardware Profiles & Telemetry Routing

- **Required Practice:** Query environment profiles via `expo-device` and `expo-location` before mounting hardware components.
- **Enforcement:** If a user logs in via a desktop web browser viewport, your routing hooks must explicitly block field-only features—disabling low-level hardware keyboard listeners, native camera modules, and preventing web clients from spoofing distance-verified GPS check-ins.
