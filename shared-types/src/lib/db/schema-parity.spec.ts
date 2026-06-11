import { getTableConfig as getPgTableConfig } from 'drizzle-orm/pg-core';
import { getTableConfig as getSqliteTableConfig } from 'drizzle-orm/sqlite-core';
import * as pgSchema from './schema';
import * as sqliteSchema from './schema-sqlite';

/**
 * Schema parity guard.
 *
 * The Postgres (server) and SQLite (client) schemas intentionally diverge in
 * two controlled ways:
 *
 *  1. Platform-only tables — server-only auth/audit/idempotency tables and
 *     client-only offline queue tables. These are listed below and excluded
 *     from column comparison.
 *
 *  2. Server-only columns on shared tables — the server tracks soft-delete
 *     (`deleted_at`) and AI-verification metadata that never round-trips to the
 *     client. These are the only permitted PG-only columns on a shared table.
 *
 * Any OTHER divergence (a column on one side missing from the other, a brand
 * new shared table that drifts) fails this test. This is the single source of
 * truth for the intended client/server schema relationship; keep it updated
 * deliberately rather than letting the schemas drift silently.
 */

const SERVER_ONLY_TABLES = new Set([
  'users',
  'sync_audit_logs',
  'idempotency_keys',
]);

const CLIENT_ONLY_TABLES = new Set(['image_upload_queue', 'draft_carts']);

/**
 * Columns the server keeps that are deliberately never created on the client.
 * `deleted_at`: server soft-delete; the client applies deletes by removing rows.
 * `ai_verification_*`: server-side AI audit metadata (interaction_logs only).
 */
const ALLOWED_PG_ONLY_COLUMNS: Record<string, Set<string>> = {
  '*': new Set(['deleted_at']),
  interaction_logs: new Set([
    'deleted_at',
    'ai_verification_status',
    'ai_verification_notes',
  ]),
};

type AnyDrizzleTable = Parameters<typeof getPgTableConfig>[0];

const pgColumnNames = (table: AnyDrizzleTable): Set<string> =>
  new Set(getPgTableConfig(table).columns.map((c) => c.name));

const sqliteColumnNames = (
  table: Parameters<typeof getSqliteTableConfig>[0],
): Set<string> =>
  new Set(getSqliteTableConfig(table).columns.map((c) => c.name));

const tableNamesOf = (schema: Record<string, unknown>): Set<string> => {
  const names = new Set<string>();
  for (const value of Object.values(schema)) {
    // Drizzle tables expose their SQL name via the table-name symbol.
    const symbols = Object.getOwnPropertySymbols(value as object);
    const nameSym = symbols.find((s) => s.description === 'drizzle:Name');
    if (nameSym) {
      names.add((value as Record<symbol, string>)[nameSym]);
    }
  }
  return names;
};

const eachDrizzleTable = (
  schema: Record<string, unknown>,
): AnyDrizzleTable[] => {
  const tables: AnyDrizzleTable[] = [];
  for (const value of Object.values(schema)) {
    const symbols = Object.getOwnPropertySymbols(value as object);
    if (symbols.some((s) => s.description === 'drizzle:Name')) {
      tables.push(value as AnyDrizzleTable);
    }
  }
  return tables;
};

describe('PG ↔ SQLite schema parity', () => {
  const pgTables = tableNamesOf(pgSchema);
  const sqliteTables = tableNamesOf(sqliteSchema);

  it('exposes a well-formed config (incl. indexes) for every table', () => {
    for (const table of eachDrizzleTable(pgSchema)) {
      expect(getPgTableConfig(table).columns.length).toBeGreaterThan(0);
    }
    for (const table of eachDrizzleTable(sqliteSchema)) {
      expect(
        getSqliteTableConfig(
          table as Parameters<typeof getSqliteTableConfig>[0],
        ).columns.length,
      ).toBeGreaterThan(0);
    }
  });

  it('only diverges on the documented platform-only tables', () => {
    const pgOnly = [...pgTables].filter((t) => !sqliteTables.has(t));
    const sqliteOnly = [...sqliteTables].filter((t) => !pgTables.has(t));
    expect(new Set(pgOnly)).toEqual(SERVER_ONLY_TABLES);
    expect(new Set(sqliteOnly)).toEqual(CLIENT_ONLY_TABLES);
  });

  const sharedTableEntries = Object.entries(
    pgSchema as Record<string, unknown>,
  ).filter(([, value]) => {
    const symbols = Object.getOwnPropertySymbols(value as object);
    const nameSym = symbols.find((s) => s.description === 'drizzle:Name');
    if (!nameSym) return false;
    const name = (value as Record<symbol, string>)[nameSym];
    return sqliteTables.has(name) && pgTables.has(name);
  });

  it.each(sharedTableEntries)(
    'shared table "%s" keeps client and server columns aligned',
    (exportName) => {
      const pgTable = (pgSchema as Record<string, AnyDrizzleTable>)[exportName];
      const sqliteTable = (
        sqliteSchema as Record<
          string,
          Parameters<typeof getSqliteTableConfig>[0]
        >
      )[exportName];

      const tableName = getPgTableConfig(pgTable).name;
      const pgCols = pgColumnNames(pgTable);
      const sqliteCols = sqliteColumnNames(sqliteTable);

      const allowedPgOnly =
        ALLOWED_PG_ONLY_COLUMNS[tableName] ?? ALLOWED_PG_ONLY_COLUMNS['*'];

      // The client must never carry a column the server lacks on shared tables.
      const clientExtra = [...sqliteCols].filter((c) => !pgCols.has(c));
      expect(clientExtra).toEqual([]);

      // Every server column must exist on the client unless explicitly allowed.
      const serverExtra = [...pgCols].filter(
        (c) => !sqliteCols.has(c) && !allowedPgOnly.has(c),
      );
      expect(serverExtra).toEqual([]);
    },
  );
});
