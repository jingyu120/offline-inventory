import { sqliteSchema } from '@burma-inventory/shared-types';

/**
 * Sprint 38 — E2E Transactional State.
 *
 * Canned KPay transfer payload for the reconciliation E2E flow. Testers (and
 * automated E2E specs) feed these values directly into PendingReconciliationPanel
 * so the FIFO reconcile can run deterministically without pinging the local LLM
 * OCR/parse pipeline. Matched against the open `inv-e2e-kpay-shop-2` invoice.
 */
export const MOCK_KPAY_TRANSFER = {
  transaction_id: 'KPAY-998877',
  transfer_amount: 1500000,
  confidence_score: 0.98,
} as const;

export const seedLocalDatabase = async (db: $Any): Promise<void> => {
  // Clear existing records first
  const tables = [
    sqliteSchema.payments,
    sqliteSchema.invoices,
    sqliteSchema.interaction_items,
    sqliteSchema.interaction_logs,
    sqliteSchema.contacts,
    sqliteSchema.items,
    sqliteSchema.shops,
    sqliteSchema.wards,
    sqliteSchema.townships,
    sqliteSchema.regions,
    sqliteSchema.daily_quotas,
    sqliteSchema.item_stocks,
    sqliteSchema.planned_routes,
    sqliteSchema.check_in_logs,
    sqliteSchema.prediction_logs,
    sqliteSchema.recommended_orders,
    sqliteSchema.price_books,
    sqliteSchema.price_book_items,
    sqliteSchema.exchange_rates,
    sqliteSchema.rep_scores,
    sqliteSchema.points_logs,
    sqliteSchema.brands,
    sqliteSchema.stock_locations,
    sqliteSchema.stock_balances,
    sqliteSchema.projects,
    sqliteSchema.rep_kpis,
    sqliteSchema.currency_exchange_rates,
    sqliteSchema.competitor_insights,
    sqliteSchema.pending_inventory_updates,
    sqliteSchema.audit_events,
    sqliteSchema.expected_inbounds,
  ];

  for (const table of tables) {
    try {
      await db.delete(table);
    } catch (err) {
      console.warn(`Could not clear table:`, err);
    }
  }

  const now = Date.now();

  // 1. Seed Brands
  await db.insert(sqliteSchema.brands).values([
    { id: 'brand-shera', name: 'Shera', created_at: now, updated_at: now },
    {
      id: 'brand-crocodile',
      name: 'Crocodile',
      created_at: now,
      updated_at: now,
    },
    { id: 'brand-karat', name: 'Karat', created_at: now, updated_at: now },
  ]);

  // Seed Stock Locations
  await db.insert(sqliteSchema.stock_locations).values([
    {
      id: 'loc-yangon-wh',
      name: 'Yangon Main Warehouse',
      created_at: now,
      updated_at: now,
    },
  ]);

  // 2. Seed Regions
  await db.insert(sqliteSchema.regions).values([
    {
      id: 'region-yangon',
      name: 'Yangon Region',
      division: 'Yangon Division',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'region-mandalay',
      name: 'Mandalay Region',
      division: 'Mandalay Division',
      created_at: now,
      updated_at: now,
    },
  ]);

  // 2b. Seed Townships & Wards
  await db.insert(sqliteSchema.townships).values([
    {
      id: 'township-lanmadaw',
      name: 'Lanmadaw Township',
      region_id: 'region-yangon',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'township-northokkalar',
      name: 'North Okkalar Township',
      region_id: 'region-yangon',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'township-chanayethazan',
      name: 'Chanayethazan Township',
      region_id: 'region-mandalay',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'township-maharaundmyay',
      name: 'Mahar Aung Myay Township',
      region_id: 'region-mandalay',
      created_at: now,
      updated_at: now,
    },
  ]);

  await db.insert(sqliteSchema.wards).values([
    {
      id: 'ward-ward1',
      name: 'Ward 1',
      township_id: 'township-lanmadaw',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'ward-northokkalar-ward',
      name: 'North Okkalar Ward',
      township_id: 'township-northokkalar',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'ward-pyigyimyatshin',
      name: 'Pyi Gyi Myat Shin Ward',
      township_id: 'township-chanayethazan',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'ward-haymamarlar',
      name: 'Hayma Marlar Ward',
      township_id: 'township-maharaundmyay',
      created_at: now,
      updated_at: now,
    },
  ]);

  // 3. Seed Price Books
  await db.insert(sqliteSchema.price_books).values([
    {
      id: 'pb-yangon',
      name: 'Yangon Retail Book',
      region_id: 'region-yangon',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'pb-mandalay',
      name: 'Mandalay Retail Book',
      region_id: 'region-mandalay',
      created_at: now,
      updated_at: now,
    },
  ]);

  // 4. Seed Building Material Items
  await db.insert(sqliteSchema.items).values([
    {
      id: 'item-7',
      sku: 'SKU-CR-GP-GROUT-20KG',
      name: 'Crocodile GP Grout (Grey), 20Kg',
      unit_price: 18000,
      category: 'Grout',
      brand_id: 'brand-crocodile',
      weight: '20kg',
      unit_type: 'BAGS',
      conversion_factor: 1,
      color: 'Grey',
      is_in_deficit: true,
      created_at: now,
      updated_at: now,
      inventory_status: 'AVAILABLE',
    },
    {
      id: 'item-1',
      sku: 'SKU-SH-CEILING-2X2',
      name: 'Shera Ceiling Board 2x2 (0.35x61x61)',
      unit_price: 47000,
      category: 'Fiber Cement',
      brand_id: 'brand-shera',
      unit_type: 'PAL',
      conversion_factor: 100,
      dimensions: '2x2 (0.35x61x61)',
      // Sprint 38: explicit wholesale floor so margin-override detection has a
      // baseline to compare against (PendingSalesApproval flags sales below this).
      base_wholesale_price: 40000,
      base_currency: 'MMK',
      is_in_deficit: false,
      created_at: now,
      updated_at: now,
      inventory_status: 'AVAILABLE',
    },
    {
      id: 'item-3',
      sku: 'SKU-K-15814X-8-CP',
      name: 'K-15814X-8-CP CAPRI Kitchen Faucet',
      unit_price: 35000,
      category: 'Fittings',
      brand_id: 'brand-karat',
      unit_type: 'PCS',
      conversion_factor: 1,
      finish_code: 'CP',
      is_in_deficit: false,
      created_at: now,
      updated_at: now,
      inventory_status: 'AVAILABLE',
    },
  ]);

  // 5. Seed Item Stocks
  await db.insert(sqliteSchema.item_stocks).values([
    {
      id: 'stock-item-7',
      item_id: 'item-7',
      good_stock_count: -1756,
      wet_stock_count: 0,
      bad_stock_count: 498,
      pending_allocation_count: 1756,
      created_at: now,
      updated_at: now,
      inventory_status: 'AVAILABLE',
    },
    {
      id: 'stock-item-1',
      item_id: 'item-1',
      good_stock_count: 94765,
      wet_stock_count: 16137,
      bad_stock_count: 7060,
      pending_allocation_count: 0,
      created_at: now,
      updated_at: now,
      inventory_status: 'AVAILABLE',
    },
    {
      id: 'stock-item-3',
      item_id: 'item-3',
      good_stock_count: 100,
      wet_stock_count: 0,
      bad_stock_count: 0,
      pending_allocation_count: 0,
      created_at: now,
      updated_at: now,
      inventory_status: 'AVAILABLE',
    },
  ]);

  // 6. Seed Price Book Items
  await db.insert(sqliteSchema.price_book_items).values([
    {
      id: 'pbi-y-item-7',
      price_book_id: 'pb-yangon',
      item_id: 'item-7',
      price: 18000,
      currency: 'MMK',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'pbi-y-item-1',
      price_book_id: 'pb-yangon',
      item_id: 'item-1',
      price: 47000,
      currency: 'MMK',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'pbi-y-item-3',
      price_book_id: 'pb-yangon',
      item_id: 'item-3',
      price: 35000,
      currency: 'MMK',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'pbi-m-item-7',
      price_book_id: 'pb-mandalay',
      item_id: 'item-7',
      price: 18500,
      currency: 'MMK',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'pbi-m-item-1',
      price_book_id: 'pb-mandalay',
      item_id: 'item-1',
      price: 48000,
      currency: 'MMK',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'pbi-m-item-3',
      price_book_id: 'pb-mandalay',
      item_id: 'item-3',
      price: 36000,
      currency: 'MMK',
      created_at: now,
      updated_at: now,
    },
  ]);

  // 7. Seed Exchange Rates
  await db.insert(sqliteSchema.exchange_rates).values([
    {
      id: 'er-usd-mmk',
      from_currency: 'USD',
      to_currency: 'MMK',
      rate: 2100.0,
      updated_at: now,
    },
    {
      id: 'er-thb-mmk',
      from_currency: 'THB',
      to_currency: 'MMK',
      rate: 58.5,
      updated_at: now,
    },
  ]);

  await db.insert(sqliteSchema.currency_exchange_rates).values([
    { id: 'rate-usd', currency: 'USD', rate_to_kyat: 4200.0, pushed_at: now },
    { id: 'rate-thb', currency: 'THB', rate_to_kyat: 115.0, pushed_at: now },
  ]);

  // 8. Seed Shops
  await db.insert(sqliteSchema.shops).values([
    {
      id: 'shop-1',
      name: 'Soe Moe Khaing (North Okkalar)',
      address: 'North Okkalar, Yangon',
      latitude: 16.9123,
      longitude: 96.1645,
      region_id: 'region-yangon',
      township_id: 'township-northokkalar',
      ward_id: 'ward-northokkalar-ward',
      price_book_id: 'pb-yangon',
      credit_limit_mmk: 5000000.0,
      lifetime_value: 0,
      sentiment_trend: 'STABLE',
      assigned_rep_id: 'rep-3',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'shop-2',
      name: 'Taw Win (South Dagon)',
      address: 'South Dagon, Yangon',
      latitude: 16.8543,
      longitude: 96.2134,
      region_id: 'region-yangon',
      township_id: 'township-lanmadaw',
      ward_id: 'ward-ward1',
      price_book_id: 'pb-yangon',
      credit_limit_mmk: 2500000.0,
      lifetime_value: 0,
      sentiment_trend: 'STABLE',
      assigned_rep_id: 'rep-1',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'shop-3',
      name: 'Thingaha (North Okkalar)',
      address: 'North Okkalar, Yangon',
      latitude: 16.9234,
      longitude: 96.1756,
      region_id: 'region-yangon',
      township_id: 'township-northokkalar',
      ward_id: 'ward-northokkalar-ward',
      price_book_id: 'pb-yangon',
      credit_limit_mmk: 10000000.0,
      lifetime_value: 0,
      sentiment_trend: 'STABLE',
      assigned_rep_id: 'rep-3',
      created_at: now,
      updated_at: now,
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
      credit_limit_mmk: 3000000.0,
      lifetime_value: 0,
      sentiment_trend: 'IMPROVING',
      assigned_rep_id: 'rep-2',
      created_at: now,
      updated_at: now,
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
      credit_limit_mmk: 4500000.0,
      lifetime_value: 0,
      sentiment_trend: 'STABLE',
      assigned_rep_id: 'rep-2',
      created_at: now,
      updated_at: now,
    },
  ]);

  // 8b. Seed Contacts
  await db.insert(sqliteSchema.contacts).values([
    {
      id: 'contact-1',
      shop_id: 'shop-1',
      name: 'U Kyaw',
      phone_number: '+95912345678',
      is_primary: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'contact-2',
      shop_id: 'shop-2',
      name: 'Daw Mya',
      phone_number: '+95998765432',
      is_primary: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'contact-3',
      shop_id: 'shop-3',
      name: 'U Ba',
      phone_number: '+95944445555',
      is_primary: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'contact-4',
      shop_id: 'shop-4',
      name: 'Ko Kyaw Thu',
      phone_number: '+95977889900',
      is_primary: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'contact-5',
      shop_id: 'shop-5',
      name: 'Daw Hlaing Hlaing',
      phone_number: '+95977112233',
      is_primary: true,
      created_at: now,
      updated_at: now,
    },
  ]);

  // 9. Seed Predictions
  await db.insert(sqliteSchema.prediction_logs).values([
    {
      id: 'pred-shop-1',
      shop_id: 'shop-1',
      predicted_ltv: 1250000,
      churn_risk: 0.1,
      stockout_risk: 0.1,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'pred-shop-2',
      shop_id: 'shop-2',
      predicted_ltv: 980000,
      churn_risk: 0.2,
      stockout_risk: 0.2,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'pred-shop-3',
      shop_id: 'shop-3',
      predicted_ltv: 450000,
      churn_risk: 0.15,
      stockout_risk: 0.3,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'pred-shop-4',
      shop_id: 'shop-4',
      predicted_ltv: 720000,
      churn_risk: 0.08,
      stockout_risk: 0.12,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'pred-shop-5',
      shop_id: 'shop-5',
      predicted_ltv: 650000,
      churn_risk: 0.05,
      stockout_risk: 0.1,
      created_at: now,
      updated_at: now,
    },
  ]);

  // 10. Seed Reorders
  await db.insert(sqliteSchema.recommended_orders).values([
    {
      id: 'rec-shop-3-item-1',
      shop_id: 'shop-3',
      item_id: 'item-1',
      quantity: 24,
      confidence: 0.89,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'rec-shop-4-item-7',
      shop_id: 'shop-4',
      item_id: 'item-7',
      quantity: 40,
      confidence: 0.76,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'rec-shop-5-item-1',
      shop_id: 'shop-5',
      item_id: 'item-1',
      quantity: 20,
      confidence: 0.85,
      created_at: now,
      updated_at: now,
    },
  ]);

  // 11. Seed Logs (programmatically aligned with current week to test Compliance Grid scorecard)
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const monMs = monday.getTime();

  const logsToSeed = [
    // rep-1 (Ko Min) logs
    // Mon: 3 logs (Yellow status; target is 8)
    {
      id: 'log-r1-d0-1',
      shop_id: 'shop-1',
      rep_id: 'rep-1',
      type: 'SHOP_VISIT',
      notes: 'Kyaw ordered Shera boards.',
      d: 0,
      h: 9,
    },
    {
      id: 'log-r1-d0-2',
      shop_id: 'shop-3',
      rep_id: 'rep-1',
      type: 'PHONE_CALL',
      notes: 'Followed up on board orders.',
      d: 0,
      h: 11,
    },
    {
      id: 'log-r1-d0-3',
      shop_id: 'shop-1',
      rep_id: 'rep-1',
      type: 'VIBER',
      notes: 'Shared price list.',
      d: 0,
      h: 14,
    },
    // Tue: 8 logs (Green status; target is 8)
    {
      id: 'log-r1-d1-1',
      shop_id: 'shop-1',
      rep_id: 'rep-1',
      type: 'SHOP_VISIT',
      d: 1,
      h: 9,
    },
    {
      id: 'log-r1-d1-2',
      shop_id: 'shop-3',
      rep_id: 'rep-1',
      type: 'SHOP_VISIT',
      d: 1,
      h: 10,
    },
    {
      id: 'log-r1-d1-3',
      shop_id: 'shop-1',
      rep_id: 'rep-1',
      type: 'PHONE_CALL',
      d: 1,
      h: 11,
    },
    {
      id: 'log-r1-d1-4',
      shop_id: 'shop-3',
      rep_id: 'rep-1',
      type: 'PHONE_CALL',
      d: 1,
      h: 12,
    },
    {
      id: 'log-r1-d1-5',
      shop_id: 'shop-1',
      rep_id: 'rep-1',
      type: 'VIBER',
      d: 1,
      h: 13,
    },
    {
      id: 'log-r1-d1-6',
      shop_id: 'shop-3',
      rep_id: 'rep-1',
      type: 'VIBER',
      d: 1,
      h: 14,
    },
    {
      id: 'log-r1-d1-7',
      shop_id: 'shop-1',
      rep_id: 'rep-1',
      type: 'SHOP_VISIT',
      d: 1,
      h: 15,
    },
    {
      id: 'log-r1-d1-8',
      shop_id: 'shop-3',
      rep_id: 'rep-1',
      type: 'SHOP_VISIT',
      d: 1,
      h: 16,
    },
    // Thu: 5 logs (Yellow status; target is 8)
    {
      id: 'log-r1-d3-1',
      shop_id: 'shop-1',
      rep_id: 'rep-1',
      type: 'SHOP_VISIT',
      d: 3,
      h: 9,
    },
    {
      id: 'log-r1-d3-2',
      shop_id: 'shop-3',
      rep_id: 'rep-1',
      type: 'SHOP_VISIT',
      d: 3,
      h: 10,
    },
    {
      id: 'log-r1-d3-3',
      shop_id: 'shop-1',
      rep_id: 'rep-1',
      type: 'PHONE_CALL',
      d: 3,
      h: 11,
    },
    {
      id: 'log-r1-d3-4',
      shop_id: 'shop-3',
      rep_id: 'rep-1',
      type: 'PHONE_CALL',
      d: 3,
      h: 12,
    },
    {
      id: 'log-r1-d3-5',
      shop_id: 'shop-1',
      rep_id: 'rep-1',
      type: 'VIBER',
      d: 3,
      h: 13,
    },
    // Fri: 9 logs (Green status; target is 8)
    {
      id: 'log-r1-d4-1',
      shop_id: 'shop-1',
      rep_id: 'rep-1',
      type: 'SHOP_VISIT',
      d: 4,
      h: 9,
    },
    {
      id: 'log-r1-d4-2',
      shop_id: 'shop-3',
      rep_id: 'rep-1',
      type: 'SHOP_VISIT',
      d: 4,
      h: 10,
    },
    {
      id: 'log-r1-d4-3',
      shop_id: 'shop-1',
      rep_id: 'rep-1',
      type: 'PHONE_CALL',
      d: 4,
      h: 11,
    },
    {
      id: 'log-r1-d4-4',
      shop_id: 'shop-3',
      rep_id: 'rep-1',
      type: 'PHONE_CALL',
      d: 4,
      h: 12,
    },
    {
      id: 'log-r1-d4-5',
      shop_id: 'shop-1',
      rep_id: 'rep-1',
      type: 'VIBER',
      d: 4,
      h: 13,
    },
    {
      id: 'log-r1-d4-6',
      shop_id: 'shop-3',
      rep_id: 'rep-1',
      type: 'VIBER',
      d: 4,
      h: 14,
    },
    {
      id: 'log-r1-d4-7',
      shop_id: 'shop-1',
      rep_id: 'rep-1',
      type: 'SHOP_VISIT',
      d: 4,
      h: 15,
    },
    {
      id: 'log-r1-d4-8',
      shop_id: 'shop-3',
      rep_id: 'rep-1',
      type: 'SHOP_VISIT',
      d: 4,
      h: 16,
    },
    {
      id: 'log-r1-d4-9',
      shop_id: 'shop-1',
      rep_id: 'rep-1',
      type: 'PHONE_CALL',
      d: 4,
      h: 17,
    },

    // rep-2 (Ko Hla) logs
    // Tue: 4 logs (Yellow status; target is 8)
    {
      id: 'log-r2-d1-1',
      shop_id: 'shop-2',
      rep_id: 'rep-2',
      type: 'SHOP_VISIT',
      notes: 'Daw Mya ordered Gator PVC pipes.',
      d: 1,
      h: 9,
    },
    {
      id: 'log-r2-d1-2',
      shop_id: 'shop-2',
      rep_id: 'rep-2',
      type: 'PHONE_CALL',
      notes: 'Followed up.',
      d: 1,
      h: 11,
    },
    {
      id: 'log-r2-d1-3',
      shop_id: 'shop-2',
      rep_id: 'rep-2',
      type: 'VIBER',
      notes: 'Shared info.',
      d: 1,
      h: 14,
    },
    {
      id: 'log-r2-d1-4',
      shop_id: 'shop-2',
      rep_id: 'rep-2',
      type: 'SHOP_VISIT',
      notes: 'Visit.',
      d: 1,
      h: 16,
    },
    // Wed: 8 logs (Green status; target is 8)
    {
      id: 'log-r2-d2-1',
      shop_id: 'shop-2',
      rep_id: 'rep-2',
      type: 'SHOP_VISIT',
      d: 2,
      h: 9,
    },
    {
      id: 'log-r2-d2-2',
      shop_id: 'shop-2',
      rep_id: 'rep-2',
      type: 'SHOP_VISIT',
      d: 2,
      h: 10,
    },
    {
      id: 'log-r2-d2-3',
      shop_id: 'shop-2',
      rep_id: 'rep-2',
      type: 'PHONE_CALL',
      d: 2,
      h: 11,
    },
    {
      id: 'log-r2-d2-4',
      shop_id: 'shop-2',
      rep_id: 'rep-2',
      type: 'PHONE_CALL',
      d: 2,
      h: 12,
    },
    {
      id: 'log-r2-d2-5',
      shop_id: 'shop-2',
      rep_id: 'rep-2',
      type: 'VIBER',
      d: 2,
      h: 13,
    },
    {
      id: 'log-r2-d2-6',
      shop_id: 'shop-2',
      rep_id: 'rep-2',
      type: 'VIBER',
      d: 2,
      h: 14,
    },
    {
      id: 'log-r2-d2-7',
      shop_id: 'shop-2',
      rep_id: 'rep-2',
      type: 'SHOP_VISIT',
      d: 2,
      h: 15,
    },
    {
      id: 'log-r2-d2-8',
      shop_id: 'shop-2',
      rep_id: 'rep-2',
      type: 'SHOP_VISIT',
      d: 2,
      h: 16,
    },
    // Thu: 5 logs that occur within a 10-minute window (Yellow status & Flagged for batch dumping!)
    {
      id: 'log-r2-d3-1',
      shop_id: 'shop-2',
      rep_id: 'rep-2',
      type: 'SHOP_VISIT',
      notes: 'Fast entry 1',
      d: 3,
      h: 17,
      m: 1,
    },
    {
      id: 'log-r2-d3-2',
      shop_id: 'shop-2',
      rep_id: 'rep-2',
      type: 'SHOP_VISIT',
      notes: 'Fast entry 2',
      d: 3,
      h: 17,
      m: 3,
    },
    {
      id: 'log-r2-d3-3',
      shop_id: 'shop-2',
      rep_id: 'rep-2',
      type: 'PHONE_CALL',
      notes: 'Fast entry 3',
      d: 3,
      h: 17,
      m: 5,
    },
    {
      id: 'log-r2-d3-4',
      shop_id: 'shop-2',
      rep_id: 'rep-2',
      type: 'PHONE_CALL',
      notes: 'Fast entry 4',
      d: 3,
      h: 17,
      m: 7,
    },
    {
      id: 'log-r2-d3-5',
      shop_id: 'shop-2',
      rep_id: 'rep-2',
      type: 'VIBER',
      notes: 'Fast entry 5',
      d: 3,
      h: 17,
      m: 9,
    },
    // Ko Hla visiting shop-4 (his assigned shop in Insein)
    {
      id: 'log-r2-d0-s4-1',
      shop_id: 'shop-4',
      rep_id: 'rep-2',
      type: 'SHOP_VISIT',
      notes: 'Ko Kyaw Thu ordered Crocodile Grout bags for site.',
      d: 0,
      h: 10,
    },
    {
      id: 'log-r2-d0-s4-2',
      shop_id: 'shop-4',
      rep_id: 'rep-2',
      type: 'PHONE_CALL',
      notes: 'Confirmed delivery schedule.',
      d: 0,
      h: 14,
    },
    {
      id: 'log-r2-d1-s4-1',
      shop_id: 'shop-4',
      rep_id: 'rep-2',
      type: 'SHOP_VISIT',
      notes: 'New order for Shera boards.',
      d: 1,
      h: 9,
    },
    {
      id: 'log-r2-d2-s4-1',
      shop_id: 'shop-4',
      rep_id: 'rep-2',
      type: 'VIBER',
      notes: 'Sent price list update.',
      d: 2,
      h: 11,
    },
    {
      id: 'log-r2-d0-s5-1',
      shop_id: 'shop-5',
      rep_id: 'rep-2',
      type: 'SHOP_VISIT',
      notes:
        'Visited Mandalay Palace shop. Owner interested in ceiling boards.',
      d: 0,
      h: 11,
    },
    {
      id: 'log-r2-d1-s5-1',
      shop_id: 'shop-5',
      rep_id: 'rep-2',
      type: 'VIBER',
      notes: 'Sent catalog & quote for Shera boards.',
      d: 1,
      h: 10,
    },
  ];

  await db.insert(sqliteSchema.interaction_logs).values(
    logsToSeed.map((log) => {
      const timestamp =
        monMs +
        log.d * 24 * 3600 * 1000 +
        log.h * 3600 * 1000 +
        (log.m ?? 0) * 60 * 1000;
      return {
        id: log.id,
        shop_id: log.shop_id,
        rep_id: log.rep_id,
        type: log.type,
        commercial_status: 'ORDER_PLACED',
        notes: log.notes || 'Routine update.',
        created_at_local: timestamp,
        is_offline_entry: false,
        device_id: 'dev-1',
        created_at: timestamp,
        updated_at: timestamp,
      };
    }),
  );

  // 12. Seed Interaction Items
  await db.insert(sqliteSchema.interaction_items).values([
    {
      id: 'log-item-1',
      interaction_log_id: 'log-r1-d0-1',
      item_id: 'item-1',
      quantity: 5,
      unit_price_at_sale: 15000,
      interest_level: 'HIGH',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'log-item-2',
      interaction_log_id: 'log-r2-d1-1',
      item_id: 'item-3',
      quantity: 3,
      unit_price_at_sale: 35000,
      interest_level: 'MEDIUM',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'log-item-3',
      interaction_log_id: 'log-r2-d0-s4-1',
      item_id: 'item-7',
      quantity: 40,
      unit_price_at_sale: 18000,
      interest_level: 'HIGH',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'log-item-4',
      interaction_log_id: 'log-r2-d1-s4-1',
      item_id: 'item-1',
      quantity: 10,
      unit_price_at_sale: 47000,
      interest_level: 'HIGH',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'log-item-5',
      interaction_log_id: 'log-r2-d0-s5-1',
      item_id: 'item-1',
      quantity: 20,
      unit_price_at_sale: 48000,
      interest_level: 'HIGH',
      created_at: now,
      updated_at: now,
    },
  ]);

  // 13. Seed Daily Quotas
  await db.insert(sqliteSchema.daily_quotas).values([
    {
      id: 'quota-rep-1',
      user_id: 'rep-1',
      target_visits: 4,
      target_phone: 2,
      target_viber: 2,
      effective_from: now - 30 * 24 * 3600 * 1000,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'quota-rep-2',
      user_id: 'rep-2',
      target_visits: 5,
      target_phone: 1,
      target_viber: 2,
      effective_from: now - 30 * 24 * 3600 * 1000,
      created_at: now,
      updated_at: now,
    },
  ]);

  // 14. Seed Planned Routes
  await db.insert(sqliteSchema.planned_routes).values([
    {
      id: 'route-ko-min',
      rep_id: 'rep-1',
      date: new Date().toISOString().split('T')[0],
      shop_ids: JSON.stringify(['shop-1', 'shop-3']),
      created_at: now,
      updated_at: now,
    },
    {
      id: 'route-ko-hla',
      rep_id: 'rep-2',
      date: new Date().toISOString().split('T')[0],
      shop_ids: JSON.stringify(['shop-4', 'shop-5']),
      created_at: now,
      updated_at: now,
    },
  ]);

  // 15. Seed Rep Scores
  await db.insert(sqliteSchema.rep_scores).values([
    {
      id: 'score-rep-1',
      rep_id: 'rep-1',
      points: 450,
      streak_days: 5,
      badges: JSON.stringify(['Top Seller', 'Early Bird']),
      created_at: now,
      updated_at: now,
    },
    {
      id: 'score-rep-2',
      rep_id: 'rep-2',
      points: 380,
      streak_days: 3,
      badges: JSON.stringify(['Road Warrior']),
      created_at: now,
      updated_at: now,
    },
    {
      id: 'score-rep-3',
      rep_id: 'rep-3',
      points: 0,
      streak_days: 0,
      badges: JSON.stringify([]),
      created_at: now,
      updated_at: now,
    },
    {
      id: 'score-rep-4',
      rep_id: 'rep-4',
      points: 1500,
      streak_days: 12,
      badges: JSON.stringify(['Admin Champion']),
      created_at: now,
      updated_at: now,
    },
    {
      id: 'score-rep-5',
      rep_id: 'rep-5',
      points: 250,
      streak_days: 2,
      badges: JSON.stringify(['Intake Hero']),
      created_at: now,
      updated_at: now,
    },
  ]);

  // 16. Seed Projects
  await db.insert(sqliteSchema.projects).values([
    {
      id: 'project-1',
      name: 'Galaxy Tower-3',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'project-2',
      name: 'Zaw Residence',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'project-3',
      name: 'Grand Plaza Project',
      created_at: now,
      updated_at: now,
    },
  ]);

  // 17. Seed Rep KPIs
  await db.insert(sqliteSchema.rep_kpis).values([
    {
      id: 'kpi-rep-1-today',
      rep_id: 'rep-1',
      date: new Date().toISOString().split('T')[0],
      sales_volume: 750000,
      sales_target: 1000000,
      visits_count: 3,
      visits_target: 5,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'kpi-rep-2-today',
      rep_id: 'rep-2',
      date: new Date().toISOString().split('T')[0],
      sales_volume: 450000,
      sales_target: 800000,
      visits_count: 2,
      visits_target: 4,
      created_at: now,
      updated_at: now,
    },
  ]);

  // 18. Seed Invoices & Payments (AR)
  const dueOverdue = now - 45 * 24 * 3600 * 1000;
  const duePending = now + 15 * 24 * 3600 * 1000;
  const duePartiallyPaid = now - 5 * 24 * 3600 * 1000;
  const duePaid = now - 20 * 24 * 3600 * 1000;

  await db.insert(sqliteSchema.invoices).values([
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
  ]);

  await db.insert(sqliteSchema.payments).values([
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
  ]);

  // 19. Seed Expected Inbounds (Transit forecast)
  await db.insert(sqliteSchema.expected_inbounds).values([
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
  ]);

  // 20. Seed Pending Inventory Updates (Intake Screen approvals queue)
  await db.insert(sqliteSchema.pending_inventory_updates).values([
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
  ]);

  // 21. Seed Audit Events (Security/Compliance)
  await db.insert(sqliteSchema.audit_events).values([
    {
      event_id: 'evt-1',
      trace_id: 'tr-001',
      actor_id: 'rep-1',
      device_id: 'dev-1',
      entity_type: 'ORDER',
      action: 'OVERRIDE',
      previous_state: JSON.stringify({ unit_price_at_sale: 47000 }),
      new_state: JSON.stringify({ unit_price_at_sale: 40000 }),
      gps_coordinates: '16.9123, 96.1645',
      hash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
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
      previous_state: JSON.stringify({ credit_limit_mmk: 10000000 }),
      new_state: JSON.stringify({ credit_limit_mmk: 12000000 }),
      gps_coordinates: '16.9234, 96.1756',
      hash: 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
      status: 'VALID',
      created_at: now - 1 * 3600 * 1000,
      shop_id: 'shop-3',
      executed_by_id: 'rep-3',
      salesperson_id: 'rep-3',
      approved_by_id: 'rep-4',
    },
  ]);

  // 22. Seed Items and Item Stocks with PENDING_APPROVAL status (for PendingIntakeApproval tab)
  await db.insert(sqliteSchema.items).values([
    {
      id: 'item-pending-1',
      sku: 'SKU-SCG-FITTING-90',
      name: 'SCG Connector Fitting 90',
      unit_price: 3200,
      category: 'Plumbing',
      brand_id: 'brand-crocodile',
      unit_type: 'PCS',
      conversion_factor: 1,
      is_in_deficit: false,
      inventory_status: 'PENDING_APPROVAL',
      created_at: now - 1 * 24 * 3600 * 1000,
      updated_at: now,
    },
  ]);

  await db.insert(sqliteSchema.item_stocks).values([
    {
      id: 'stock-item-pending-1',
      item_id: 'item-pending-1',
      good_stock_count: 120,
      wet_stock_count: 0,
      bad_stock_count: 0,
      pending_allocation_count: 0,
      inventory_status: 'PENDING_APPROVAL',
      created_at: now - 1 * 24 * 3600 * 1000,
      updated_at: now,
    },
  ]);

  // ───────────────────────────────────────────────────────────────────────────
  // Sprint 38 — E2E Transactional State
  //
  // Deterministic, idempotent fixtures that drive the end-to-end transactional
  // flows (credit lock, intake quarantine, margin override, dispatch manifest,
  // KPay reconciliation). All ids are prefixed (`inv-e2e-`, `log-e2e-`, etc.) so
  // re-seeding is predictable and does not collide with the ids above.
  //
  // Task spec term → reality (this codebase) mapping:
  //   • "UNPAID" invoice status          → invoices.state ('OVERDUE' / 'PENDING')
  //   • "landed_cost_mmk"                → items.base_wholesale_price (margin floor)
  //   • "orders"                         → interaction_logs (+ interaction_items)
  //   • "inbound lot quarantine"         → items/item_stocks.inventory_status
  //                                        = 'PENDING_APPROVAL'
  //
  // Task entity → seeded entity mapping (names kept as-is in the DB; the spec's
  // names are only documented here, no shops/reps are renamed or invented):
  //   • SHOP_001 "Soe Moe Khaing"  → shop-1 ("Soe Moe Khaing (North Okkalar)")
  //   • SHOP_003 "Thingaha"        → shop-3 ("Thingaha (North Okkalar)")
  //   • SHOP_004 "Doh Loke Thar"   → shop-4 ("Mandalay Station Store")
  //   • REP_001  "Wint Thandar"    → rep-1  ("Ko Min", sales role)
  //   • SKU_SHERA_001              → item-1 ("Shera Ceiling Board", SKU-SH-CEILING-2X2)
  // ───────────────────────────────────────────────────────────────────────────

  const fortyFiveDaysAgo = now - 45 * 24 * 3600 * 1000;

  // Scenario 1 — AR credit-lock (shop-4 / "Doh Loke Thar").
  // computeBlockedStatus (creditStatus.ts, consumed by useInteractionLogging.ts)
  // pulls invoices for the shop in state PENDING | PARTIALLY_PAID | OVERDUE and
  // blocks checkout when ANY invoice's aging (now − (due_date + grace_period_days))
  // is ≥ 30 days. due_date 45 days ago + 7 grace ⇒ ~38 overdue days ⇒ blocked.
  await db.insert(sqliteSchema.invoices).values([
    {
      id: 'inv-e2e-overdue-shop-4',
      shop_id: 'shop-4',
      interaction_log_id: null,
      amount: 2500000,
      due_date: fortyFiveDaysAgo,
      grace_period_days: 7,
      state: 'OVERDUE',
      created_at: fortyFiveDaysAgo,
      updated_at: now,
    },
    // Scenario 5 — KPay reconciliation target. Open invoice on shop-2 (NOT the
    // AR-blocked shop-4) so PendingReconciliationPanel.loadInvoices (filters
    // state IN ('PENDING','PARTIALLY_PAID')) surfaces it and the FIFO reconcile
    // can pay it down using MOCK_KPAY_TRANSFER (1,500,000 MMK).
    {
      id: 'inv-e2e-kpay-shop-2',
      shop_id: 'shop-2',
      interaction_log_id: null,
      amount: 1500000,
      due_date: now + 15 * 24 * 3600 * 1000,
      grace_period_days: 7,
      state: 'PENDING',
      created_at: now,
      updated_at: now,
    },
  ]);

  // Scenario 2 — Intake quarantine (Shera inbound lot).
  // PendingIntakeApproval queries items AND item_stocks where
  // inventory_status='PENDING_APPROVAL', then maps from the stock rows and joins
  // the item by item_id. A NEW item id is used (reusing the Shera SKU/name with a
  // " (Inbound Lot E2E)" suffix) so the existing AVAILABLE item-1 stays sellable.
  await db.insert(sqliteSchema.items).values([
    {
      id: 'item-shera-inbound-e2e',
      sku: 'SKU-SH-CEILING-2X2',
      name: 'Shera Ceiling Board 2x2 (0.35x61x61) (Inbound Lot E2E)',
      unit_price: 47000,
      category: 'Fiber Cement',
      brand_id: 'brand-shera',
      unit_type: 'PAL',
      conversion_factor: 100,
      dimensions: '2x2 (0.35x61x61)',
      is_in_deficit: false,
      inventory_status: 'PENDING_APPROVAL',
      created_at: now,
      updated_at: now,
    },
  ]);

  await db.insert(sqliteSchema.item_stocks).values([
    {
      id: 'stock-shera-inbound-e2e',
      item_id: 'item-shera-inbound-e2e',
      good_stock_count: 5000,
      wet_stock_count: 0,
      bad_stock_count: 0,
      pending_allocation_count: 0,
      inventory_status: 'PENDING_APPROVAL',
      created_at: now,
      updated_at: now,
    },
  ]);

  // Scenario 3 — Margin override (shop-3 / "Thingaha", rep-1 / "Ko Min").
  // PendingSalesApproval queries interaction_logs WHERE approved_by_id IS NULL,
  // keeps logs that have interaction_items, and flags an override when
  // unit_price_at_sale < items.base_wholesale_price. item-1's base_wholesale_price
  // is 40,000 MMK; selling 20% below ⇒ 32,000 MMK trips the margin warning.
  await db.insert(sqliteSchema.interaction_logs).values([
    {
      id: 'log-e2e-margin-shop-3',
      shop_id: 'shop-3',
      rep_id: 'rep-1',
      type: 'SHOP_VISIT',
      commercial_status: 'ORDER_PLACED',
      notes: 'E2E: order placed 20% below wholesale floor (awaiting approval).',
      created_at_local: now,
      is_offline_entry: false,
      device_id: 'dev-1',
      created_at: now,
      updated_at: now,
      salesperson_id: 'rep-1',
      executed_by_id: 'rep-1',
      approved_by_id: null,
    },
  ]);

  await db.insert(sqliteSchema.interaction_items).values([
    {
      id: 'log-item-e2e-margin-1',
      interaction_log_id: 'log-e2e-margin-shop-3',
      item_id: 'item-1',
      quantity: 10,
      unit_price_at_sale: 32000,
      interest_level: 'HIGH',
      fulfillment_status: 'PENDING_FULFILLMENT',
      created_at: now,
      updated_at: now,
    },
  ]);

  // Scenario 4 — Dispatch manifest (shop-1 / "Soe Moe Khaing").
  // DriverManifestScreen queries interaction_logs WHERE assigned_driver_id =
  // activeRep.id AND commercial_status != 'DELIVERED'. The driver-manifest screen
  // is gated to the `sales` role, so a tester logs in as rep-1 ("Ko Min", sales);
  // assigned_driver_id is therefore set to 'rep-1' for all three dispatched orders.
  const dispatchedAt = now - 2 * 3600 * 1000;
  await db.insert(sqliteSchema.interaction_logs).values([
    {
      id: 'log-e2e-dispatch-1',
      shop_id: 'shop-1',
      rep_id: 'rep-1',
      type: 'SHOP_VISIT',
      commercial_status: 'DISPATCHED',
      notes: 'E2E dispatch order 1 of 3 (awaiting proof-of-delivery).',
      created_at_local: dispatchedAt,
      is_offline_entry: false,
      device_id: 'dev-1',
      created_at: dispatchedAt,
      updated_at: now,
      assigned_driver_id: 'rep-1',
      dispatched_at: dispatchedAt,
      pod_image_url: null,
    },
    {
      id: 'log-e2e-dispatch-2',
      shop_id: 'shop-1',
      rep_id: 'rep-1',
      type: 'SHOP_VISIT',
      commercial_status: 'DISPATCHED',
      notes: 'E2E dispatch order 2 of 3 (awaiting proof-of-delivery).',
      created_at_local: dispatchedAt,
      is_offline_entry: false,
      device_id: 'dev-1',
      created_at: dispatchedAt,
      updated_at: now,
      assigned_driver_id: 'rep-1',
      dispatched_at: dispatchedAt,
      pod_image_url: null,
    },
    {
      id: 'log-e2e-dispatch-3',
      shop_id: 'shop-1',
      rep_id: 'rep-1',
      type: 'SHOP_VISIT',
      commercial_status: 'DISPATCHED',
      notes: 'E2E dispatch order 3 of 3 (awaiting proof-of-delivery).',
      created_at_local: dispatchedAt,
      is_offline_entry: false,
      device_id: 'dev-1',
      created_at: dispatchedAt,
      updated_at: now,
      assigned_driver_id: 'rep-1',
      dispatched_at: dispatchedAt,
      pod_image_url: null,
    },
  ]);

  await db.insert(sqliteSchema.interaction_items).values([
    {
      id: 'log-item-e2e-dispatch-1',
      interaction_log_id: 'log-e2e-dispatch-1',
      item_id: 'item-1',
      quantity: 12,
      unit_price_at_sale: 47000,
      interest_level: 'HIGH',
      fulfillment_status: 'PENDING_FULFILLMENT',
      created_at: dispatchedAt,
      updated_at: now,
    },
    {
      id: 'log-item-e2e-dispatch-2',
      interaction_log_id: 'log-e2e-dispatch-2',
      item_id: 'item-7',
      quantity: 20,
      unit_price_at_sale: 18000,
      interest_level: 'MEDIUM',
      fulfillment_status: 'PENDING_FULFILLMENT',
      created_at: dispatchedAt,
      updated_at: now,
    },
    {
      id: 'log-item-e2e-dispatch-3',
      interaction_log_id: 'log-e2e-dispatch-3',
      item_id: 'item-3',
      quantity: 4,
      unit_price_at_sale: 35000,
      interest_level: 'MEDIUM',
      fulfillment_status: 'PENDING_FULFILLMENT',
      created_at: dispatchedAt,
      updated_at: now,
    },
  ]);
};
