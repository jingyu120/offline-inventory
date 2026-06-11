import * as pgSchemaTables from './lib/db/schema';
import * as pgSchemaRelations from './lib/db/schema-relations';
import * as sqliteSchema from './lib/db/schema-sqlite';

// The Postgres schema namespace exposed to Drizzle = table definitions plus
// relational metadata. Tables and relations live in separate modules (so the
// table layer stays a pure structural source of truth) but are recombined here
// to preserve the exact object Drizzle's relational query API expects.
// The explicit annotation is required so declaration emit can name the type
// without referencing Drizzle's internal (.cjs) relation types (TS2883).
const pgSchema: typeof pgSchemaTables & typeof pgSchemaRelations = {
  ...pgSchemaTables,
  ...pgSchemaRelations,
};

export { pgSchema, sqliteSchema };
export * from './lib/types/shared-types';
export type { AppRouter } from './lib/api/trpc';
export * from './lib/ai/semanticSearch';
