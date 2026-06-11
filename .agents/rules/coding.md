---
trigger: always_on
---

# CLAUDE.md - Codebase Memory & Behavioral Contract

## Build & Verification Commands

- **Build project:** `npm run build` or `nest build`
- **Run linting:** `npm run lint` or `eslint . --fix`
- **Run type-checks:** `npx tsc --noEmit`
- **Run tests:** `npm run test`

## 1. Code Generation Workflow

- **No Code Omissions:** You must output complete functional blocks or precise file diffs. Never use placeholders like `// ... rest of code remains unchanged` or `// TODO`.
- **Plan-Then-Execute:** Before modifying or creating files, output a brief, high-density plan outlining architectural impact, database schema/migration requirements, and a list of target files. Wait for user confirmation.
- **Atomic Refactoring:** Implement changes incrementally (e.g., Schema -> Core Logic -> API Router -> Frontend Integration). Run verification checks at each layer.
- **Test Co-Generation:** Every new service, custom hook, utility function, or API endpoint _must_ be accompanied by a corresponding test file (e.g., `*.spec.ts` or `*.test.tsx`).
- **Mocking over Network:** Tests must isolate logic by mocking external network calls and database layers unless explicitly writing an integration test. Never leave an existing test suite broken.
- **Max File Modification Size:** If a refactor requires modifying more than ~150 lines of code in a single file, you must break the task down into sub-tasks within your "Plan-Then-Execute" phase.
- **Component Splitting:** For frontend development, if a React component exceeds 200 lines, automatically extract logical sub-components or move business logic into a separate custom hook.

## 2. Type Safety & Language Standards (TypeScript)

- **Strict Mode:** Adhere to strict TypeScript standards. Usage of `any` is strictly prohibited.
- **Explicit Signatures:** All functions, API endpoints, hooks, and services must declare explicit return types and parameter types. Do not rely on implicit inference for public interfaces.

## 3. Backend Architecture (NestJS / Modular Patterns)

- **Layer Separation:** Enforce strict separation of concerns using a Controller-Service-Repository pattern. Controllers handle routing/IO, Services encapsulate pure business logic, and Repositories handle data access.
- **Boundary Validation:** Every incoming request payload must map to a strictly typed Data Transfer Object (DTO) validated at runtime via `Zod` or `class-validator`.
- **Output Serialization:** Never leak raw database models. Utilize explicit entity serialization or transformer mappings on all outbound responses.
- **API Documentation Alignment:** If an API endpoint or DTO is modified, you must immediately update its corresponding Swagger/OpenAPI decorators (e.g., `@ApiProperty()`, `@ApiOperation()`) to ensure local documentation stays perfectly synced with codebase changes.
- **SQL Injection & ORM Safety:** Never use raw string interpolation for database queries. Always use the ORM/Query Builder's parameterized inputs.
- **Secret Management:** Never hardcode API keys, tokens, or credentials. Always read from environment variables via a configuration service, and ensure `.env.example` is updated if a new variable is introduced.

## 4. Frontend & Mobile Architecture (React / React Native)

- **Isolated Component State:** Components must remain purely declarative UI shells. Data fetching, mutations, local storage access, and state machines must reside exclusively within custom hooks or state managers.
- **Defensive UI States:** Every data-driven component must explicitly handle and display three distinct states: Fetching, Empty/Null, and Error.
- **XSS Prevention:** On the frontend, avoid `dangerouslySetInnerHTML` or equivalent raw HTML rendering unless the input is explicitly passed through a trusted sanitization library (e.g., `dompurify`).

## 5. Data Integrity & Resilience (Local-First / Offline Constraints)

- **Query Optimization:** Forbid N+1 query patterns. Database transactions wrapped inside loops or iterative maps are unauthorized. Use eager loading or batching relations.
- **Atomic Mutations:** Multi-table or multi-step operations must execute within explicit atomic database transactions (commit/rollback).
- **Network Resiliency:** Data sync layers and network requests must incorporate automated exponential backoff retry mechanisms, idempotent transaction keys, and offline synchronization queues.

## 6. Error Handling & Diagnostics

- **Standardized Payloads:** Catch block exceptions must be mapped to standardized domain error instances. Return structured payloads matching the RFC 7807 Problem Details specification.
- **Defensive Coding Checklist:** Before writing logic, explicitly account for and handle the following edge cases:
  - What if the database returns `null` or `undefined`?
  - What if an array or string input is empty?
  - What if a network request times out?
  - What if numbers overflow or are negative when expecting positives?

## 7. Clean Code Standards & Single Responsibility (SRP)

- **Zero Magic Values:** Hardcoded strings or magic numbers are strictly forbidden. All constants, configuration flags, domain-specific values, or status strings must be extracted into explicit `readonly` constants, `enums`, or configuration objects.
- **Single Responsibility Principle (SRP):** Functions, hooks, and classes must do exactly one thing. If a utility function exceeds 25 lines, or a service method handles more than one logical orchestrator step, it must be decomposed into smaller, isolated pure functions.
- **Self-Documenting Code:** Code must be expressive and clear on its face. Inline comments (`//`) are unauthorized if they simply describe _what_ the code is doing. Use comments exclusively to explain _why_ non-obvious business constraints or performance optimizations exist.
- **Descriptive Naming Over Brevity:** Use highly descriptive, semantic names for functions and variables (e.g., `isUserEligibleForDiscount` instead of `checkDisc`).

## 8. Configuration-Driven Architecture

- **Centralized Environment & App Configuration:** Direct access to raw global objects like `process.env` or `window.ENV` outside of a central configuration service/module is strictly unauthorized. All environment values must be channeled through a strongly-typed, runtime-validated config layer (e.g., NestJS `ConfigService` or a dedicated config schema module).
- **Business Logic Parameters:** Any parameter that dictates application behavior—such as pagination limits, rate limits, retry intervals, or threshold amounts—must be read from configuration files or database tables, never hardcoded into services.
- **Data-Driven UI Components (Frontend):** Avoid writing redundant structural markup. Repetitive UI components like forms, tables, sidebars, or navigation paths must be driven by data arrays, configurations, or JSON schemas rather than stacked JSX blocks.

## 9. DRY (Don't Repeat Yourself) & Wise Abstraction

- **The Rule of Three:** If a logical block, algorithmic calculation, or pattern is copied and used in three or more places, you MUST extract it into a generic helper function, shared hook, or reusable base service.
- **Avoid Premature/Blind Abstraction:** Do not abstract code just because two distinct domain features look identical today. Ensure the underlying business domain intent is truly shared before merging code paths. If a change to feature A shouldn't change feature B, keep them separated (Aha's Rule: Duplication is cheaper than the wrong abstraction).
- **Single Source of Truth for Types:** Never duplicate TypeScript type definitions or interfaces across layers. If an external API schema or database interface changes, its dependent structures must update automatically. Use TypeScript utility types (`Pick`, `Omit`, `Partial`, `ReturnType`) to derive variants from a single source of truth.
