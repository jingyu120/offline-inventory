import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { mySchema, InventoryItem } from '@burma-inventory/shared-types';
import { Platform } from 'react-native';

const adapter = Platform.OS === 'web'
  ? new LokiJSAdapter({
      schema: mySchema,
      useWebWorker: false,
      useIncrementalIndexedDB: true,
      onSetUpError: error => {
        console.error('WatermelonDB setup error', error);
      }
    })
  : new SQLiteAdapter({
      schema: mySchema,
      jsi: true, /* Set to false if JSI is not supported on older versions, but recommended for performance */
      onSetUpError: error => {
        console.error('WatermelonDB setup error', error);
      }
    });

export const database = new Database({
  adapter,
  modelClasses: [
    InventoryItem,
  ],
});
