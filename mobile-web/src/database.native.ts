import { PowerSyncDatabase } from '@powersync/react-native';
import {
  DrizzleAppSchema,
  wrapPowerSyncWithDrizzle,
} from '@powersync/drizzle-driver';
import { sqliteSchema } from '@burma-inventory/shared-types';

export const powerSyncDb = new PowerSyncDatabase({
  database: {
    dbFilename: 'burma_inventory.sqlite',
  },
  schema: new DrizzleAppSchema(sqliteSchema),
});

export const database = wrapPowerSyncWithDrizzle(powerSyncDb, {
  schema: sqliteSchema,
});
export type DatabaseType = typeof database;
