Technical Specification: Core System Improvements & Feature Extensions
🏗️ Part 1: Technical & Architecture Improvements

1. Decouple Binary Data (Screenshots) from Synchronization Payload
   Context: The system currently captures and compresses proof-of-work Viber screenshots to a maximum of 200KB before uploading them. Storing or streaming these image binaries inline within the core database replication pipeline creates a massive bottleneck. If a field representative syncs 50 interaction logs after an extended power blackout, the payload reaches ~10MB, which will consistently timeout over congested 3G or E-GPRS networks. This causes the central database transaction block to roll back, locking the device in an infinite failure loop.

Agent Implementation Instructions:

Schema Modification: Strip image binaries entirely out of the core data synchronization mapping loops (interaction_logs / interaction_items).

Local Storage: Use expo-file-system to save image binary files directly to the local device storage. Save only a local text string file path or a unique ID (UUID) reference in your client database.

Asynchronous Upload Queue: Implement a background upload worker that streams binary files one-by-one using multipart uploads directly to an external storage bucket (or a dedicated server file-receiver endpoint) completely outside the database synchronization transaction loop.

2. Field-Level Conflict Resolution Strategy (Delta Patching)
   Context: The current synchronization protocol utilizes a strict Last-Write-Wins (LWW) resolution rule based on the record with the most recent modification timestamp. If a sales rep modifies a shop record while offline, and a manager updates a different field on the same shop online, the replication loop will completely overwrite the entire database row, erasing one person's work.

Agent Implementation Instructions:

Patching Engine: Abandon record-level overwriting. Modify the sync engine to track and transmit only the specific fields changed during an offline session ("field-level patch deltas").

Server-Side Merge: The sync server must evaluate incoming property changes. If a collision occurs on the exact same property, resolve it using transactional rules, but if the updates are on different properties, safely merge them into the database row. For highly collaborative properties like shared stock counts or quotas, process updates as append-only mutation logs.

3. Software-Level Scanner Deduplication Throttle
   Context: Warehouse workers use hardware scanners operating in keyboard-emulation mode. Rapid sequential scanning or hardware button "key bounce" causes identical barcode strings to stream into the global key listener within milliseconds of each other, resulting in duplicate product inventory logs.

Agent Implementation Instructions:

Debounce Component: Update the centralized global keyboard listener. Introduce an in-memory transactional cache to log the string value and timestamp of incoming scans.

Throttling Logic: If an incoming barcode matches the previous token within a rolling window of 750 milliseconds, intercept the event, discard the duplicate log, and trigger a warning beep sound on the device to alert the worker.

4. Client-Side Database Compaction Routine
   Context: In local-first architectures, deleting files or purging placeholders creates "empty pockets" on the device's storage disk, causing the local database file size to balloon over time and slowing down indexed search lookups on low-end Android mobile hardware.

Agent Implementation Instructions:

Compaction Hook: Implement a clean-up function inside the client-side synchronization manager.

Execution Rule: The exact moment a background synchronization cycle receives a success confirmation code from the central server, invoke a local database command to trigger a SQLite storage cleanup (VACUUM). This completely compresses the physical disk file, deletes soft-deleted data records, and cleans indexing trees to save device storage memory.

5. Monorepo Cleanup & Platform-Agnostic Storage Drivers
   Context: The current workspace has overlapping database packages (@powersync/react-native and @powersync/op-sqlite) causing dependency bloat. The project needs a unified, ultra-fast database query builder setup that switches storage targets cleanly depending on whether it is running on a mobile app or a web browser.

Agent Implementation Instructions:

Unified Architecture: Retain drizzle-orm and drizzle-kit as your singular query layer.

Mobile Storage Target: Configure Drizzle to run on top of high-performance JSI native bindings (@op-engineering/op-sqlite) when executing on mobile app platforms.

Web Browser Storage Target: Configure a fallback storage driver using WebAssembly modules (sql.js) backed by browser IndexedDB storage when executing inside desktop browsers.

6. Device Visibility & Security Enforcement
   Context: Certain high-value operational tasks (like taking proof-of-work photos, high-frequency physical scanning, and location check-ins) are intended strictly for mobile devices in the field. Initializing desktop features or data-heavy components inside a mobile wrapper can cause runtime crashes or sync risks.

Agent Implementation Instructions:

Hardware Validation: Integrate expo-device at the entry point of the client app to evaluate the hardware profile on startup. If the profile indicates a desktop browser environment, completely block the initialization of mobile-only modules.

Location Security: Integrate expo-location to lock in secure, low-power GPS verification during shop check-ins, allowing automatic territory matching and geofenced actions.

7. Cross-Platform Component Upgrades
   Context: Touch gesture components and basic list views frequently break, experience lag, or lose formatting when compiled across mobile devices and web viewports.

Agent Implementation Instructions:

Touch Layer: Integrate @react-native-aria into all core interactive components to ensure that complex mobile touch actions safely map to desktop pointer devices and keyboard inputs without breaking layout trees.

List Management: Replace all standard list layouts with @shopify/flash-list. This optimizes device performance on low-end hardware by aggressively recycling layout elements and image memory as users scroll through massive catalogs.

🧠 Part 2: Gemma 4 Artificial Intelligence Integrations 8. Automated Visual "Proof-of-Work" Audits
Context: Managers currently have to manually read through uploaded Viber chat screenshots to verify order quantities, items, and compliance.

Agent Implementation Instructions:

Vision Pipeline: Connect your central server's sync payload hook directly to Gemma 4’s native image-reading vision capabilities.

Operational Logic: When a sales rep uploads a screenshot, Gemma 4 must read the text within the chat image, extract ordered items/quantities, and automatically cross-reference them against the digital log submitted by the representative. If a discrepancy is spotted, automatically flag the transaction row for manual manager review.

9. Multi-Channel Audio & Text Interaction Sorting
   Context: Field representatives need a ultra-fast way to record visit notes while driving or walking between busy retail shops without wasting time on tedious manual typing.

Agent Implementation Instructions:

Audio Pipeline: Integrate native audio-input edge models directly on your sync backend server.

Operational Logic: Allow sales reps to record a raw audio file directly inside the app after a shop visit. Gemma 4 must process the audio file natively to auto-populate form fields, extract customer sentiment trends (Positive, Stable, or Declining), and automatically generate follow-up tasks—skipping the need for a separate speech-to-text transcriber.

10. Smart Viber Auto-Response & Intake Chatbots
    Context: Retail customer shops frequently contact the company account directly via Viber to request stock quotes or place recurring inventory orders.

Agent Implementation Instructions:

Chat Integration: Connect your official Viber company account webhook hooks directly to a localized Gemma 4 execution cycle.

Operational Logic: When a customer messages an order request, Gemma 4 must parse the unstructured message text, look up live product availability from your database catalog, automatically draft a tentative order invoice, and generate an instant order confirmation reply directly back to the customer's chat.

11. Deep-Context Chronological Trend Analysis
    Context: Managers need proactive, high-level analysis of accounts over time rather than just static End-of-Day snapshot emails.

Agent Implementation Instructions:

Long-Context Analysis: Utilize Gemma 4’s 128K context window to pull down long chronological text logs for individual shops.

Operational Logic: Build an automated manager insight routine. The AI will read a shop’s entire history (months of past rep notes, order changes, and delivery complaints) to generate diagnostic briefs for management, such as alerting you if a VIP customer's order volume or sentiment trend is starting to decline over time.

📦 Part 3: Odoo Replacement & Commercial Features 12. Multi-Tiered Customer Category Pricing
Context: The company does not use a single fixed price list; they negotiate specific transaction rates based on whether a client is a retail store, regional distributor, or wholesale partner.

Agent Implementation Instructions:

Schema Fields: Add a price_tier category attribute field to the Shop model database layout (e.g., Wholesaler, Distributor, Retailer). Connect this to an ItemPriceBooks join table containing custom tier prices.

Operational Logic: When a sales representative logs a sales entry for a specific store, the app must automatically load the matching base price tier from local memory. However, the input price field must remain completely editable, allowing reps to enter a custom negotiated price directly for that sale.

13. Live Regional Stock-Allocation Tracking
    Context: Materials and products are physically split across multiple locations (the central Yangon warehouse, regional hubs like Mandalay, or loaded onto trucks currently in transit). Reps must know exactly what stock is locally available in their territory before promising an immediate delivery.

Agent Implementation Instructions:

Schema Layout: Implement a StockLocation table and a StockBalance ledger that tracks quantities mapped to specific sites or transit vehicles.

Operational Logic: When an entry updates, the database must slice inventory counts by location. When a sales rep views the product selector catalog, the user interface must display real-time availability numbers matching their active region or transit vehicle.

14. Flexible Product Unit Bundling & Packaging
    Context: Field teams sell inventory using multiple packaging variations depending on the supplier brand—such as individual Pieces (Pcs), Packets (Pk), Bags, or massive Pallets (Pal).

Agent Implementation Instructions:

Schema Layout: Update the product Item and InteractionItem models to support unit conversion factors mapped to explicit strings (PCS, PK, BAGS, PAL).

Operational Logic: Allow sales reps to book orders using any valid unit variant without performing manual conversion math. The database must store the logged unit choice, but automatically multiply the conversion factor behind the scenes to deduct the precise individual unit count from warehouse stock ledger balances.

15. Competitor Substitute Suggestions
    Context: Store owners frequently resist ordering a product due to price increases or local brand preferences, opting instead for cheaper alternatives like AT Board or SCG Smart Board over Shera.

Agent Implementation Instructions:

Schema Layout: Create a self-referencing relationship layout or a functional-equivalence map in the product database table that links items together based on sharing the same thickness, dimensions, or usage metrics.

Operational Logic: If a representative records that a client is rejecting an item due to price or brand resistance, the app interface must instantly display alternative local stock options that match those exact properties alongside their current prices to help the rep salvage the sale.

16. Dynamic Visual Product Catalog
    Context: Design-heavy inventory categories like flooring and tiles (such as Casa 1x1 patterns) require visual style confirmation from clients before they will place an order, currently forcing reps to rely on messy chat-app image sharing.

Agent Implementation Instructions:

Component Setup: Build an offline-cached digital pattern image gallery directly linked to inventory records.

Operational Logic: When navigating through specific catalog categories, the app must display high-contrast preview thumbnails of available tile or material designs. Reps must be able to tap and expand these images to showcase patterns directly to customers within the app workspace, keeping the entire sales workflow managed inside your app ecosystem.

17. Strict Brand-to-Category Database Hierarchy
    Context: The placeholder database schema must conform cleanly to real operational product classifications used by suppliers and builders.

Agent Implementation Instructions:

Schema Layout: Enforce a strict hierarchical database relationship structure. Every product entry must map cleanly to an explicit Brand Entity parent record (e.g., Shera, Gator, Karat, VRH, SCG Smart Board, Knauf) and store precise, physical descriptive attributes like thickness dimensions (4mm vs. 6mm vs. 8mm) or weight properties (1kg bags) as standard attributes.

18. Bulk Data Import/Export Transition Tools
    Context: To successfully switch from Odoo to this custom application overnight, managers need an automated way to import lists of hundreds of retail shops, primary contacts, and inventory records without manually re-entering them.

Agent Implementation Instructions:

Data Engine Pipeline: Create a data-parsing module inside the central manager dashboard view.

Operational Logic: Build an import workflow engine that accepts standard CSV or Excel file spreadsheet exports pulled out of Odoo. The module must automatically clean and structure the columns, check for duplicate phone numbers, and populate your central PostgreSQL database instantly with all legacy client directories and master categories.

19. Automated Synchronization Status Logs
    Context: Operating an offline-first workspace means data stays saved on mobile phones before updating the central cloud. Managers must have a foolproof window to track sync health across devices and confirm that data isn't getting lost or stuck on phones.

Agent Implementation Instructions:

Dashboard Component: Build a real-time management data-monitoring view.

Operational Logic: The interface must cleanly display device health statistics for every user account—logging exactly when a device last checked in, tracking what records successfully uploaded, and clearly calling out any specific sync packets that failed database validation rules at headquarters.
