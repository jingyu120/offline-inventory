import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 7,
  tables: [
    tableSchema({
      name: 'item_stocks',
      columns: [
        { name: 'item_id', type: 'string', isIndexed: true },
        { name: 'quantity', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'regions',
      columns: [
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'division', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'shops',
      columns: [
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'address', type: 'string' },
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
        { name: 'region_id', type: 'string', isIndexed: true },
        {
          name: 'assigned_rep_id',
          type: 'string',
          isOptional: true,
          isIndexed: true,
        },
        { name: 'lifetime_value', type: 'number' },
        { name: 'sentiment_trend', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'contacts',
      columns: [
        { name: 'shop_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'phone_number', type: 'string' },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'is_primary', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'items',
      columns: [
        { name: 'sku', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'unit_price', type: 'number' },
        { name: 'category', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'interaction_logs',
      columns: [
        { name: 'shop_id', type: 'string', isIndexed: true },
        { name: 'rep_id', type: 'string', isIndexed: true },
        { name: 'type', type: 'string' },
        { name: 'commercial_status', type: 'string' },
        { name: 'notes', type: 'string' },
        { name: 'next_follow_up_date', type: 'number', isOptional: true },
        { name: 'viber_screenshot_url', type: 'string', isOptional: true },
        { name: 'created_at_local', type: 'number' },
        { name: 'synced_at_server', type: 'number', isOptional: true },
        { name: 'is_offline_entry', type: 'boolean' },
        { name: 'device_id', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'interaction_items',
      columns: [
        { name: 'interaction_log_id', type: 'string', isIndexed: true },
        { name: 'item_id', type: 'string', isIndexed: true },
        { name: 'quantity', type: 'number' },
        { name: 'unit_price_at_sale', type: 'number' },
        { name: 'interest_level', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'daily_quotas',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'target_visits', type: 'number' },
        { name: 'target_phone', type: 'number' },
        { name: 'target_viber', type: 'number' },
        { name: 'effective_from', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
