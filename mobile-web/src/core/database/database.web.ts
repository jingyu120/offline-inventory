/**
 * database.web.ts — Web platform database provider.
 *
 * On web we use sql.js (SQLite WASM) loaded from a CDN with an IndexedDB fallback
 * for persistence. PowerSync and @powersync/react-native are native-only and
 * must NOT be imported here.
 */
import initSqlJs from 'sql.js';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { sqliteSchema } from '@burma-inventory/shared-types';

let realDb: $Any = null;
let initPromise: Promise<$Any> | null = null;

// Helper to open IndexedDB
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BurmaInventoryDB', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('sqlite_files')) {
        db.createObjectStore('sqlite_files');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Load SQLite file from IndexedDB
async function loadDbFromIndexedDB(): Promise<Uint8Array | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sqlite_files', 'readonly');
      const store = transaction.objectStore('sqlite_files');
      const request = store.get('burma_inventory.sqlite');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to load from IndexedDB, starting fresh:', err);
    return null;
  }
}

// Save SQLite file to IndexedDB
async function saveDbToIndexedDB(data: Uint8Array): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sqlite_files', 'readwrite');
      const store = transaction.objectStore('sqlite_files');
      const request = store.put(data, 'burma_inventory.sqlite');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to save to IndexedDB:', err);
  }
}

function createProxyDb(sqljsDb: $Any) {
  return drizzle(
    async (sql, params, method) => {
      try {
        if (method === 'run') {
          sqljsDb.run(sql, params);
          const data = sqljsDb.export();
          await saveDbToIndexedDB(data);
          return { rows: [] };
        }

        const stmt = sqljsDb.prepare(sql);
        stmt.bind(params);
        const rows: $Any[] = [];
        while (stmt.step()) {
          const rowVal = stmt.get();
          // console.log('[Proxy SQL.js Query]', sql, '-> Row:', rowVal);
          rows.push(rowVal);
        }
        stmt.free();

        // If it was a write query executed via execute, trigger auto-export
        const isWrite = /insert|update|delete|create|drop|alter|vacuum/i.test(
          sql,
        );
        if (isWrite) {
          const data = sqljsDb.export();
          await saveDbToIndexedDB(data);
        }

        if (method === 'get') {
          return { rows: rows[0] };
        }
        return { rows };
      } catch (err) {
        console.error(
          'SQL.js Proxy Query Error:',
          err,
          '\nSQL:',
          sql,
          '\nParams:',
          params,
        );
        throw err;
      }
    },
    { schema: sqliteSchema },
  );
}

async function createTablesAndSeedIfEmpty(sqljsDb: $Any) {
  try {
    // Create tables if they do not exist
    sqljsDb.run(`
      CREATE TABLE IF NOT EXISTS regions (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        division TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS townships (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        region_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS wards (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        township_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS shops (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        region_id TEXT NOT NULL,
        township_id TEXT,
        ward_id TEXT,
        assigned_rep_id TEXT,
        lifetime_value REAL NOT NULL DEFAULT 0,
        sentiment_trend TEXT NOT NULL DEFAULT 'STABLE',
        price_book_id TEXT,
        price_tier TEXT NOT NULL DEFAULT 'Retailer',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY NOT NULL,
        shop_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        email TEXT,
        is_primary INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY NOT NULL,
        sku TEXT NOT NULL,
        name TEXT NOT NULL,
        unit_price REAL NOT NULL,
        category TEXT NOT NULL,
        brand_id TEXT,
        thickness TEXT,
        weight TEXT,
        unit_type TEXT NOT NULL DEFAULT 'PCS',
        conversion_factor REAL NOT NULL DEFAULT 1,
        color TEXT,
        material_sub_type TEXT,
        hardware_finish TEXT,
        is_in_deficit INTEGER NOT NULL DEFAULT 0,
        base_wholesale_price REAL,
        base_currency TEXT,
        volume_discount_brackets TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS item_stocks (
        id TEXT PRIMARY KEY NOT NULL,
        item_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        pending_allocation_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS interaction_logs (
        id TEXT PRIMARY KEY NOT NULL,
        shop_id TEXT NOT NULL,
        rep_id TEXT NOT NULL,
        project_id TEXT,
        type TEXT NOT NULL,
        commercial_status TEXT NOT NULL,
        notes TEXT NOT NULL,
        next_follow_up_date INTEGER,
        viber_screenshot_url TEXT,
        created_at_local INTEGER NOT NULL,
        synced_at_server INTEGER,
        is_offline_entry INTEGER NOT NULL DEFAULT 0,
        device_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS interaction_items (
        id TEXT PRIMARY KEY NOT NULL,
        interaction_log_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price_at_sale REAL NOT NULL,
        interest_level TEXT,
        unit_price REAL,
        selected_currency TEXT NOT NULL DEFAULT 'MMK',
        selected_unit TEXT NOT NULL DEFAULT 'PCS',
        stock_condition TEXT NOT NULL DEFAULT 'GOOD',
        pending_allocation_count INTEGER NOT NULL DEFAULT 0,
        fulfillment_status TEXT NOT NULL DEFAULT 'PENDING_FULFILLMENT',
        compliance_status TEXT NOT NULL DEFAULT 'APPROVED',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS daily_quotas (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        target_visits INTEGER NOT NULL DEFAULT 0,
        target_phone INTEGER NOT NULL DEFAULT 0,
        target_viber INTEGER NOT NULL DEFAULT 0,
        effective_from INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS planned_routes (
        id TEXT PRIMARY KEY NOT NULL,
        rep_id TEXT NOT NULL,
        date TEXT NOT NULL,
        shop_ids TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS check_in_logs (
        id TEXT PRIMARY KEY NOT NULL,
        shop_id TEXT NOT NULL,
        rep_id TEXT NOT NULL,
        check_in_time INTEGER NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        verified INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS prediction_logs (
        id TEXT PRIMARY KEY NOT NULL,
        shop_id TEXT NOT NULL,
        predicted_ltv REAL NOT NULL DEFAULT 0,
        churn_risk REAL NOT NULL DEFAULT 0,
        stockout_risk REAL NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS recommended_orders (
        id TEXT PRIMARY KEY NOT NULL,
        shop_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        confidence REAL NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS price_books (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        region_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS price_book_items (
        id TEXT PRIMARY KEY NOT NULL,
        price_book_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        price REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'MMK',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS exchange_rates (
        id TEXT PRIMARY KEY NOT NULL,
        from_currency TEXT NOT NULL,
        to_currency TEXT NOT NULL,
        rate REAL NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS rep_scores (
        id TEXT PRIMARY KEY NOT NULL,
        rep_id TEXT NOT NULL,
        points INTEGER NOT NULL DEFAULT 0,
        streak_days INTEGER NOT NULL DEFAULT 0,
        badges TEXT NOT NULL DEFAULT '[]',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS points_logs (
        id TEXT PRIMARY KEY NOT NULL,
        rep_id TEXT NOT NULL,
        points_added INTEGER NOT NULL,
        reason TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS brands (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS stock_locations (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS stock_balances (
        id TEXT PRIMARY KEY NOT NULL,
        item_id TEXT NOT NULL,
        location_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS image_upload_queue (
        id TEXT PRIMARY KEY NOT NULL,
        local_file_path TEXT NOT NULL,
        interaction_log_id TEXT,
        competitor_insight_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS draft_carts (
        id TEXT PRIMARY KEY NOT NULL,
        shop_id TEXT NOT NULL,
        rep_id TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'MMK',
        project_id TEXT,
        items_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS telemetry_logs (
        id TEXT PRIMARY KEY NOT NULL,
        level TEXT NOT NULL,
        event_type TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        synced_at_server INTEGER,
        thermal_status TEXT,
        network_generation_2G_EDGE TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS rep_kpis (
        id TEXT PRIMARY KEY NOT NULL,
        rep_id TEXT NOT NULL,
        date TEXT NOT NULL,
        sales_volume REAL NOT NULL DEFAULT 0,
        sales_target REAL NOT NULL DEFAULT 0,
        visits_count INTEGER NOT NULL DEFAULT 0,
        visits_target INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS currency_exchange_rates (
        id TEXT PRIMARY KEY NOT NULL,
        currency TEXT NOT NULL,
        rate_to_kyat REAL NOT NULL,
        pushed_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS competitor_insights (
        id TEXT PRIMARY KEY NOT NULL,
        product_name TEXT NOT NULL,
        street_price REAL NOT NULL,
        photo_url TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS pending_inventory_updates (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        item_id TEXT,
        location_id TEXT NOT NULL,
        quantity_delta INTEGER,
        sku TEXT,
        name TEXT,
        unit_price REAL,
        category TEXT,
        submitted_by TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS audit_events (
        event_id TEXT PRIMARY KEY NOT NULL,
        trace_id TEXT,
        actor_id TEXT,
        device_id TEXT,
        entity_type TEXT NOT NULL,
        action TEXT NOT NULL,
        previous_state TEXT,
        new_state TEXT,
        gps_coordinates TEXT,
        hash TEXT,
        status TEXT NOT NULL DEFAULT 'VALID',
        created_at INTEGER NOT NULL,
        shop_id TEXT,
        executed_by_id TEXT,
        salesperson_id TEXT,
        approved_by_id TEXT
      );
      CREATE TABLE IF NOT EXISTS expected_inbounds (
        id TEXT PRIMARY KEY NOT NULL,
        sku TEXT NOT NULL,
        expected_quantity INTEGER NOT NULL,
        origin TEXT NOT NULL DEFAULT 'Thailand',
        estimated_arrival_date TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Run table creation as migration as well in case DB is already initialized
    sqljsDb.run(`
      CREATE TABLE IF NOT EXISTS pending_inventory_updates (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        item_id TEXT,
        location_id TEXT NOT NULL,
        quantity_delta INTEGER,
        sku TEXT,
        name TEXT,
        unit_price REAL,
        category TEXT,
        submitted_by TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS expected_inbounds (
        id TEXT PRIMARY KEY NOT NULL,
        sku TEXT NOT NULL,
        expected_quantity INTEGER NOT NULL,
        origin TEXT NOT NULL DEFAULT 'Thailand',
        estimated_arrival_date TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS audit_events (
        event_id TEXT PRIMARY KEY NOT NULL,
        trace_id TEXT,
        actor_id TEXT,
        device_id TEXT,
        entity_type TEXT NOT NULL,
        action TEXT NOT NULL,
        previous_state TEXT,
        new_state TEXT,
        gps_coordinates TEXT,
        hash TEXT,
        status TEXT NOT NULL DEFAULT 'VALID',
        created_at INTEGER NOT NULL,
        shop_id TEXT,
        executed_by_id TEXT,
        salesperson_id TEXT,
        approved_by_id TEXT
      );
    `);

    // Migration helper: Add columns if they do not exist in existing database schemas
    const alterTable = (table: string, column: string, definition: string) => {
      try {
        let columnExists = false;
        const infoStmt = sqljsDb.prepare(`PRAGMA table_info(${table});`);
        while (infoStmt.step()) {
          const row = infoStmt.getAsObject();
          if (row.name === column) {
            columnExists = true;
            break;
          }
        }
        infoStmt.free();

        if (columnExists) {
          return;
        }

        sqljsDb.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
        console.log(
          `Successfully migrated database: Added column ${column} to table ${table}`,
        );
      } catch (e: $Any) {
        console.warn(
          `Migration info for column ${column} in table ${table}:`,
          e.message || e,
        );
      }
    };

    alterTable('items', 'color', 'TEXT');
    alterTable('items', 'material_sub_type', 'TEXT');
    alterTable('items', 'hardware_finish', 'TEXT');
    alterTable('items', 'is_in_deficit', 'INTEGER NOT NULL DEFAULT 0');
    alterTable('items', 'base_wholesale_price', 'REAL');
    alterTable('items', 'base_currency', 'TEXT');
    alterTable('items', 'volume_discount_brackets', 'TEXT');
    alterTable(
      'interaction_items',
      'stock_condition',
      "TEXT NOT NULL DEFAULT 'GOOD'",
    );
    alterTable('interaction_logs', 'project_id', 'TEXT');
    alterTable(
      'item_stocks',
      'pending_allocation_count',
      'INTEGER NOT NULL DEFAULT 0',
    );
    alterTable(
      'interaction_items',
      'pending_allocation_count',
      'INTEGER NOT NULL DEFAULT 0',
    );
    alterTable(
      'interaction_items',
      'fulfillment_status',
      "TEXT NOT NULL DEFAULT 'PENDING_FULFILLMENT'",
    );
    alterTable(
      'interaction_items',
      'compliance_status',
      "TEXT NOT NULL DEFAULT 'APPROVED'",
    );
    alterTable('image_upload_queue', 'competitor_insight_id', 'TEXT');
    alterTable('shops', 'deleted_at', 'INTEGER');
    alterTable('shops', 'township_id', 'TEXT');
    alterTable('shops', 'ward_id', 'TEXT');
    alterTable('items', 'deleted_at', 'INTEGER');
    alterTable('projects', 'deleted_at', 'INTEGER');
    alterTable('draft_carts', 'trace_id', 'TEXT');
    alterTable('draft_carts', 'actor_id', 'TEXT');
    alterTable('image_upload_queue', 'trace_id', 'TEXT');
    alterTable('image_upload_queue', 'actor_id', 'TEXT');
    alterTable(
      'items',
      'inventory_status',
      "TEXT NOT NULL DEFAULT 'AVAILABLE'",
    );
    alterTable(
      'item_stocks',
      'inventory_status',
      "TEXT NOT NULL DEFAULT 'AVAILABLE'",
    );
    alterTable('interaction_logs', 'executed_by_id', 'TEXT');
    alterTable('interaction_logs', 'salesperson_id', 'TEXT');
    alterTable('interaction_logs', 'approved_by_id', 'TEXT');
    alterTable('audit_events', 'shop_id', 'TEXT');
    alterTable('audit_events', 'executed_by_id', 'TEXT');
    alterTable('audit_events', 'salesperson_id', 'TEXT');
    alterTable('audit_events', 'approved_by_id', 'TEXT');
    alterTable('draft_carts', 'executed_by_id', 'TEXT');
    alterTable('draft_carts', 'salesperson_id', 'TEXT');
    alterTable('draft_carts', 'approved_by_id', 'TEXT');
    alterTable('telemetry_logs', 'thermal_status', 'TEXT');
    alterTable('telemetry_logs', 'network_generation_2G_EDGE', 'TEXT');

    // Check if shops table is empty
    let isEmpty = true;
    const stmt = sqljsDb.prepare('SELECT COUNT(*) as count FROM shops;');
    if (stmt.step()) {
      const res = stmt.getAsObject();
      if (Number(res.count) > 0) {
        isEmpty = false;
      }
    }
    stmt.free();

    // Check if stock_locations table is empty
    let isStockLocationsEmpty = true;
    try {
      const stmtLoc = sqljsDb.prepare(
        'SELECT COUNT(*) as count FROM stock_locations;',
      );
      if (stmtLoc.step()) {
        const resLoc = stmtLoc.getAsObject();
        if (Number(resLoc.count) > 0) {
          isStockLocationsEmpty = false;
        }
      }
      stmtLoc.free();
    } catch (e) {
      console.warn('Failed to check if stock_locations is empty:', e);
    }

    if (isEmpty || isStockLocationsEmpty) {
      console.log(
        'Local SQLite database is empty or missing stock locations. Auto-seeding mock data...',
      );
      const tempDb = createProxyDb(sqljsDb);
      const { seedLocalDatabase } = await import('../data/mockSeeding');
      await seedLocalDatabase(tempDb);
      // Save database to IndexedDB after seeding
      const data = sqljsDb.export();
      await saveDbToIndexedDB(data);
    }
  } catch (err) {
    console.error('Error creating database schema or seeding:', err);
  }
}

async function getRealDb() {
  if (realDb) return realDb;
  if (!initPromise) {
    initPromise = (async () => {
      const SQL = await initSqlJs({
        locateFile: (file: string) => `/${file}`,
      });
      const savedData = await loadDbFromIndexedDB();
      let sqljsDb;
      if (savedData) {
        sqljsDb = new SQL.Database(savedData);
      } else {
        sqljsDb = new SQL.Database();
      }
      await createTablesAndSeedIfEmpty(sqljsDb);
      (window as $Any)._sqljsDb = sqljsDb;
      (window as $Any)._db = createProxyDb(sqljsDb);
      realDb = (window as $Any)._db;
      return realDb;
    })();
  }
  return initPromise;
}

// A chain proxy that collects all calls and replays them asynchronously when awaited (.then() is called).
const makeChainProxy = (
  calls: { prop: string | symbol; args: $Any[] }[] = [],
): $Any => {
  const handler: ProxyHandler<$Any> = {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve: $Any, reject: $Any) => {
          getRealDb()
            .then((db) => {
              let current = db;
              for (const call of calls) {
                if (typeof current[call.prop] !== 'function') {
                  throw new Error(
                    `Drizzle query builder method not found: ${String(call.prop)}`,
                  );
                }
                current = current[call.prop](...call.args);
              }
              // Await the final Drizzle query result
              return Promise.resolve(current).then(resolve, reject);
            })
            .catch(reject);
        };
      }

      return (...args: $Any[]) => {
        return makeChainProxy([...calls, { prop, args }]);
      };
    },
  };

  return new Proxy({}, handler);
};

// Root proxy representing the database instance
const databaseProxy = new Proxy({} as $Any, {
  get(target, prop) {
    // If the method is called on the root database object, start a call chain
    return (...args: $Any[]) => {
      return makeChainProxy([{ prop, args }]);
    };
  },
});

export const database = databaseProxy as ReturnType<
  typeof drizzle<typeof sqliteSchema>
>;
export type DatabaseType = typeof database;

/**
 * powerSyncDb stub — exposes just enough surface area so that callers in
 * App.tsx that call powerSyncDb.onChange / powerSyncDb.getUploadQueueStats
 * don't crash on web.
 */
export const powerSyncDb = {
  getUploadQueueStats: async () => ({ count: 0 }),
  onChange: (
    _handler: { onChange: () => void },
    _opts?: { tables?: string[] },
  ) => {
    // No-op on web — return a no-op unsubscribe function
    return () => {
      void 0;
    };
  },
  connect: async (_connector?: $Any) => {
    void 0;
  },
  disconnect: async () => {
    void 0;
  },
};
