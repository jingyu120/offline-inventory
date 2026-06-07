import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './shared-types/src/lib/db/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      'postgres://postgres:postgres@localhost:5432/inventory_db',
  },
});
