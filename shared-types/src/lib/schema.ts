import {
  pgTable,
  text,
  integer,
  boolean,
  doublePrecision,
  bigint,
  index,
} from 'drizzle-orm/pg-core';

export const regions = pgTable(
  'regions',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    division: text('division').notNull(),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    nameIdx: index('regions_name_idx').on(table.name),
  }),
);

export const shops = pgTable(
  'shops',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    address: text('address').notNull(),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    region_id: text('region_id').notNull(),
    assigned_rep_id: text('assigned_rep_id'),
    lifetime_value: doublePrecision('lifetime_value').notNull().default(0),
    sentiment_trend: text('sentiment_trend').notNull().default('STABLE'),
    price_book_id: text('price_book_id'),
    price_tier: text('price_tier').notNull().default('Retailer'),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    nameIdx: index('shops_name_idx').on(table.name),
    regionIdIdx: index('shops_region_id_idx').on(table.region_id),
    assignedRepIdIdx: index('shops_assigned_rep_id_idx').on(
      table.assigned_rep_id,
    ),
  }),
);

export const contacts = pgTable(
  'contacts',
  {
    id: text('id').primaryKey(),
    shop_id: text('shop_id').notNull(),
    name: text('name').notNull(),
    phone_number: text('phone_number').notNull(),
    email: text('email'),
    is_primary: boolean('is_primary').notNull().default(false),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    shopIdIdx: index('contacts_shop_id_idx').on(table.shop_id),
  }),
);

export const items = pgTable(
  'items',
  {
    id: text('id').primaryKey(),
    sku: text('sku').notNull(),
    name: text('name').notNull(),
    unit_price: doublePrecision('unit_price').notNull(),
    category: text('category').notNull(),
    brand_id: text('brand_id'),
    thickness: text('thickness'),
    weight: text('weight'),
    unit_type: text('unit_type').notNull().default('PCS'),
    conversion_factor: doublePrecision('conversion_factor')
      .notNull()
      .default(1),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    skuIdx: index('items_sku_idx').on(table.sku),
  }),
);

export const item_stocks = pgTable(
  'item_stocks',
  {
    id: text('id').primaryKey(),
    item_id: text('item_id').notNull(),
    quantity: integer('quantity').notNull().default(0),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    itemIdIdx: index('item_stocks_item_id_idx').on(table.item_id),
  }),
);

export const interaction_logs = pgTable(
  'interaction_logs',
  {
    id: text('id').primaryKey(),
    shop_id: text('shop_id').notNull(),
    rep_id: text('rep_id').notNull(),
    type: text('type').notNull(),
    commercial_status: text('commercial_status').notNull(),
    notes: text('notes').notNull(),
    next_follow_up_date: bigint('next_follow_up_date', { mode: 'number' }),
    viber_screenshot_url: text('viber_screenshot_url'),
    created_at_local: bigint('created_at_local', { mode: 'number' }).notNull(),
    synced_at_server: bigint('synced_at_server', { mode: 'number' }),
    is_offline_entry: boolean('is_offline_entry').notNull().default(false),
    device_id: text('device_id').notNull(),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    shopIdIdx: index('interaction_logs_shop_id_idx').on(table.shop_id),
    repIdIdx: index('interaction_logs_rep_id_idx').on(table.rep_id),
  }),
);

export const interaction_items = pgTable(
  'interaction_items',
  {
    id: text('id').primaryKey(),
    interaction_log_id: text('interaction_log_id').notNull(),
    item_id: text('item_id').notNull(),
    quantity: integer('quantity').notNull().default(1),
    unit_price_at_sale: doublePrecision('unit_price_at_sale').notNull(),
    interest_level: text('interest_level'),
    unit_price: doublePrecision('unit_price'),
    selected_currency: text('selected_currency').notNull().default('MMK'),
    selected_unit: text('selected_unit').notNull().default('PCS'),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    logIdIdx: index('interaction_items_log_id_idx').on(
      table.interaction_log_id,
    ),
    itemIdIdx: index('interaction_items_item_id_idx').on(table.item_id),
  }),
);

export const daily_quotas = pgTable(
  'daily_quotas',
  {
    id: text('id').primaryKey(),
    user_id: text('user_id').notNull(),
    target_visits: integer('target_visits').notNull().default(0),
    target_phone: integer('target_phone').notNull().default(0),
    target_viber: integer('target_viber').notNull().default(0),
    effective_from: bigint('effective_from', { mode: 'number' }).notNull(),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    userIdIdx: index('daily_quotas_user_id_idx').on(table.user_id),
  }),
);

export const planned_routes = pgTable(
  'planned_routes',
  {
    id: text('id').primaryKey(),
    rep_id: text('rep_id').notNull(),
    date: text('date').notNull(),
    shop_ids: text('shop_ids').notNull(),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    repIdIdx: index('planned_routes_rep_id_idx').on(table.rep_id),
  }),
);

export const check_in_logs = pgTable(
  'check_in_logs',
  {
    id: text('id').primaryKey(),
    shop_id: text('shop_id').notNull(),
    rep_id: text('rep_id').notNull(),
    check_in_time: bigint('check_in_time', { mode: 'number' }).notNull(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    verified: boolean('verified').notNull().default(false),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    shopIdIdx: index('check_in_logs_shop_id_idx').on(table.shop_id),
    repIdIdx: index('check_in_logs_rep_id_idx').on(table.rep_id),
  }),
);

export const prediction_logs = pgTable(
  'prediction_logs',
  {
    id: text('id').primaryKey(),
    shop_id: text('shop_id').notNull(),
    predicted_ltv: doublePrecision('predicted_ltv').notNull().default(0),
    churn_risk: doublePrecision('churn_risk').notNull().default(0),
    stockout_risk: doublePrecision('stockout_risk').notNull().default(0),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    shopIdIdx: index('prediction_logs_shop_id_idx').on(table.shop_id),
  }),
);

export const recommended_orders = pgTable(
  'recommended_orders',
  {
    id: text('id').primaryKey(),
    shop_id: text('shop_id').notNull(),
    item_id: text('item_id').notNull(),
    quantity: integer('quantity').notNull().default(0),
    confidence: doublePrecision('confidence').notNull().default(0),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    shopIdIdx: index('recommended_orders_shop_id_idx').on(table.shop_id),
    itemIdIdx: index('recommended_orders_item_id_idx').on(table.item_id),
  }),
);

export const price_books = pgTable(
  'price_books',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    region_id: text('region_id'),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    regionIdIdx: index('price_books_region_id_idx').on(table.region_id),
  }),
);

export const price_book_items = pgTable(
  'price_book_items',
  {
    id: text('id').primaryKey(),
    price_book_id: text('price_book_id').notNull(),
    item_id: text('item_id').notNull(),
    price: doublePrecision('price').notNull(),
    currency: text('currency').notNull().default('MMK'),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    bookIdIdx: index('price_book_items_book_id_idx').on(table.price_book_id),
    itemIdIdx: index('price_book_items_item_id_idx').on(table.item_id),
  }),
);

export const exchange_rates = pgTable('exchange_rates', {
  id: text('id').primaryKey(),
  from_currency: text('from_currency').notNull(),
  to_currency: text('to_currency').notNull(),
  rate: doublePrecision('rate').notNull(),
  updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
});

export const rep_scores = pgTable(
  'rep_scores',
  {
    id: text('id').primaryKey(),
    rep_id: text('rep_id').notNull(),
    points: integer('points').notNull().default(0),
    streak_days: integer('streak_days').notNull().default(0),
    badges: text('badges').notNull().default('[]'),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    repIdIdx: index('rep_scores_rep_id_idx').on(table.rep_id),
  }),
);

export const points_logs = pgTable(
  'points_logs',
  {
    id: text('id').primaryKey(),
    rep_id: text('rep_id').notNull(),
    points_added: integer('points_added').notNull(),
    reason: text('reason').notNull(),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    repIdIdx: index('points_logs_rep_id_idx').on(table.rep_id),
  }),
);

export const brands = pgTable(
  'brands',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    nameIdx: index('brands_name_idx').on(table.name),
  }),
);

export const stock_locations = pgTable(
  'stock_locations',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    nameIdx: index('stock_locations_name_idx').on(table.name),
  }),
);

export const stock_balances = pgTable(
  'stock_balances',
  {
    id: text('id').primaryKey(),
    item_id: text('item_id').notNull(),
    location_id: text('location_id').notNull(),
    quantity: integer('quantity').notNull().default(0),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    itemIdIdx: index('stock_balances_item_id_idx').on(table.item_id),
    locationIdIdx: index('stock_balances_location_id_idx').on(
      table.location_id,
    ),
  }),
);
