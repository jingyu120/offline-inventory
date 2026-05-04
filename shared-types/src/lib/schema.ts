import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 3,
  tables: [
    tableSchema({
      name: 'inventory_items',
      columns: [
        { name: 'barcode', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'quantity', type: 'number' },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'location', type: 'string', isOptional: true },
        { name: 'shipped_at', type: 'number', isOptional: true },
        { name: 'received_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
