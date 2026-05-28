import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from 'drizzle-orm/sqlite-core';

export const regions = sqliteTable(
  'regions',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    division: text('division').notNull(),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => ({
    nameIdx: index('regions_name_idx').on(table.name),
  }),
);

export const shops = sqliteTable(
  'shops',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    address: text('address').notNull(),
    latitude: real('latitude'),
    longitude: real('longitude'),
    region_id: text('region_id').notNull(),
    assigned_rep_id: text('assigned_rep_id'),
    lifetime_value: real('lifetime_value').notNull().default(0),
    sentiment_trend: text('sentiment_trend').notNull().default('STABLE'),
    price_book_id: text('price_book_id'),
    price_tier: text('price_tier').notNull().default('Retailer'),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
    deleted_at: integer('deleted_at'),
  },
  (table) => ({
    nameIdx: index('shops_name_idx').on(table.name),
    regionIdIdx: index('shops_region_id_idx').on(table.region_id),
    assignedRepIdIdx: index('shops_assigned_rep_id_idx').on(
      table.assigned_rep_id,
    ),
  }),
);

export const contacts = sqliteTable(
  'contacts',
  {
    id: text('id').primaryKey(),
    shop_id: text('shop_id').notNull(),
    name: text('name').notNull(),
    phone_number: text('phone_number').notNull(),
    email: text('email'),
    is_primary: integer('is_primary', { mode: 'boolean' })
      .notNull()
      .default(false),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => ({
    shopIdIdx: index('contacts_shop_id_idx').on(table.shop_id),
  }),
);

export const items = sqliteTable(
  'items',
  {
    id: text('id').primaryKey(),
    sku: text('sku').notNull(),
    name: text('name').notNull(),
    unit_price: real('unit_price').notNull(),
    category: text('category').notNull(),
    brand_id: text('brand_id'),
    thickness: text('thickness'),
    weight: text('weight'),
    unit_type: text('unit_type').notNull().default('PCS'),
    conversion_factor: real('conversion_factor').notNull().default(1),
    color: text('color'),
    material_sub_type: text('material_sub_type'),
    hardware_finish: text('hardware_finish'),
    is_in_deficit: integer('is_in_deficit', { mode: 'boolean' })
      .notNull()
      .default(false),
    base_wholesale_price: real('base_wholesale_price'),
    base_currency: text('base_currency'),
    volume_discount_brackets: text('volume_discount_brackets'),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
    deleted_at: integer('deleted_at'),
  },
  (table) => ({
    skuIdx: index('items_sku_idx').on(table.sku),
  }),
);

export const item_stocks = sqliteTable(
  'item_stocks',
  {
    id: text('id').primaryKey(),
    item_id: text('item_id').notNull(),
    quantity: integer('quantity').notNull().default(0),
    pending_allocation_count: integer('pending_allocation_count')
      .notNull()
      .default(0),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => ({
    itemIdIdx: index('item_stocks_item_id_idx').on(table.item_id),
  }),
);

export const interaction_logs = sqliteTable(
  'interaction_logs',
  {
    id: text('id').primaryKey(),
    shop_id: text('shop_id').notNull(),
    rep_id: text('rep_id').notNull(),
    project_id: text('project_id'),
    type: text('type').notNull(),
    commercial_status: text('commercial_status').notNull(),
    notes: text('notes').notNull(),
    next_follow_up_date: integer('next_follow_up_date'),
    viber_screenshot_url: text('viber_screenshot_url'),
    created_at_local: integer('created_at_local').notNull(),
    synced_at_server: integer('synced_at_server'),
    is_offline_entry: integer('is_offline_entry', { mode: 'boolean' })
      .notNull()
      .default(false),
    device_id: text('device_id').notNull(),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => ({
    shopIdIdx: index('interaction_logs_shop_id_idx').on(table.shop_id),
    repIdIdx: index('interaction_logs_rep_id_idx').on(table.rep_id),
  }),
);

export const interaction_items = sqliteTable(
  'interaction_items',
  {
    id: text('id').primaryKey(),
    interaction_log_id: text('interaction_log_id').notNull(),
    item_id: text('item_id').notNull(),
    quantity: integer('quantity').notNull().default(1),
    unit_price_at_sale: real('unit_price_at_sale').notNull(),
    interest_level: text('interest_level'),
    unit_price: real('unit_price'),
    selected_currency: text('selected_currency').notNull().default('MMK'),
    selected_unit: text('selected_unit').notNull().default('PCS'),
    stock_condition: text('stock_condition').notNull().default('GOOD'),
    pending_allocation_count: integer('pending_allocation_count')
      .notNull()
      .default(0),
    fulfillment_status: text('fulfillment_status')
      .notNull()
      .default('PENDING_FULFILLMENT'),
    compliance_status: text('compliance_status').notNull().default('APPROVED'),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => ({
    logIdIdx: index('interaction_items_log_id_idx').on(
      table.interaction_log_id,
    ),
    itemIdIdx: index('interaction_items_item_id_idx').on(table.item_id),
  }),
);

export const daily_quotas = sqliteTable(
  'daily_quotas',
  {
    id: text('id').primaryKey(),
    user_id: text('user_id').notNull(),
    target_visits: integer('target_visits').notNull().default(0),
    target_phone: integer('target_phone').notNull().default(0),
    target_viber: integer('target_viber').notNull().default(0),
    effective_from: integer('effective_from').notNull(),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => ({
    userIdIdx: index('daily_quotas_user_id_idx').on(table.user_id),
  }),
);

export const planned_routes = sqliteTable(
  'planned_routes',
  {
    id: text('id').primaryKey(),
    rep_id: text('rep_id').notNull(),
    date: text('date').notNull(),
    shop_ids: text('shop_ids').notNull(), // JSON string on SQLite
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => ({
    repIdIdx: index('planned_routes_rep_id_idx').on(table.rep_id),
  }),
);

export const check_in_logs = sqliteTable(
  'check_in_logs',
  {
    id: text('id').primaryKey(),
    shop_id: text('shop_id').notNull(),
    rep_id: text('rep_id').notNull(),
    check_in_time: integer('check_in_time').notNull(),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => ({
    shopIdIdx: index('check_in_logs_shop_id_idx').on(table.shop_id),
    repIdIdx: index('check_in_logs_rep_id_idx').on(table.rep_id),
  }),
);

export const prediction_logs = sqliteTable(
  'prediction_logs',
  {
    id: text('id').primaryKey(),
    shop_id: text('shop_id').notNull(),
    predicted_ltv: real('predicted_ltv').notNull().default(0),
    churn_risk: real('churn_risk').notNull().default(0),
    stockout_risk: real('stockout_risk').notNull().default(0),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => ({
    shopIdIdx: index('prediction_logs_shop_id_idx').on(table.shop_id),
  }),
);

export const recommended_orders = sqliteTable(
  'recommended_orders',
  {
    id: text('id').primaryKey(),
    shop_id: text('shop_id').notNull(),
    item_id: text('item_id').notNull(),
    quantity: integer('quantity').notNull().default(0),
    confidence: real('confidence').notNull().default(0),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => ({
    shopIdIdx: index('recommended_orders_shop_id_idx').on(table.shop_id),
    itemIdIdx: index('recommended_orders_item_id_idx').on(table.item_id),
  }),
);

export const price_books = sqliteTable(
  'price_books',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    region_id: text('region_id'),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => ({
    regionIdIdx: index('price_books_region_id_idx').on(table.region_id),
  }),
);

export const price_book_items = sqliteTable(
  'price_book_items',
  {
    id: text('id').primaryKey(),
    price_book_id: text('price_book_id').notNull(),
    item_id: text('item_id').notNull(),
    price: real('price').notNull(),
    currency: text('currency').notNull().default('MMK'),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => ({
    bookIdIdx: index('price_book_items_book_id_idx').on(table.price_book_id),
    itemIdIdx: index('price_book_items_item_id_idx').on(table.item_id),
  }),
);

export const exchange_rates = sqliteTable('exchange_rates', {
  id: text('id').primaryKey(),
  from_currency: text('from_currency').notNull(),
  to_currency: text('to_currency').notNull(),
  rate: real('rate').notNull(),
  updated_at: integer('updated_at').notNull(),
});

export const rep_scores = sqliteTable(
  'rep_scores',
  {
    id: text('id').primaryKey(),
    rep_id: text('rep_id').notNull(),
    points: integer('points').notNull().default(0),
    streak_days: integer('streak_days').notNull().default(0),
    badges: text('badges').notNull().default('[]'),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => ({
    repIdIdx: index('rep_scores_rep_id_idx').on(table.rep_id),
  }),
);

export const points_logs = sqliteTable(
  'points_logs',
  {
    id: text('id').primaryKey(),
    rep_id: text('rep_id').notNull(),
    points_added: integer('points_added').notNull(),
    reason: text('reason').notNull(),
    created_at: integer('created_at').notNull(),
  },
  (table) => ({
    repIdIdx: index('points_logs_rep_id_idx').on(table.rep_id),
  }),
);

export const brands = sqliteTable(
  'brands',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => ({
    nameIdx: index('brands_name_idx').on(table.name),
  }),
);

export const stock_locations = sqliteTable(
  'stock_locations',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => ({
    nameIdx: index('stock_locations_name_idx').on(table.name),
  }),
);

export const stock_balances = sqliteTable(
  'stock_balances',
  {
    id: text('id').primaryKey(),
    item_id: text('item_id').notNull(),
    location_id: text('location_id').notNull(),
    quantity: integer('quantity').notNull().default(0),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => ({
    itemIdIdx: index('stock_balances_item_id_idx').on(table.item_id),
    locationIdIdx: index('stock_balances_location_id_idx').on(
      table.location_id,
    ),
  }),
);

export const image_upload_queue = sqliteTable('image_upload_queue', {
  id: text('id').primaryKey(),
  local_file_path: text('local_file_path').notNull(),
  interaction_log_id: text('interaction_log_id'),
  competitor_insight_id: text('competitor_insight_id'),
  status: text('status').notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  created_at: integer('created_at').notNull(),
  updated_at: integer('updated_at').notNull(),
});

export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
    deleted_at: integer('deleted_at'),
  },
  (table) => ({
    nameIdx: index('projects_name_idx').on(table.name),
  }),
);

export const draft_carts = sqliteTable('draft_carts', {
  id: text('id').primaryKey(),
  shop_id: text('shop_id').notNull(),
  rep_id: text('rep_id').notNull(),
  currency: text('currency').notNull().default('MMK'),
  project_id: text('project_id'),
  items_json: text('items_json').notNull(),
  updated_at: integer('updated_at').notNull(),
});

export const telemetry_logs = sqliteTable('telemetry_logs', {
  id: text('id').primaryKey(),
  level: text('level').notNull(),
  event_type: text('event_type').notNull(),
  message: text('message').notNull(),
  timestamp: integer('timestamp').notNull(),
  synced_at_server: integer('synced_at_server'),
  created_at: integer('created_at').notNull(),
  updated_at: integer('updated_at').notNull(),
});

export const rep_kpis = sqliteTable(
  'rep_kpis',
  {
    id: text('id').primaryKey(),
    rep_id: text('rep_id').notNull(),
    date: text('date').notNull(),
    sales_volume: real('sales_volume').notNull().default(0),
    sales_target: real('sales_target').notNull().default(0),
    visits_count: integer('visits_count').notNull().default(0),
    visits_target: integer('visits_target').notNull().default(0),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => ({
    repIdIdx: index('rep_kpis_rep_id_idx').on(table.rep_id),
  }),
);

export const currency_exchange_rates = sqliteTable('currency_exchange_rates', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull(),
  rate_to_kyat: real('rate_to_kyat').notNull(),
  pushed_at: integer('pushed_at').notNull(),
});

export const competitor_insights = sqliteTable('competitor_insights', {
  id: text('id').primaryKey(),
  product_name: text('product_name').notNull(),
  street_price: real('street_price').notNull(),
  photo_url: text('photo_url'),
  created_at: integer('created_at').notNull(),
  updated_at: integer('updated_at').notNull(),
});
