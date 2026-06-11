import * as schema from '@burma-inventory/shared-types';

/**
 * Default password applied to every seeded user. Kept as a named constant
 * (rather than env wiring) so the zero-argument DrizzleService constructor and
 * the existing spec continue to work unchanged.
 */
export const DEFAULT_SEED_PASSWORD = 'changeme-rep-default';

/** User descriptors for the idempotent boot-time seed. */
export interface InitialUserSeed {
  id: string;
  username: string;
  role: string;
  region_id: string | null;
}

/** User descriptors for the destructive deterministic seed. */
export type DeterministicUserSeed = InitialUserSeed;

/** Project descriptors for the idempotent boot-time seed. */
export interface ProjectSeed {
  id: string;
  name: string;
}

/** Exchange-rate descriptors for the idempotent boot-time seed. */
export interface ExchangeRateSeed {
  from: string;
  to: string;
  rate: number;
}

/** Rep-score descriptors for the idempotent boot-time seed. */
export interface RepScoreSeed {
  repId: string;
  points: number;
  streakDays: number;
  badges: string;
}

/** Item descriptors for the idempotent boot-time seed. */
export interface InitialItemSeed {
  id: string;
  sku: string;
  name: string;
  unit_price: number;
  category: string;
  brand_id?: string;
  quantity: number;
  pendingAllocationCount?: number;
  color: string;
  material_sub_type: string | null;
  hardware_finish: string | null;
  is_in_deficit: boolean;
  base_wholesale_price: number | null;
  base_currency: string | null;
  volume_discount_brackets: string | null;
}

/** Shop descriptors for the idempotent boot-time seed. */
export interface InitialShopSeed {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  region_id: string;
  township_id: string;
  ward_id: string;
  price_book_id: string;
  ltv: number;
  trend: string;
}

/** Item descriptors for the destructive deterministic seed. */
export interface DeterministicItemSeed {
  id: string;
  sku: string;
  name: string;
  unit_price: number;
  category: string;
  brand_id: string;
  color?: string;
  weight?: string;
  finish_code?: string;
  dimensions?: string;
  good: number;
  wet: number;
  bad: number;
}

/** Shop descriptors for the destructive deterministic seed. */
export interface DeterministicShopSeed {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  region_id: string;
  credit_limit_mmk: number;
  price_book_id: string;
  assigned_rep_id: string;
}

export const INITIAL_USERS_SEED: readonly InitialUserSeed[] = [
  { id: 'rep-1', username: 'rep1', role: 'sales', region_id: 'region-yangon' },
  {
    id: 'rep-2',
    username: 'rep2',
    role: 'sales',
    region_id: 'region-mandalay',
  },
  { id: 'rep-3', username: 'rep3', role: 'manager', region_id: null },
  { id: 'rep-4', username: 'rep4', role: 'admin', region_id: null },
  { id: 'rep-5', username: 'rep5', role: 'intake', region_id: null },
];

export const INITIAL_PROJECTS_SEED: readonly ProjectSeed[] = [
  { id: 'project-1', name: 'Galaxy Tower-3' },
  { id: 'project-2', name: 'Zaw Residence' },
  { id: 'project-3', name: 'Grand Plaza Project' },
];

export const INITIAL_ITEMS_SEED: readonly InitialItemSeed[] = [
  {
    id: 'item-1',
    sku: 'SKU-SH-6MM',
    name: 'Shera Fiber Cement Board 6mm',
    unit_price: 15000.0,
    category: 'Fiber Cement',
    quantity: 150,
    color: 'Off-White',
    material_sub_type: 'MR',
    hardware_finish: null,
    is_in_deficit: true,
    base_wholesale_price: 3.2,
    base_currency: 'USD',
    volume_discount_brackets:
      '[{"quantity": 10, "discount_percent": 5}, {"quantity": 50, "discount_percent": 10}]',
  },
  {
    id: 'item-2',
    sku: 'SKU-GT-PVC-12',
    name: 'Gator PVC Pipe 1/2 inch',
    unit_price: 4500.0,
    category: 'Plumbing',
    quantity: 300,
    color: 'Blue',
    material_sub_type: 'RE',
    hardware_finish: null,
    is_in_deficit: false,
    base_wholesale_price: 35.0,
    base_currency: 'THB',
    volume_discount_brackets: '[{"quantity": 100, "discount_percent": 5}]',
  },
  {
    id: 'item-3',
    sku: 'SKU-KR-WC',
    name: 'Karat Ceramic Water Closet',
    unit_price: 180000.0,
    category: 'Sanitaryware',
    quantity: 500,
    color: 'White',
    material_sub_type: null,
    hardware_finish: 'CP',
    is_in_deficit: false,
    base_wholesale_price: null,
    base_currency: null,
    volume_discount_brackets: null,
  },
  {
    id: 'item-4',
    sku: 'SKU-VR-FC',
    name: 'VRH Stainless steel Faucet',
    unit_price: 35000.0,
    category: 'Fittings',
    quantity: 200,
    color: 'Silver',
    material_sub_type: null,
    hardware_finish: 'BL',
    is_in_deficit: false,
    base_wholesale_price: null,
    base_currency: null,
    volume_discount_brackets: null,
  },
  {
    id: 'item-5',
    sku: 'SKU-SCG-8MM',
    name: 'SCG Smart Board 8mm',
    unit_price: 22000.0,
    category: 'Fiber Cement',
    quantity: 120,
    color: 'Grey',
    material_sub_type: 'MR',
    hardware_finish: null,
    is_in_deficit: false,
    base_wholesale_price: null,
    base_currency: null,
    volume_discount_brackets: null,
  },
  {
    id: 'item-6',
    sku: 'SKU-KN-GP-9MM',
    name: 'Knauf Gypsum Board 9mm',
    unit_price: 12500.0,
    category: 'Drywall',
    quantity: 180,
    color: 'White',
    material_sub_type: 'RE',
    hardware_finish: null,
    is_in_deficit: false,
    base_wholesale_price: null,
    base_currency: null,
    volume_discount_brackets: null,
  },
  {
    id: 'item-7',
    sku: 'SKU-CR-GP-GROUT',
    name: 'Crocodile GP Grout',
    unit_price: 18000.0,
    category: 'Grout',
    brand_id: 'brand-crocodile',
    quantity: 0,
    pendingAllocationCount: 1756,
    color: 'Grey',
    material_sub_type: null,
    hardware_finish: null,
    is_in_deficit: false,
    base_wholesale_price: null,
    base_currency: null,
    volume_discount_brackets: null,
  },
];

export const INITIAL_EXCHANGE_RATES_SEED: readonly ExchangeRateSeed[] = [
  { from: 'USD', to: 'MMK', rate: 2100.0 },
  { from: 'THB', to: 'MMK', rate: 58.5 },
];

export const INITIAL_SHOPS_SEED: readonly InitialShopSeed[] = [
  {
    id: 'shop-1',
    name: 'City Mart Junction City',
    address: 'Bogyoke Aung San Rd, Yangon',
    latitude: 16.7794,
    longitude: 96.1518,
    region_id: 'region-yangon',
    township_id: 'township-lanmadaw',
    ward_id: 'ward-ward1',
    price_book_id: 'pb-yangon',
    ltv: 1250000.0,
    trend: 'IMPROVING',
  },
  {
    id: 'shop-2',
    name: 'Ruby Supermarket Mandalay',
    address: '78th St, Mandalay',
    latitude: 21.9754,
    longitude: 96.0838,
    region_id: 'region-mandalay',
    township_id: 'township-chanayethazan',
    ward_id: 'ward-pyigyimyatshin',
    price_book_id: 'pb-mandalay',
    ltv: 980000.0,
    trend: 'STABLE',
  },
  {
    id: 'shop-3',
    name: 'Kantharyar Shopping Centre',
    address: 'U Aung Myat St, Yangon',
    latitude: 16.7932,
    longitude: 96.1664,
    region_id: 'region-yangon',
    township_id: 'township-lanmadaw',
    ward_id: 'ward-ward2',
    price_book_id: 'pb-yangon',
    ltv: 450000.0,
    trend: 'DECLINING',
  },
  {
    id: 'shop-4',
    name: 'Mandalay Station Store',
    address: 'Railway Station Ground, Mandalay',
    latitude: 21.9685,
    longitude: 96.0852,
    region_id: 'region-mandalay',
    township_id: 'township-maharaundmyay',
    ward_id: 'ward-haymamarlar',
    price_book_id: 'pb-mandalay',
    ltv: 150000.0,
    trend: 'IMPROVING',
  },
  {
    id: 'shop-5',
    name: 'Mandalay Royal Palace Shop',
    address: '73rd St, Mandalay',
    latitude: 21.9902,
    longitude: 96.0965,
    region_id: 'region-mandalay',
    township_id: 'township-chanayethazan',
    ward_id: 'ward-pyigyimyatshin',
    price_book_id: 'pb-mandalay',
    ltv: 250000.0,
    trend: 'STABLE',
  },
];

export const INITIAL_REP_SCORES_SEED: readonly RepScoreSeed[] = [
  {
    repId: 'rep-1',
    points: 450,
    streakDays: 5,
    badges: JSON.stringify(['Top Seller', 'Early Bird']),
  },
  {
    repId: 'rep-2',
    points: 380,
    streakDays: 3,
    badges: JSON.stringify(['Road Warrior']),
  },
  {
    repId: 'rep-3',
    points: 0,
    streakDays: 0,
    badges: JSON.stringify([]),
  },
  {
    repId: 'rep-4',
    points: 1500,
    streakDays: 12,
    badges: JSON.stringify(['Admin Champion']),
  },
  {
    repId: 'rep-5',
    points: 120,
    streakDays: 2,
    badges: JSON.stringify(['Master Organizer']),
  },
];

export const DETERMINISTIC_USERS_SEED: readonly DeterministicUserSeed[] = [
  {
    id: 'rep-1',
    username: 'wintthandar',
    role: 'sales',
    region_id: 'region-yangon',
  },
  {
    id: 'rep-2',
    username: 'yeyint',
    role: 'sales',
    region_id: 'region-yangon',
  },
  {
    id: 'rep-3',
    username: 'khaingyeewin',
    role: 'sales',
    region_id: 'region-yangon',
  },
  { id: 'rep-4', username: 'urobin', role: 'manager', region_id: null },
  { id: 'rep-5', username: 'manwesoe', role: 'manager', region_id: null },
];

export const DETERMINISTIC_ITEMS_SEED: readonly DeterministicItemSeed[] = [
  {
    id: 'item-7',
    sku: 'SKU-CR-GP-GROUT-20KG',
    name: 'Crocodile GP Grout (Grey), 20Kg',
    unit_price: 18000,
    category: 'Grout',
    brand_id: 'brand-crocodile',
    color: 'Grey',
    weight: '20kg',
    good: -1756,
    wet: 0,
    bad: 498,
  },
  {
    id: 'item-1',
    sku: 'SKU-SH-CEILING-2X2',
    name: 'Shera Ceiling Board 2x2 (0.35x61x61)',
    unit_price: 47000,
    category: 'Fiber Cement',
    brand_id: 'brand-shera',
    dimensions: '2x2 (0.35x61x61)',
    good: 94765,
    wet: 16137,
    bad: 7060,
  },
  {
    id: 'item-3',
    sku: 'SKU-K-15814X-8-CP',
    name: 'K-15814X-8-CP CAPRI Kitchen Faucet',
    unit_price: 35000,
    category: 'Fittings',
    brand_id: 'brand-karat',
    finish_code: 'CP',
    good: 100,
    wet: 0,
    bad: 0,
  },
];

export const DETERMINISTIC_SHOPS_SEED: readonly DeterministicShopSeed[] = [
  {
    id: 'shop-1',
    name: 'Soe Moe Khaing (North Okkalar)',
    address: 'North Okkalar, Yangon',
    latitude: 16.9123,
    longitude: 96.1645,
    region_id: 'region-yangon',
    credit_limit_mmk: 5000000,
    price_book_id: 'pb-yangon',
    assigned_rep_id: 'rep-3',
  },
  {
    id: 'shop-2',
    name: 'Taw Win (South Dagon)',
    address: 'South Dagon, Yangon',
    latitude: 16.8543,
    longitude: 96.2134,
    region_id: 'region-yangon',
    credit_limit_mmk: 2500000,
    price_book_id: 'pb-yangon',
    assigned_rep_id: 'rep-1',
  },
  {
    id: 'shop-3',
    name: 'Thingaha (North Okkalar)',
    address: 'North Okkalar, Yangon',
    latitude: 16.9234,
    longitude: 96.1756,
    region_id: 'region-yangon',
    credit_limit_mmk: 10000000,
    price_book_id: 'pb-yangon',
    assigned_rep_id: 'rep-3',
  },
];

type InvoiceInsert = typeof schema.pgSchema.invoices.$inferInsert;
type PaymentInsert = typeof schema.pgSchema.payments.$inferInsert;
type ExpectedInboundInsert =
  typeof schema.pgSchema.expected_inbounds.$inferInsert;
type PendingInventoryUpdateInsert =
  typeof schema.pgSchema.pending_inventory_updates.$inferInsert;
type AuditEventInsert = typeof schema.pgSchema.audit_events.$inferInsert;
type InteractionLogInsert =
  typeof schema.pgSchema.interaction_logs.$inferInsert;
type InteractionItemInsert =
  typeof schema.pgSchema.interaction_items.$inferInsert;

/**
 * Invoices (AR) seed dataset shared by both seed routines. Date fields are
 * derived from the caller-supplied `now` so the relative due dates remain
 * identical to the original inline literals.
 */
export const buildInvoicesSeed = (now: number): InvoiceInsert[] => {
  const dueOverdue = now - 45 * 24 * 3600 * 1000;
  const duePending = now + 15 * 24 * 3600 * 1000;
  const duePartiallyPaid = now - 5 * 24 * 3600 * 1000;
  const duePaid = now - 20 * 24 * 3600 * 1000;

  return [
    {
      id: 'inv-1',
      shop_id: 'shop-1',
      interaction_log_id: 'log-r1-d0-1',
      amount: 1200000.0,
      due_date: dueOverdue,
      grace_period_days: 7,
      state: 'OVERDUE',
      created_at: now - 50 * 24 * 3600 * 1000,
      updated_at: now,
    },
    {
      id: 'inv-2',
      shop_id: 'shop-1',
      interaction_log_id: 'log-r1-d1-1',
      amount: 850000.0,
      due_date: duePending,
      grace_period_days: 7,
      state: 'PENDING',
      created_at: now - 10 * 24 * 3600 * 1000,
      updated_at: now,
    },
    {
      id: 'inv-3',
      shop_id: 'shop-1',
      interaction_log_id: 'log-r1-d1-7',
      amount: 500000.0,
      due_date: duePartiallyPaid,
      grace_period_days: 7,
      state: 'PARTIALLY_PAID',
      created_at: now - 15 * 24 * 3600 * 1000,
      updated_at: now,
    },
    {
      id: 'inv-4',
      shop_id: 'shop-3',
      interaction_log_id: 'log-r1-d0-2',
      amount: 2500000.0,
      due_date: now + 10 * 24 * 3600 * 1000,
      grace_period_days: 7,
      state: 'PENDING',
      created_at: now - 5 * 24 * 3600 * 1000,
      updated_at: now,
    },
    {
      id: 'inv-5',
      shop_id: 'shop-3',
      interaction_log_id: 'log-r1-d1-2',
      amount: 1800000.0,
      due_date: duePaid,
      grace_period_days: 7,
      state: 'PAID',
      created_at: now - 25 * 24 * 3600 * 1000,
      updated_at: now,
    },
  ];
};

/** Payments seed dataset shared by both seed routines. */
export const buildPaymentsSeed = (now: number): PaymentInsert[] => [
  {
    id: 'pay-1',
    invoice_id: 'inv-3',
    amount: 200000.0,
    payment_date: now - 6 * 24 * 3600 * 1000,
    transaction_ref: 'TXN-MMK-302198',
    screenshot_url: '/api/sync/uploads/mock_pay_1.png',
    reconciled_by: 'rep-4',
    created_at: now - 6 * 24 * 3600 * 1000,
    updated_at: now,
  },
  {
    id: 'pay-2',
    invoice_id: 'inv-5',
    amount: 1800000.0,
    payment_date: now - 20 * 24 * 3600 * 1000,
    transaction_ref: 'TXN-MMK-109283',
    screenshot_url: '/api/sync/uploads/mock_pay_2.png',
    reconciled_by: 'rep-4',
    created_at: now - 20 * 24 * 3600 * 1000,
    updated_at: now,
  },
];

/** Expected inbound (transit forecast) seed dataset shared by both routines. */
export const buildExpectedInboundsSeed = (
  now: number,
): ExpectedInboundInsert[] => [
  {
    id: 'inbound-1',
    sku: 'SKU-SH-CEILING-2X2',
    expected_quantity: 500,
    origin: 'Thailand',
    estimated_arrival_date: new Date(now + 2 * 24 * 3600 * 1000)
      .toISOString()
      .split('T')[0],
    created_at: now,
    updated_at: now,
  },
  {
    id: 'inbound-2',
    sku: 'SKU-CR-GP-GROUT-20KG',
    expected_quantity: 1000,
    origin: 'Thailand',
    estimated_arrival_date: new Date(now + 5 * 24 * 3600 * 1000)
      .toISOString()
      .split('T')[0],
    created_at: now,
    updated_at: now,
  },
  {
    id: 'inbound-3',
    sku: 'SKU-K-15814X-8-CP',
    expected_quantity: 250,
    origin: 'Thailand',
    estimated_arrival_date: new Date(now + 10 * 24 * 3600 * 1000)
      .toISOString()
      .split('T')[0],
    created_at: now,
    updated_at: now,
  },
];

/** Pending inventory updates (intake approvals queue) shared by both routines. */
export const buildPendingInventoryUpdatesSeed = (
  now: number,
): PendingInventoryUpdateInsert[] => [
  {
    id: 'pend-up-1',
    type: 'STOCK_ADJUSTMENT',
    item_id: 'item-1',
    location_id: 'loc-yangon-wh',
    quantity_delta: 150,
    submitted_by: 'manwesoe',
    status: 'PENDING',
    created_at: now,
    updated_at: now,
  },
  {
    id: 'pend-up-2',
    type: 'STOCK_ADJUSTMENT',
    item_id: 'item-7',
    location_id: 'loc-yangon-wh',
    quantity_delta: -50,
    submitted_by: 'khaingyeewin',
    status: 'PENDING',
    created_at: now,
    updated_at: now,
  },
  {
    id: 'pend-up-3',
    type: 'NEW_SKU',
    item_id: null,
    location_id: 'loc-yangon-wh',
    quantity_delta: 300,
    sku: 'SKU-GT-PVC-90',
    name: 'Gator PVC Pipe 90mm',
    unit_price: 12500,
    category: 'Plumbing',
    submitted_by: 'rep-1',
    status: 'PENDING',
    created_at: now,
    updated_at: now,
  },
];

/** Audit events (security/compliance) seed dataset shared by both routines. */
export const buildAuditEventsSeed = (now: number): AuditEventInsert[] => [
  {
    event_id: 'evt-1',
    trace_id: 'tr-001',
    actor_id: 'rep-1',
    device_id: 'dev-1',
    entity_type: 'ORDER',
    action: 'OVERRIDE',
    previous_state: { unit_price_at_sale: 47000 },
    new_state: { unit_price_at_sale: 40000 },
    gps_coordinates: '16.9123, 96.1645',
    hash: 'mock-hash-1',
    status: 'VALID',
    created_at: now - 3 * 3600 * 1000,
    shop_id: 'shop-1',
    executed_by_id: 'rep-1',
    salesperson_id: 'rep-1',
    approved_by_id: 'rep-3',
  },
  {
    event_id: 'evt-2',
    trace_id: 'tr-002',
    actor_id: 'rep-3',
    device_id: 'dev-1',
    entity_type: 'SHOP',
    action: 'UPDATE',
    previous_state: { credit_limit_mmk: 10000000 },
    new_state: { credit_limit_mmk: 12000000 },
    gps_coordinates: '16.9234, 96.1756',
    hash: 'mock-hash-2',
    status: 'VALID',
    created_at: now - 1 * 3600 * 1000,
    shop_id: 'shop-3',
    executed_by_id: 'rep-3',
    salesperson_id: 'rep-3',
    approved_by_id: 'rep-4',
  },
];

/** Mismatch interaction log (HITL verification queue) shared by both routines. */
export const buildMismatchInteractionLogSeed = (
  now: number,
): InteractionLogInsert => ({
  id: 'log-mismatch-1',
  shop_id: 'shop-1',
  rep_id: 'viber_bot',
  type: 'VIBER',
  commercial_status: 'ORDER_PLACED',
  notes:
    'Viber order mismatch detected. OCR parsed 10 bags of GP Grout, but image shows 20 bags.',
  ai_verification_status: 'MISMATCH',
  ai_verification_notes: 'OCR mismatch: quantity check failed.',
  viber_screenshot_url: '/api/sync/uploads/mock_mismatch_screenshot.png',
  created_at_local: now - 2 * 3600 * 1000,
  device_id: 'viber_bot',
  created_at: now - 2 * 3600 * 1000,
  updated_at: now,
});

/** Mismatch interaction item shared by both routines. */
export const buildMismatchInteractionItemSeed = (
  now: number,
): InteractionItemInsert => ({
  id: 'ii-mismatch-1',
  interaction_log_id: 'log-mismatch-1',
  item_id: 'item-7',
  quantity: 10,
  unit_price_at_sale: 18000,
  interest_level: 'HIGH',
  selected_currency: 'MMK',
  selected_unit: 'PCS',
  stock_condition: 'GOOD',
  fulfillment_status: 'PENDING_FULFILLMENT',
  compliance_status: 'APPROVED',
  created_at: now - 2 * 3600 * 1000,
  updated_at: now,
});
