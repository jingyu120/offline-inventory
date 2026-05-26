# 🇲🇲 Burma Sales & Inventory Manager: User Guide

Welcome to the **Burma Sales & Inventory Manager**! This guide is designed specifically for **Sales Representatives (Reps)** and **Sales/Brand Managers** to help you understand and use every feature of this application.

Our goal is to transition our operations away from chaotic, unorganized chat groups (like Viber) and fragmented Excel sheets into a unified, **offline-first database**. This guide is written in plain, simple language and provides step-by-step instructions for all features, including how to run and verify system health tests.

---

## 💡 How the System Works (Overview)

In Myanmar, frequent electrical blackouts, slow internet connections, and spotty mobile networks make traditional "cloud-only" apps slow or impossible to use.

This application uses a **local-first approach**:

1. **Always Responsive**: The app runs directly on your device's internal storage. When you click "Save," it saves instantly at zero latency—even if your phone is completely disconnected from the network.
2. **Silent Syncing**: The app continuously monitors your network status in the background. As soon as your internet connection is restored (or you get back to a Wi-Fi zone), it silently uploads your saved interactions to the central PostgreSQL database.
3. **Smart Assistance**: Integrated local **Gemma AI** assists reps by auto-filling forms from voice or text notes, translates prices across multiple currencies, and emails managers a concise summary report at the end of each day.

---

## 📋 Section 1: For Sales Representatives (Field Execution)

As a field representative, you are on the front lines. The application allows you to search shops, log client meetings, and process orders in **under 30 seconds**.

### 1. The Shop Ledger (Your Client Directory)

When you log in, your main screen is the **Shop Ledger** (called _Sortly Card View_ on mobile and _Katana Table View_ on desktop).

- **Search & Filter**: Type any part of a shop name or territory in the top search bar to instantly narrow down your client list.
- **Shop Detail Snapshot**: Tapping any shop card displays:
  - **Basic Info**: Shop name, address, owner contact number.
  - **Lifetime Value (LTV)**: The total amount of money this shop has spent with us (presented in MMK).
  - **Sentiment Trend**: An arrow icon indicating relationship health based on recent visits (↗️ Improving, ➡️ Stable, ↘️ Declining).
  - **Viber Deep-Link Button**: Tap the Viber icon next to any contact. The app will instantly launch the Viber messenger app directly on your phone and open the private chat thread with that shop owner.

---

### 2. Rapid Interaction Logging

When you finish a Viber call, exchange messages, or visit a shop in person, tap the **"Log Interaction"** button to log it.

```
       [ 1. Select Type ] ──> SHOP_VISIT or VIBER
               │
       [ 2. Set Status  ] ──> FOLLOWED_UP / INTERESTED / ORDER_PLACED / NOT_INTERESTED
               │
       [ 3. SKU Interest] ──> Pick SKUs + Enter Quantity (Runs Real-time Stock Check)
               │
       [ 4. AI Copilot  ] ──> (Optional) Type/Speak notes to auto-fill items and status
               │
       [ 5. Viber Proof ] ──> Attach screenshot (Mandatory for Viber logs; auto-compressed)
               │
       [ 6. Save Log    ] ──> Saved instantly to device database
```

#### Step-by-Step Instructions:

1. **Choose Interaction Type**: Select either `Shop Visit` or `Viber` (for chats and phone calls).
2. **Select Commercial Status**:
   - `Followed Up`: General check-in.
   - `Interested`: Shop owner expressed interest in stocking new items.
   - `Order Placed`: A sale was finalized.
   - `Not Interested`: Shop declined or relationship is temporarily cold.
   - > [!IMPORTANT]
     > To ensure high-quality reporting, if you select **Interested** or **Not Interested**, you **must** type a comment of **at least 20 characters** explaining the shop owner's feedback (e.g., competitor pricing drops, owner out of town).
3. **Select Currency**: Tap **MMK**, **USD**, or **THB** to choose your currency. The app dynamically pulls local exchange rates and price books to convert SKU prices instantly on-the-fly.
4. **Attach Products (SKU Link)**: Tick the checkboxes next to the SKUs the client purchased or was interested in.
5. **Set Quantity (Real-Time Stock Verification)**:
   - Enter the desired quantity for each selected SKU.
   - > [!WARNING]
     > **Preventing Over-Orders**: The app instantly checks your local inventory stock. If you enter a quantity that exceeds what is physically available in our warehouse, the app will raise an alert: _"Insufficient Stock: You requested 20 items, but only 12 are available."_ You will be blocked from saving until a valid quantity is provided.
6. **Viber Interaction Proof (Mandatory for Viber Logs)**:
   - If you selected `Viber` as the interaction type, you **must** upload a proof-of-work screenshot of your chat conversation or quotation.
   - > [!TIP]
     > **Automatic Bandwidth Compression**: You don't have to worry about high data costs. The app automatically compresses your uploaded screenshot to **under 200KB** before saving it.
7. **Use Gemma AI Copilot (Optional)**:
   - Instead of picking everything manually, you can simply type or dictate a quick note into the **Gemma Copilot** text box (e.g. _"Spoke with Ko Aye, ordered 15 boxes of Premium Coffee Mix. He loved the taste, sentiment is great"_).
   - Tap **"Parse with AI"**. Gemma will automatically read your notes, set the commercial status to `Order Placed`, select the correct product, and input the quantity `15`.
8. **Save**: Click **"Save Log"**. The record is stamped with your device's internal clock and saved immediately to local storage.

---

### 3. Offline Mode & Synchronization Status

You can continue working completely normal during a power outage or cell tower blackout.

- **Sync Queue Indicator**: Look at the top right header. You will see a cloud sync icon with a number (e.g. `☁️ 5`). This tells you that you have **5 unsynced records** saved safely on your device.
- **Auto Sync**: The moment your device detects Wi-Fi or cellular service, the indicator will flash, the logs will silently upload, and the counter will return to `0`.

---

## 🗺️ Section 2: For Sales & Brand Managers (Strategy & Oversight)

As a manager, the system provides high-density administrative visibility (Desktop _Katana View_) and automated compliance auditing.

### 1. The Geographic Relationship Heatmap

Open the **Heatmap Dashboard** to view a live, interactive map of all shop accounts across Myanmar.

#### Pins Color Legend (Contact Recency):

- 🟢 **Bright Green**: Visited or contacted within the last **48 hours** (Active / Engaged).
- 🟢 **Faded Green**: Contacted within the last **7 days** (Healthy).
- 🟡 **Yellow Warning**: No contact for **8 to 14 days** (Warning Zone - rep needs to schedule a visit).
- 🔴 **Red Neglected**: No contact in **14+ days** or never contacted (Neglected Zone - action required!).

#### Pins Size Legend (Account Value):

- **Large Bubble**: High-volume, high LTV buyer.
- **Small Bubble**: Small retail shop or low LTV buyer.
- > [!TIP]
  > **Strategic Focus**: Protect large red bubbles first! A large red bubble means a high-value customer is being neglected.

#### Map Filters:

You can filter the dots on the map by:

1. **Sales Territory (Region)** (e.g., Yangon, Mandalay).
2. **Sales Representative** (track individual coverage).
3. **SKU Interest** (show only stores that buy Coffee Mix).
4. **Neglected Only** (instantly hide active green pins to isolate cold accounts).

#### Pre-Caching Offline Maps:

If you or a rep are travelling to a remote region with no internet, open the filter panel and tap **"Pre-cache Offline Map"**. The app will download OpenStreetMap tiles for your active territory and store them locally inside your browser/device's IndexedDB. The map will load and display perfectly in the field with no connection!

---

### 2. Oversight Dashboard ("Team Pulse")

The dashboard provides three powerful audit tools to ensure team compliance:

#### A. The Team Pulse Widget

A calendar grid mapping each sales representative against the days of the week:

- 🟩 **Green Box**: Quota met! Rep submitted their target number of customer interactions (e.g. 10+ logs).
- 🟨 **Yellow Box**: Rep submitted some updates but fell short of daily quota targets.
- 🟥 **Red Box**: Zero activity logged for that day.

#### B. Velocity Check (Anti-Dumping System)

Some reps try to bypass daily quotas by logging all visits at the end of the day or from their hotel room (data dumping).

- **The Rule**: The system tracks the interval between log submissions using the device's millisecond-accurate clock.
- **The Flag**: If a rep submits **more than 5 interaction logs within a 15-minute window**, the dashboard highlights these entries with a **"Batch Updated" warning flag**. Managers can instantly audit these entries to ensure the visits actually occurred.

#### C. Gemma End of Day (EOD) AI Digest

Every evening at **8:00 PM**, the local Gemma AI service runs an automated cron task:

1. Gathers all logged interactions from the day.
2. Performs automated sentiment analysis over rep comments.
3. Compiles a high-level email digest sent directly to managers, listing:
   - Total sales volume and revenue per rep.
   - A list of quota-compliant vs non-compliant reps.
   - Key market intelligence snippets (e.g., competitor price reductions or distribution delays).

---

## 🧪 Section 3: System Health & Testing (For IT & Support)

If you are setting up the system for the first time or validating a new build, you can run automated verification tests to ensure all schemas, database rules, currency conversions, and calculations are operating correctly.

### 1. Running the Test Suite

Open your computer's terminal, navigate to the project directory, and execute the following simple command:

```bash
npm run test
```

This runs our automated test runner (**Jest**) which executes our comprehensive test suites.

---

### 2. Understanding what the Tests Verify

When you run `npm run test`, the system executes **14 distinct verification checks** across our modules. Here is what they test in plain, easy-to-understand terms:

| Test Group                 | What it Verifies in Plain English                                                                                                         | Why it Matters                                                                       |
| :------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------- |
| **Domain Constants**       | Confirms that system-wide dropdown lists (Interaction types, Commercial statuses, Sentiment trends) contain exactly the approved choices. | Prevents typos and inconsistent categories from contaminating reports.               |
| **Region & Shop Data**     | Checks that region structures and shop profiles support nullable GPS coordinates.                                                         | Ensures that shops can still be saved even if GPS data is temporarily unavailable.   |
| **Contact Records**        | Verifies that shop contact cards have a valid phone number and a single marked "Primary Contact" flag.                                    | Ensures we always know who the primary shop owner is for Viber deep-linking.         |
| **Item Records**           | Confirms that all SKUs possess a unique item identifier, SKU code, and default MMK price.                                                 | Eliminates data fragmentation and keeps pricing calculations accurate.               |
| **Interaction Logs**       | Verifies that visits, comments, currencies, and dates can be successfully recorded together.                                              | Ensures the core interaction log is solid and accepts attachments.                   |
| **Transaction Quantities** | Ensures the system records a snapshot of the unit price at the time of sale.                                                              | Prevents historical price changes from altering past revenue statements.             |
| **Daily Quotas**           | Confirms that target sales metrics are formatted properly.                                                                                | Guarantees that the "Team Pulse" widget calculates compliance percentages correctly. |
| **Watermelon Sync**        | Checks that empty, new, or modified sync packets are grouped together correctly.                                                          | Ensures offline sync does not fail or lose entries during a push/pull session.       |
| **GuardAsync Recovery**    | Verifies that if a database write fails (e.g. duplicate SKU), the system safely catches the error instead of crashing the app.            | Guarantees that a single database glitch won't crash a representative's phone.       |

#### Successful Test Output Example:

When all tests pass successfully, you will see a green summary like this:

```text
 PASS   shared-types  src/lib/shared-types.spec.ts
  shared-types
    Domain constants
      ✓ INTERACTION_TYPES has expected values (1 ms)
      ✓ COMMERCIAL_STATUSES has expected values
      ...
    guardAsync
      ✓ returns [data, null] on successful resolution
      ✓ returns [null, error] on rejection

Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
Time:        0.453 s
```

---

## 🔧 Section 4: Basic Troubleshooting

### 1. I clicked "Launch Viber Chat" but nothing happened

- **Cause**: The shop owner's phone number might be missing its country code, or Viber is not installed on your current device.
- **Fix**: Ensure the phone number in the shop ledger includes a country code (e.g. `+959...`), and check that the official Viber messenger app is installed and logged in on your phone.

### 2. My sync counter is stuck at `☁️ 3` and won't sync

- **Cause**: You currently have no active internet connection, or our local sync server is offline.
- **Fix**: Open your device's web browser and verify you can load a website. If your internet is working, the sync server might be undergoing maintenance—your data is **completely safe** and will sync the moment the server comes back online.

### 3. The Leaflet Map displays grey grids

- **Cause**: You are offline and the map tiles for this region have not been downloaded yet.
- **Fix**: While you still have an active internet connection at the office, open the heatmap filter panel and click **"Pre-cache Offline Map"**. This pre-loads all terrain layers so they are available offline.
