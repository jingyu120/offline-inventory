import { sqliteSchema } from '@burma-inventory/shared-types';

export const seedLocalDatabase = async (db: any): Promise<void> => {
  // Clear existing records first
  const tables = [
    sqliteSchema.interaction_items,
    sqliteSchema.interaction_logs,
    sqliteSchema.contacts,
    sqliteSchema.items,
    sqliteSchema.shops,
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
  ];

  for (const table of tables) {
    try {
      await db.delete(table);
    } catch (err) {
      console.warn(`Could not clear table:`, err);
    }
  }

  const now = Date.now();

  // 1. Seed Brands (Shera, Gator, Karat, VRH, SCG Smart Board, Knauf)
  await db.insert(sqliteSchema.brands).values([
    {
      id: 'brand-shera',
      name: 'Shera',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'brand-gator',
      name: 'Gator',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'brand-karat',
      name: 'Karat',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'brand-vrh',
      name: 'VRH',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'brand-scg',
      name: 'SCG Smart Board',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'brand-knauf',
      name: 'Knauf',
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
      name: 'Mandalay Wholesale Book',
      region_id: 'region-mandalay',
      created_at: now,
      updated_at: now,
    },
  ]);

  // 4. Seed Building Material Items
  await db.insert(sqliteSchema.items).values([
    {
      id: 'item-1',
      sku: 'SKU-SH-6MM',
      name: 'Shera Fiber Cement Board 6mm',
      unit_price: 15000,
      category: 'Fiber Cement',
      brand_id: 'brand-shera',
      thickness: '6mm',
      weight: '15kg',
      unit_type: 'PAL',
      conversion_factor: 120,
      color: 'Off-White',
      material_sub_type: 'MR',
      hardware_finish: null,
      is_in_deficit: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'item-2',
      sku: 'SKU-GT-PVC-12',
      name: 'Gator PVC Pipe 1/2 inch',
      unit_price: 4500,
      category: 'Plumbing',
      brand_id: 'brand-gator',
      thickness: '2mm',
      weight: '1.5kg',
      unit_type: 'PK',
      conversion_factor: 25,
      color: 'Blue',
      material_sub_type: 'RE',
      hardware_finish: null,
      is_in_deficit: false,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'item-3',
      sku: 'SKU-KR-WC',
      name: 'Karat Ceramic Water Closet',
      unit_price: 180000,
      category: 'Sanitaryware',
      brand_id: 'brand-karat',
      thickness: null,
      weight: '28kg',
      unit_type: 'PCS',
      conversion_factor: 1,
      color: 'White',
      material_sub_type: null,
      hardware_finish: 'CP',
      is_in_deficit: false,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'item-4',
      sku: 'SKU-VR-FC',
      name: 'VRH Stainless steel Faucet',
      unit_price: 35000,
      category: 'Fittings',
      brand_id: 'brand-vrh',
      thickness: null,
      weight: '0.8kg',
      unit_type: 'PK',
      conversion_factor: 10,
      color: 'Silver',
      material_sub_type: null,
      hardware_finish: 'BL',
      is_in_deficit: false,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'item-5',
      sku: 'SKU-SCG-8MM',
      name: 'SCG Smart Board 8mm',
      unit_price: 22000,
      category: 'Fiber Cement',
      brand_id: 'brand-scg',
      thickness: '8mm',
      weight: '22kg',
      unit_type: 'PAL',
      conversion_factor: 100,
      color: 'Grey',
      material_sub_type: 'MR',
      hardware_finish: null,
      is_in_deficit: false,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'item-6',
      sku: 'SKU-KN-GP-9MM',
      name: 'Knauf Gypsum Board 9mm',
      unit_price: 12500,
      category: 'Drywall',
      brand_id: 'brand-knauf',
      thickness: '9mm',
      weight: '18kg',
      unit_type: 'PAL',
      conversion_factor: 80,
      color: 'White',
      material_sub_type: 'RE',
      hardware_finish: null,
      is_in_deficit: false,
      created_at: now,
      updated_at: now,
    },
  ]);

  // 5. Seed Item Stocks
  await db.insert(sqliteSchema.item_stocks).values([
    {
      id: 'stock-1',
      item_id: 'item-1',
      quantity: 150,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'stock-2',
      item_id: 'item-2',
      quantity: 300,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'stock-3',
      item_id: 'item-3',
      quantity: 500,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'stock-4',
      item_id: 'item-4',
      quantity: 200,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'stock-5',
      item_id: 'item-5',
      quantity: 120,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'stock-6',
      item_id: 'item-6',
      quantity: 180,
      created_at: now,
      updated_at: now,
    },
  ]);

  // 6. Seed Price Book Items
  const items = [
    { id: 'item-1', unitPrice: 15000 },
    { id: 'item-2', unitPrice: 4500 },
    { id: 'item-3', unitPrice: 180000 },
    { id: 'item-4', unitPrice: 35000 },
    { id: 'item-5', unitPrice: 22000 },
    { id: 'item-6', unitPrice: 12500 },
  ];

  for (const item of items) {
    await db.insert(sqliteSchema.price_book_items).values([
      {
        id: `pbi-y-${item.id}`,
        price_book_id: 'pb-yangon',
        item_id: item.id,
        price: item.unitPrice,
        currency: 'MMK',
        created_at: now,
        updated_at: now,
      },
      {
        id: `pbi-m-${item.id}`,
        price_book_id: 'pb-mandalay',
        item_id: item.id,
        price: Math.round(item.unitPrice * 0.9),
        currency: 'MMK',
        created_at: now,
        updated_at: now,
      },
    ]);
  }

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

  // 8. Seed Shops
  await db.insert(sqliteSchema.shops).values([
    {
      id: 'shop-1',
      name: 'City Mart Junction City',
      address: 'Bogyoke Aung San Rd, Yangon',
      latitude: 16.7794,
      longitude: 96.1518,
      region_id: 'region-yangon',
      price_book_id: 'pb-yangon',
      lifetime_value: 1250000,
      sentiment_trend: 'IMPROVING',
      assigned_rep_id: 'rep-1',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'shop-2',
      name: 'Ruby Supermarket Mandalay',
      address: '78th St, Mandalay',
      latitude: 21.9754,
      longitude: 96.0838,
      region_id: 'region-mandalay',
      price_book_id: 'pb-mandalay',
      lifetime_value: 980000,
      sentiment_trend: 'STABLE',
      assigned_rep_id: 'rep-2',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'shop-3',
      name: 'Kantharyar Shopping Centre',
      address: 'U Aung Myat St, Yangon',
      latitude: 16.7932,
      longitude: 96.1664,
      region_id: 'region-yangon',
      price_book_id: 'pb-yangon',
      lifetime_value: 450000,
      sentiment_trend: 'DECLINING',
      assigned_rep_id: 'rep-1',
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
      price_book_id: 'pb-mandalay',
      lifetime_value: 150000,
      sentiment_trend: 'IMPROVING',
      assigned_rep_id: 'rep-2',
      created_at: now,
      updated_at: now,
    },
  ]);

  // 8. Seed Contacts
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
      name: 'Daw Tin',
      phone_number: '+95922221111',
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
      predicted_ltv: 1375000,
      churn_risk: 0.08,
      stockout_risk: 0.65,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'pred-shop-2',
      shop_id: 'shop-2',
      predicted_ltv: 1078000,
      churn_risk: 0.35,
      stockout_risk: 0.15,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'pred-shop-3',
      shop_id: 'shop-3',
      predicted_ltv: 495000,
      churn_risk: 0.82,
      stockout_risk: 0.65,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'pred-shop-4',
      shop_id: 'shop-4',
      predicted_ltv: 165000,
      churn_risk: 0.08,
      stockout_risk: 0.15,
      created_at: now,
      updated_at: now,
    },
  ]);

  // 10. Seed Reorders
  await db.insert(sqliteSchema.recommended_orders).values([
    {
      id: 'rec-shop-1-item-1',
      shop_id: 'shop-1',
      item_id: 'item-1',
      quantity: 48,
      confidence: 0.89,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'rec-shop-2-item-1',
      shop_id: 'shop-2',
      item_id: 'item-1',
      quantity: 24,
      confidence: 0.89,
      created_at: now,
      updated_at: now,
    },
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
      id: 'rec-shop-4-item-1',
      shop_id: 'shop-4',
      item_id: 'item-1',
      quantity: 24,
      confidence: 0.89,
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
      shop_id: 'shop-4',
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
      shop_id: 'shop-4',
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
      shop_id: 'shop-4',
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
      shop_id: 'shop-4',
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
      shop_id: 'shop-4',
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
      shop_id: 'shop-4',
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
      shop_id: 'shop-4',
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
      shop_id: 'shop-4',
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
      shop_ids: JSON.stringify(['shop-2', 'shop-4']),
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
};
