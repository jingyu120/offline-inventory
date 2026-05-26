Sales Database for Tracking Shops & Projects

Problem:
Data fragmentation
The marketing & sales team manages store relationships, order history, and market intelligence manually across fragmented Excel sheets, personal notebooks, and chaotic instant messaging group chats. They submit a daily report of which stops they followed up with and what stops they sold to into a groupchat in Viber. Critical market news, customer friction points, and product interest are buried and lost in chat histories.
Report Sample
Lack of Operational Visibility
Management cannot easily see geographic distribution, regional demand patterns, or territory/shop neglect.
Infrastructure Instability
Frequent regional electrical outages and unreliable mobile networks cause frequent internet disruptions, making standard cloud-only apps impractical for real-time data logging in the field.

Vision & Opportunity:
Vision
To transition the family business's marketing operations from a reactive, chat-reliant team into a data-driven sales engine.
Opportunity
By capturing real-time field data and visualizing relationship health on an interactive map, management can optimize inventory distribution, protect high-value accounts from neglect, and enforce a culture of daily accountability without micro-managing.

Target Use Cases:
Use Case 1 (The Tele/Field Rep): A sales representative finishes a Viber call or messaging session with a shop owner. Instead of typing a long paragraph in a group chat, they open a simple mobile interface, select the shop, log the outcome with 3 taps, attach a screenshot of the chat as proof, and schedule the next follow-up date.
Use Case 2 (The Sale/Brand Manager): A manager opens a desktop dashboard at the start of the week. They filter a live map to show all "High-Value" accounts that have not been contacted in over 14 days (Red Bubbles) and instantly assign those leads to reps for immediate follow-up.
Use Case 3 (The Compliance Audit): An executive opens the dashboard at 8:00 PM to view the "Team Pulse" grid. They check which reps met their daily update quotas and review the automated timeline to ensure entries were submitted consistently throughout the day rather than dumped in a single batch at closing time.
Use Case 4 (The Offline Logging): A rep visits a shop or makes a call during an electrical outage with zero cellular service. They open the app, log the interaction completely offline, and hit save. The app safely queues the entry locally. Once network connectivity restores later that evening, the app silently syncs the data to the server.

Proposed Solution:
A lightweight, mobile-responsive software system that acts as the single source of truth for the marketing team. Built with an Offline-First Architecture, the solution comprises a friction-free data entry form for reps that queues logs locally during network drops, integrates directly with Viber workflows, visualizes data via an interactive geographic "Relationship Heatmap" dashboard for management, and feeds an automated daily supervisor oversight engine.

Goals:
Adoption Goal: Limit log entry time to under 30 seconds to ensure the team adopts the platform over Excel/group chats.
Data Integrity Goal: All product interest and transaction volumes must link to centralized SKUs—eliminating manual text entry for products.
Visibility Goal: Automate daily performance reporting so management receives compliance metrics pushed directly to them.
Infrastructure Resilience Goal: Zero data loss during power outages or network drops through localized data caching.

Requirements:
Module 1: Interaction Logging Form (Mobile-Optimized)
Shop Selection: Searchable dropdown populated from the master database.
Interaction Type: Segmented buttons: [ Phone Call ] [ Viber ] [ Shop Visit ].
Commercial Status: Dropdown menu: Followed Up, Interested, Order Placed, or Not Interested.
Product Tags (SKU Link): Multi-select checkboxes linked directly to the master SKU ledger. No manual text entry allowed to prevent data fragmentation via typos.
Volume Sold: Numerical field, active only if "Order Placed" is selected.
Market Intelligence & Notes: Open text field for raw market news (e.g., competitor pricing drops, store owner availability). Minimum 20-character constraint if "Interested" or "Not Interested" is selected to force data quality.
Next Follow-Up Date: Date picker. Populating this field dictates the lifecycle status color on the manager's map.
Module 2: Offline-First Data Handling
Local Data Persistence: The app must run smoothly without an active internet connection. If the network drops, all typed log data and attached screenshots must save securely into the phone's internal storage (e.g., SQLite or SQLite-backed framework).
Automatic Background Synchronization: The app must continuously monitor network availability. The moment a cellular or Wi-Fi connection is re-established, the app must silently push the queued entries to the central database in the background without user intervention.
Visual Queue Status Indicator: The mobile interface must feature a small header icon (e.g., a cloud sync icon or a numeric counter) showing the rep exactly how many entries are currently saved locally and pending upload.
Local Input Stamping: When operating offline, the app must capture timestamps based on the device's internal clock at the exact millisecond the rep hits "Save." This guarantees that velocity reporting remains accurate, even if the actual cloud upload happens hours later.

Module 3: Viber Integration & Chat Sync (Myanmar Market Specific)
Proof of Interaction (Chat Screenshot Upload): For Viber-based follow-ups, a mandatory image upload field titled "Viber Interaction Proof" is enabled. Reps upload a quick screenshot of the latest exchange or sent quotation. These are stored directly in the chronological note feed for management to audit.
Viber Deep-Linking: Inside both the manager and rep views, clicking a shop profile displays a "Launch Viber Chat" button. This uses Viber’s URI schema (viber://chat?number=[Phone_Number]) to instantly open the Viber app directly to that specific shop owner’s chat thread.
Module 4: The Relationship Heatmap Dashboard (Desktop)
The Dot Matrix (Recency & Potential): An interactive map interface plotting all shops using a traffic-light bubble system:
Pin Color (Recency of Contact): Bright Green (Contacted within 48 hours), Faded Green (Within 7 days), Yellow (No contact for 8–14 days / Warning Zone), Red (No contact for 14+ days / Neglected Zone).
Pin Size (Account Value/Potential): Large Bubble (High-volume buyer/high interest in premium lines), Small Bubble (Small retail shop / Low volume).
Map Filters: Ability to filter the map view by Product SKU interest, assigned Sales Rep, or Recency Status.
Module 5: Click-to-Context Shop Ledger
Profile Snapshot: Clicking a map bubble opens a side-panel displaying Shop Name, Owner Contact, Coordinates, and Total Lifetime Value (LTV).
Buying Analytics: Top 3 purchased SKUs and a "Most Recent Purchase" timestamp.
Sentiment Trend Indicator: A directional arrow icon calculated based on the last 3 logs: ↗️ Improving, ➡️ Stable, ↘️ Declining.
Chronological Note Feed: A scrollable, immutable timeline of historical text notes and Viber screenshots logged by reps, stamped by user and date.
Module 6: Manager Oversight & Update Velocity
The "Team Pulse" Widget: A visual grid mapping Sales Reps against the days of the current week. Green Grid indicates daily log quota met (e.g., 10+ entries); Yellow Grid indicates below target quota; Red Grid indicates zero entries submitted.
The Velocity Timeline: A linear visualization showing when entries were submitted throughout the day. If more than 5 logs are submitted within a compressed 15-minute window, the system flags the data as "Batch Updated" to alert managers to potential data dumping.
Automated EOD Digest: At 8:00 PM daily, the system compiles and emails a summary report to management detailing quota compliance per rep, total volume sold, and High-Priority Market Intel notes.

Technical & Data Constraints:
Image Compression: The system must automatically compress uploaded Viber screenshots to a maximum of 200KB before saving to local cache or cloud to preserve device storage and regional network bandwidth.
Immutable Logs: Once an interaction log is saved, the rep cannot edit or delete the timestamp or core log details.
Automated Metadata Capture: The backend must silently capture the following tracking fields for every submission:

Field Name
Data Type
Purpose
created_at_local
Timestamp
Captured instantly using the device clock when the rep clicks "Save" (handles offline tracking).
synced_at_server
Timestamp
Captured by the central database when the entry is officially uploaded.
is_offline_entry
Boolean
True/False flag indicating whether the entry was created during a network outage.
device_id
String
Verification of authorized hardware use.

Table for shop:
Shop ID
Shop name
Owner contact
Rep contact
Address
Table for Items:
Item ID, item name, shop ID
Table for transactions:
Transaction ID
Transaction status (Expect, In Inventory, Sold)
Arrival Time
Sold time
Quantity
Unit Price
Item ID
Contacts:
Contact ID
Name
Phone Number
Email
