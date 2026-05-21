/**
 * database.web.ts — Web platform database provider.
 *
 * On web we use expo-sqlite (SQLite WASM via Origin Private File System) with
 * Drizzle ORM directly. PowerSync and @powersync/react-native are native-only
 * and must NOT be imported here — doing so pulls in the React Native bridge
 * which crashes the web build.
 */
import * as ExpoSQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { sqliteSchema } from '@burma-inventory/shared-types';

let realDb: any = null;
let initPromise: Promise<any> | null = null;

function createProxyDb(expoDb: any) {
  return drizzle(
    async (sql, params, method) => {
      const statement = await expoDb.prepareAsync(sql);
      try {
        if (method === 'run') {
          await statement.executeAsync(params);
          return { rows: [] };
        }
        const result = await statement.executeForRawResultAsync(params);
        const rows = await result.getAllAsync();
        if (method === 'get') {
          return { rows: rows[0] };
        }
        return { rows };
      } catch (err) {
        console.error(
          'Proxy DB Query Error:',
          err,
          '\nSQL:',
          sql,
          '\nParams:',
          params,
        );
        throw err;
      } finally {
        await statement.finalizeAsync();
      }
    },
    { schema: sqliteSchema },
  );
}

async function createTablesAndSeedIfEmpty(expoDb: any) {
  try {
    // Create tables if they do not exist
    await expoDb.execAsync(`
      CREATE TABLE IF NOT EXISTS regions (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        division TEXT NOT NULL,
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
        assigned_rep_id TEXT,
        lifetime_value REAL NOT NULL DEFAULT 0,
        sentiment_trend TEXT NOT NULL DEFAULT 'STABLE',
        price_book_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
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
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS item_stocks (
        id TEXT PRIMARY KEY NOT NULL,
        item_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS interaction_logs (
        id TEXT PRIMARY KEY NOT NULL,
        shop_id TEXT NOT NULL,
        rep_id TEXT NOT NULL,
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
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
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
    `);

    // Check if shops table is empty
    const shopsCountResult = (await expoDb.getFirstAsync(
      'SELECT COUNT(*) as count FROM shops;',
    )) as { count: number } | null;

    if (!shopsCountResult || shopsCountResult.count === 0) {
      console.log('Local SQLite database is empty. Auto-seeding mock data...');
      const tempDb = createProxyDb(expoDb);
      const { seedLocalDatabase } = await import('./data/mockSeeding');
      await seedLocalDatabase(tempDb);
    }
  } catch (err) {
    console.error('Error creating database schema or seeding:', err);
  }
}

async function getRealDb() {
  if (realDb) return realDb;
  if (!initPromise) {
    initPromise = (async () => {
      // Use async open to avoid blocking the main thread during WASM worker/compilation startup
      const expoDb = await ExpoSQLite.openDatabaseAsync(
        'burma_inventory.sqlite',
      );
      await createTablesAndSeedIfEmpty(expoDb);
      realDb = createProxyDb(expoDb);
      return realDb;
    })();
  }
  return initPromise;
}

// A chain proxy that collects all calls and replays them asynchronously when awaited (.then() is called).
const makeChainProxy = (
  calls: { prop: string | symbol; args: any[] }[] = [],
): any => {
  const handler: ProxyHandler<any> = {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve: any, reject: any) => {
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

      return (...args: any[]) => {
        return makeChainProxy([...calls, { prop, args }]);
      };
    },
  };

  return new Proxy({}, handler);
};

// Root proxy representing the database instance
const databaseProxy = new Proxy({} as any, {
  get(target, prop) {
    // If the method is called on the root database object, start a call chain
    return (...args: any[]) => {
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
 * don't crash on web. These are no-ops on web since there is no sync service.
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
  connect: async (_connector?: any) => {
    void 0;
  },
  disconnect: async () => {
    void 0;
  },
};
