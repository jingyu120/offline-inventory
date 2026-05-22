Architecture Improvements

1. High-Impact Structural Improvement: Decouple Binary Data (Screenshots) Immediately
   Current Architecture: Reps capture and compress proof-of-work Viber screenshots to a maximum of 200KB before uploading them. While Phase 8 ("Asynchronous Image Sync") is planned, the current data schema suggests image binaries are tightly coupled with core synchronization pipelines or stored in-row/in-payload.

The Risk: 200KB per image scales rapidly. If a representative syncs 50 interactions at the end of a long blackout, the sync payload reaches ~10MB. Over a spotty E-GPRS or congested 3G network in rural Myanmar, a 10MB POST request will frequently timeout, causing the entire $transaction block on the NestJS backend to roll back, trapped in an infinite failure loop.

High-Impact Fix: \* Strip image binaries completely out of the core sync schema mapping (interaction_logs / interaction_items).

Store images locally in the file system (via expo-file-system), saving only a local string filepath/UUID identifier in WatermelonDB.

Implement an independent upload queue that streams binary files one-by-one via multipart uploads directly to a storage bucket (or a separate server file-receiver endpoint) outside the database transaction block.

2. High-Impact Database Improvement: Change the Conflict Resolution Strategy
   Current Architecture: The sync protocol utilizes a strict Last-Write-Wins (LWW) resolution protocol based on the record with the most recent updatedAt / updated_at_local timestamp.

The Risk: In an offline-first system where clients can remain offline for days, LWW introduces silent data corruption. If a manager updates a shop’s tier status on the desktop dashboard on Tuesday, and an offline field rep modifies that same shop's phone number on Wednesday morning while deep in a zero-signal zone, the rep's sync on Wednesday night will overwrite the manager's corporate modifications entirely. The manager's changes are lost without a trace.

High-Impact Fix: Shift from record-level LWW to Field-Level Last-Write-Wins or change tracking.

When tracking modifications in WatermelonDB, send only the patch delta of fields that actually changed during the session, rather than replacing the complete row entity.

For collaborative structural fields (like inventory allocations or daily quotas), evaluate a simplified CRDT (Conflict-free Replicated Data Type) approach or keep an explicit append-only log of modifications that the server resolves using transactional business rules instead of timestamp comparisons.

3. High-Impact Edge Case Optimization: The "Double Scan" Idempotency Chokepoint
   Current Architecture: The warehouse scanner uses a global event listener with delta timing (<20ms per character) to trap hardware scanner inputs, short-circuiting focused UI inputs and writing directly to WatermelonDB.

The Risk: Hardware scanner trigger mechanisms often suffer from "key bounce" or double-triggering when a warehouse worker clicks the physical gun twice or waves it past a barcode twice. Because the scanner bypasses the UI and writes directly to the repository layer, this will log duplicate rows for intake/checkout before the user can see or verify what happened, skewing physical audits.

High-Impact Fix: Introduce a software-level deduplication throttle inside the centralized keyboard listener layer.

Maintain a tiny, temporary memory cache of the last scanned string token and its exact millisecond timestamp.

If an incoming string matches the previous scan token within a rolling window of 750ms, discard the hardware event as a duplicate bounce and play an audible warning beep on the device to alert the warehouse operator.

4. Architectural Enhancement: Implement Client-Side Database Compaction
   Current Architecture: The system uses an incremental sync protocol fetching and writing created, updated, and deleted delta rows.

The Risk: WatermelonDB handles deletes natively by marking rows as "sync-deleted" so they can be pushed to the server backend. If a table undergoes frequent churn (such as volatile localized item price sheets or rolling interaction logs), the underlying SQLite database file on the mobile device will balloon in storage size over time, degrading SQLite indexed scan speeds on low-end Android mobile devices.

High-Impact Fix: Implement a post-sync database cleanup routine.

Once the client receives a successful Sync Acknowledgement from the POST request, immediately execute database.adapter.underlyingAdapter.execute() to trigger a SQLite VACUUM or call WatermelonDB's native collection cleanup routines to purge successfully synchronized tombstoned records permanently from the local hardware disk.

Suggested Architectural Blueprint for Data Flows
To visualize how the decoupling of binary payloads and field-level patch applications interact securely under this updated schema, consider this structural flow:

Recommended Code Implementation: Type-Safe Field Patching
To transition away from raw row overwrites without complicating the server logic, replace row replacements with an explicit properties patch object wrapped in your established type-safe guardAsync design pattern:

---

Mitigating the Risk: Architectural Checklist
To ensure this dual-viewport strategy succeeds without slowing down your development cycles, implement these engineering rules:

Strict Code Isolation: Never import a native mobile library statically in your shared view components. Always split environment-specific modules into .native.ts and .web.ts equivalents. For example, keep your native hardware scanner event listener completely decoupled from the web dashboard build.

Strict Role Enforcement via Routing: Prevent field representatives from logging in via a desktop web browser if they are expected to use features like compressed proof-of-work screenshot uploads or distance-verified GPS check-ins. Restrict the web build primarily to administrative dashboard roles to minimize web-specific offline database syncing risks.

Isolate Asset Streams: Ensure that components fetching media or processing text reports handle local files distinctly: absolute native file system paths for mobile (expo-file-system) and standard binary Blobs or secure temporary cloud bucket storage data URLs for web clients.

---

1. Prune and Align: Eliminate Sync & Driver Duplication
   Your root package.json currently has overlapping data layers (Prisma + Drizzle + PowerSync + native op-sqlite bindings). To make this dual platform clean, prune the dead weight:

Action: If you are building a custom HTTP delta sync mechanism via your NestJS sync.service.ts as documented, remove @powersync/react-native and @powersync/op-sqlite. Keeping them adds bundle bloat and causes confusion during type generation in shared-types.

Action: Keep drizzle-orm and drizzle-kit. Drizzle acts as a unified query builder across both targets, but its execution drivers must be isolated.

2. Add Platform-Agnostic Storage Drivers
   To support the checklist requirement of injecting op-sqlite on native devices and an IndexedDB/WASM fallback on the web, you need to introduce packages that allow Drizzle to target web assembly storage engines:
   Why this matters: On mobile, Drizzle will bind directly to your high-performance @op-engineering/op-sqlite JSI driver. On web, you will configure Drizzle to look for a compiled WASM instance of sql.js backing onto browser-persistent IndexedDB space.

3. Add Hardware Visibility Packages for Role Enforcement
   The architectural checklist requires restricting field operations (like photo capturing, high-frequency scanning, and GPS verification) strictly to mobile clients while locking out desktop browsers. You need explicit runtime environment and device telemetry packages to guard these entry routes cleanly:

expo-device: Allows your App.tsx router to instantly read the hardware profile. If a user logs into a web browser, ExpoDevice.deviceType can detect if they are on a desktop monitor and completely disable code initialization for things like the hardware keyboard listeners or native expo-camera configurations.

expo-location: Essential for Phase 5 (Route Optimization & GPS Check-In Validation). It allows you to run low-power geofencing natively on devices while safely resolving to standard browser navigator.geolocation APIs on the web dashboard via abstract wrappers.

4. Upgrade Component Core for Cross-Platform Interaction
   Because you are using @shopify/restyle for theme primitives, your interactive elements (like the drop-down menus in DropdownSelector.tsx or scroll views in ShopSidebarList.tsx) are highly vulnerable to breaking on the web viewport. You need to introduce a behavioral abstraction layer:
   @react-native-aria/\*: This maps touch states cleanly to hover, pointer, focus, and keyboard accessibility trees when compiled via react-native-web. It prevents form elements from misbehaving on web viewports.

@shopify/flash-list: Your high-density web tables use structural HTML row grids, but the mobile viewport uses card lists. Replacing stock FlatList with FlashList ensures instant cell recycling on low-end Android mobile hardware when processing long rows of synchronized shop histories or items catalogs.

---

Given your core business dynamics—balancing an asynchronous, offline-first field app with heavy chat-based reporting—here are the highest-impact areas where you can leverage Gemma 4 to streamline management operations:

1. Automated "Proof-of-Work" Visual Audits (Vision Integration)
   Currently, managers have to manually review compressed Viber chat screenshots to verify compliance and order accuracy.

What to integrate: Connect your server's sync payload to Gemma 4’s native vision capabilities.

How it streamlines operations: Instead of a manager clicking through every image, Gemma 4 can look at the screenshot, extract the text from the chat, cross-reference it against the digital order form your rep submitted, and flag discrepancies (e.g., if the client text message says "send 10 cases" but the rep logged "12 cases").

2. Multi-Channel Customer Interaction Sorting (Audio & Text)
   Field reps often operate on the move, capturing notes via voice or chaotic free-text after a shop visit.

What to integrate: Leverage the native audio-input support found in Gemma 4’s smaller edge models (like the E2B and E4B sizes) directly on the sync server or office terminals.

How it streamlines operations: Reps can record a quick 20-second audio clip in the field ("Just visited Golden Sky Shop in Yangon, owner was happy with the new items but wants to lower his next order"). Gemma 4 can process that raw audio file directly to fill out the form fields, extract customer sentiment ("Happy/Positive"), update the shop's profile trends, and set the next follow-up schedule without a separate speech-to-text transcriber.

3. Smart Viber Auto-Response & Intake Chatbots
   Your future roadmap highlights an automated chatbot to process data directly via chat interfaces.

What to integrate: Connect your official Viber company account hooks to a localized Gemma 4 execution loop.

How it streamlines operations: Because Gemma 4 is highly optimized for instruction-following and multilingual context, it can act as an intelligent gatekeeper. When smaller retail shops message your Viber account directly to order items, Gemma 4 can parse the request, check your current SKU catalog for item availability, write a tentative invoice directly into the database, and reply to the customer with an order confirmation—completely skipping the need for a human customer service middleman.

4. Deep-Context Chronological Trend Analysis
   A major strength of Gemma 4 is its 128K context window, which allows it to process roughly 90,000 words of text in a single look.

What to integrate: Feed an entire shop’s historical timeline (months of visit notes, historical purchase volumes, contact interactions, and past complaints) into Gemma 4.

How it streamlines operations: Instead of your current End-of-Day summary which only captures a single day's snapshot, you can build a "Quarterly Account Health Auditor." Gemma 4 can review a shop's entire history and provide a diagnostic brief for management: "This shop's sentiment trend has quietly shifted from Stable to Declining over the last 60 days because of delivery delays, and their Lifetime Value is dropping. Action required: reassign to a senior representative."

---

Here are the high-value features your application should implement to successfully replace Odoo:

1. Multi-Tiered "Customer Category" Pricing
   Your field reports show that your team doesn't just sell at a single fixed price; they actively negotiate based on who the customer is, where they are located, and how much they buy. For example, a single rep might sell to a distributor using specialized item rates or offer custom deals to volume buyers (like a "3-car sequence" discount).

What to implement: Instead of simple placeholders, the database must support Customer Type Price Books. When a rep opens a shop profile, the app should automatically apply that specific customer’s price tier (e.g., Wholesaler vs. Retailer) while still allowing the rep to input a verified custom negotiated price for that specific sale.

Why it replaces Odoo: Odoo handles this through complex pricing rules. By embedding your exact regional tier system directly into the app's local memory, reps can instantly see correct, pre-approved base prices offline without having to guess or wait for head-office confirmation.

2. Live Regional Stock-Allocation Tracking
   Your sales reports reveal that inventory isn't just sitting in one place—it is actively split between a main Yangon warehouse, regional hubs like Mandalay, and literal "in-transit" stock moving on cargo trucks. Reps often check if products are physically available in a specific city (e.g., checking Mandalay or Bago stock levels) before locking in an order.

What to implement: A location-aware inventory balance ledger. When data syncs, the app shouldn’t just show a single company-wide stock number; it needs to show exactly how many pieces are in Yangon, how many are in Mandalay, and what is currently loaded onto transit vehicles.

Why it replaces Odoo: Odoo manages this via multiple warehouse locations, which can be messy to navigate on a phone. Providing clean, location-specific stock breakdowns directly on the rep's order screen prevents them from selling inventory from the Yangon warehouse to a customer in Mandalay who needs immediate local fulfillment.

3. Mixed Product-Brand Cataloging (Conforming to Partner Data)
   The company’s reports show that your inventory catalog is a mix of major commercial brands. Your team simultaneously tracks and sells specific products from Shera (Plank, Board), Gator (1kg bags), Karat, VRH, SCG Smart Board, and Knauf.

What to implement: The item catalog database must use a strict Brand-to-Category hierarchy. Product listings must categorize items by both their brand entity (e.g., Shera vs. SCG) and their dimensions/weight properties (e.g., 4mm vs. 6mm vs. 8mm boards or 1kg bags).

Why it replaces Odoo: It ensures complete parity with how your suppliers and customers talk about products. When warehouse teams or sales reps look up stock, they can filter by the exact brand names used in day-to-day operations rather than scrolling through a massive, unorganized master list.

4. Bulk Data Import/Export Tools (The Transition Net)
   Odoo currently holds your historical master list of hundreds of retail shops, primary owner phone numbers, and past inventory categories. Your custom system cannot expect users to re-type all of this manually.

What to implement: A simple dashboard tool for managers that accepts a direct Excel or CSV spreadsheet export from Odoo.

Why it ensures a smooth transition: It allows you to instantly migrate your entire active customer directory and supplier brand listings into your new system overnight. When you turn Odoo off, your reps open the new app and find all their familiar stores and products waiting for them on day one.

5. Automated System Status Logs (The Admin Safety Net)
   Because you are running an offline-first application where data is saved on phones before syncing to the cloud, you lose Odoo's "always-connected" paper trail. Managers need a foolproof way to verify that an order logged on a phone actually made it to the central office.

What to implement: An easy-to-read administrative dashboard that flags the synchronization health of every device. It should display exactly when a rep last checked in, what records were successfully uploaded, and highlight any items that were blocked due to duplicate data or missing information.

Why it replaces Odoo: It replaces Odoo’s heavy corporate auditing with a transparent safety log. If a shop owner calls claiming their order wasn't processed, a manager can instantly see if the order is still sitting safely in the rep's offline phone queue or if it failed a layout rule at headquarters.

---

1. Flexible Product Unit Bundling & Packaging
   The field reports reveal that items are not just sold by individual pieces; they are tracked and sold across a highly fluid mix of unit types depending on the product brand.

What to implement: The catalog selection drawer must support multiple unit variants per product entry. The system must allow sales reps to log orders in Pcs (Pieces), Pk (Packets), Bags, or Pal (Pallets) seamlessly. For example, the app should allow a rep to log an order for 5,220 Pcs of Shera 603, 30 packets of Shera Plank, or 100 bags of Gator 1kg, calculating the inventory deduction accurately behind the scenes.

Why it matters: Odoo requires strict unit-of-measure configurations that can frustrate users if a pallet needs to be broken down in the field. Custom bundling ensures reps can write down exactly what the store owner asks for without doing mental math to convert packets into individual boards.

2. Live Regional Stock-Allocation Tracking
   Your sales reports reveal that inventory isn't just sitting in one place—it is actively split between a main Yangon warehouse, regional hubs like Mandalay, and literal "in-transit" stock moving on cargo trucks. Reps often check if products are physically available in a specific city (e.g., checking Mandalay or Bago stock levels) before locking in an order.

What to implement: A location-aware inventory balance ledger. When data syncs, the app shouldn’t just show a single company-wide stock number; it needs to show exactly how many pieces are in Yangon, how many are in Mandalay, and what is currently loaded onto transit vehicles.

Why it matters: Odoo manages this via multiple warehouse locations, which can be messy to navigate on a phone. Providing clean, location-specific stock breakdowns directly on the rep's order screen prevents them from selling inventory from the Yangon warehouse to a customer in Mandalay who needs immediate local fulfillment.

3. Competitor Substitute Suggestions & Alternative Tracking
   A frequent scenario in the reports is that customers will refuse a brand because they are buying cheaper alternatives or prefer a specific competitor's design (e.g., a customer buying AT Board because it is cheaper, or explicitly preferring SCG Smart Board over Shera for a specific thickness).

What to implement: A "Smart Substitution" prompt inside the item catalog view. If a rep logs that a customer is rejecting a Shera 6mm board order, the app should instantly show available alternative stock options (like SCG 6mm or AT Board) along with their current local prices so the rep can pivot the sales pitch right on the spot.

Why it matters: Odoo treats products as rigid, isolated database entries. Grouping functional equivalents together in a local-first interface helps your field reps salvage sales in real-time when faced with price resistance or brand preferences.

4. Dynamic Visual Product Catalog (Tile & Design Selection)
   The reports note that for design-heavy inventory categories like tiles (e.g., Casa 1x1 tiles), reps frequently struggle to close deals simply because the client doesn't like the look or needs to see the pattern ("Design choice must match before buying"). Reps are currently forced to manually send individual photos back and forth across chat apps to show styles.

What to implement: An offline-cached visual gallery attached directly to the product catalog. When selling categories like flooring or tiles, the rep should be able to flip through high-contrast images of available patterns directly inside the app to let the customer confirm the design immediately.

Why it matters: This keeps the entire transaction inside your controlled app workspace instead of letting reps drift back to chaotic, unmonitored Viber photo sharing just to show a client product styles.

5. Multi-Brand Inventory Categorization
   The company’s reports show that your inventory catalog is a mix of major commercial brands. Your team simultaneously tracks and sells specific products from Shera (Plank, Board), Gator (1kg bags), Karat, VRH, SCG Smart Board, and Knauf.

What to implement: The item catalog database must use a strict Brand-to-Category hierarchy. Product listings must categorize items by both their brand entity (e.g., Shera vs. SCG) and their dimensions/weight properties (e.g., 4mm vs. 6mm vs. 8mm boards or 1kg bags).

Why it matters: It ensures complete parity with how your suppliers and customers talk about products. When warehouse teams or sales reps look up stock, they can filter by the exact brand names used in day-to-day operations rather than scrolling through a massive, unorganized master list.

---

---

---
