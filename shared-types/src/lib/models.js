import { __decorate, __metadata } from 'tslib';
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';
export class Region extends Model {
  // @ts-expect-error - WatermelonDB decorators conflict with TS class properties
  static {
    this.table = 'regions';
  }
}
__decorate(
  [field('name'), __metadata('design:type', String)],
  Region.prototype,
  'name',
  void 0,
);
__decorate(
  [field('division'), __metadata('design:type', String)],
  Region.prototype,
  'division',
  void 0,
);
__decorate(
  [readonly, date('created_at'), __metadata('design:type', Date)],
  Region.prototype,
  'createdAt',
  void 0,
);
__decorate(
  [readonly, date('updated_at'), __metadata('design:type', Date)],
  Region.prototype,
  'updatedAt',
  void 0,
);
export class Shop extends Model {
  // @ts-expect-error - WatermelonDB decorators conflict with TS class properties
  static {
    this.table = 'shops';
  }
  static {
    this.associations = {
      contacts: { type: 'has_many', foreignKey: 'shop_id' },
      interaction_logs: { type: 'has_many', foreignKey: 'shop_id' },
      regions: { type: 'belongs_to', key: 'region_id' },
    };
  }
}
__decorate(
  [field('name'), __metadata('design:type', String)],
  Shop.prototype,
  'name',
  void 0,
);
__decorate(
  [field('address'), __metadata('design:type', String)],
  Shop.prototype,
  'address',
  void 0,
);
__decorate(
  [field('latitude'), __metadata('design:type', Number)],
  Shop.prototype,
  'latitude',
  void 0,
);
__decorate(
  [field('longitude'), __metadata('design:type', Number)],
  Shop.prototype,
  'longitude',
  void 0,
);
__decorate(
  [field('region_id'), __metadata('design:type', String)],
  Shop.prototype,
  'regionId',
  void 0,
);
__decorate(
  [field('assigned_rep_id'), __metadata('design:type', String)],
  Shop.prototype,
  'assignedRepId',
  void 0,
);
__decorate(
  [field('lifetime_value'), __metadata('design:type', Number)],
  Shop.prototype,
  'lifetimeValue',
  void 0,
);
__decorate(
  [field('sentiment_trend'), __metadata('design:type', String)],
  Shop.prototype,
  'sentimentTrend',
  void 0,
);
__decorate(
  [readonly, date('created_at'), __metadata('design:type', Date)],
  Shop.prototype,
  'createdAt',
  void 0,
);
__decorate(
  [readonly, date('updated_at'), __metadata('design:type', Date)],
  Shop.prototype,
  'updatedAt',
  void 0,
);
export class Contact extends Model {
  // @ts-expect-error - WatermelonDB decorators conflict with TS class properties
  static {
    this.table = 'contacts';
  }
  static {
    this.associations = {
      shops: { type: 'belongs_to', key: 'shop_id' },
    };
  }
}
__decorate(
  [field('shop_id'), __metadata('design:type', String)],
  Contact.prototype,
  'shopId',
  void 0,
);
__decorate(
  [field('name'), __metadata('design:type', String)],
  Contact.prototype,
  'name',
  void 0,
);
__decorate(
  [field('phone_number'), __metadata('design:type', String)],
  Contact.prototype,
  'phoneNumber',
  void 0,
);
__decorate(
  [field('email'), __metadata('design:type', String)],
  Contact.prototype,
  'email',
  void 0,
);
__decorate(
  [field('is_primary'), __metadata('design:type', Boolean)],
  Contact.prototype,
  'isPrimary',
  void 0,
);
__decorate(
  [readonly, date('created_at'), __metadata('design:type', Date)],
  Contact.prototype,
  'createdAt',
  void 0,
);
__decorate(
  [readonly, date('updated_at'), __metadata('design:type', Date)],
  Contact.prototype,
  'updatedAt',
  void 0,
);
export class Item extends Model {
  // @ts-expect-error - WatermelonDB decorators conflict with TS class properties
  static {
    this.table = 'items';
  }
  static {
    this.associations = {
      interaction_items: { type: 'has_many', foreignKey: 'item_id' },
    };
  }
}
__decorate(
  [field('sku'), __metadata('design:type', String)],
  Item.prototype,
  'sku',
  void 0,
);
__decorate(
  [field('name'), __metadata('design:type', String)],
  Item.prototype,
  'name',
  void 0,
);
__decorate(
  [field('unit_price'), __metadata('design:type', Number)],
  Item.prototype,
  'unitPrice',
  void 0,
);
__decorate(
  [field('category'), __metadata('design:type', String)],
  Item.prototype,
  'category',
  void 0,
);
__decorate(
  [readonly, date('created_at'), __metadata('design:type', Date)],
  Item.prototype,
  'createdAt',
  void 0,
);
__decorate(
  [readonly, date('updated_at'), __metadata('design:type', Date)],
  Item.prototype,
  'updatedAt',
  void 0,
);
export class InteractionLog extends Model {
  // @ts-expect-error - WatermelonDB decorators conflict with TS class properties
  static {
    this.table = 'interaction_logs';
  }
  static {
    this.associations = {
      shops: { type: 'belongs_to', key: 'shop_id' },
      interaction_items: { type: 'has_many', foreignKey: 'interaction_log_id' },
    };
  }
}
__decorate(
  [field('shop_id'), __metadata('design:type', String)],
  InteractionLog.prototype,
  'shopId',
  void 0,
);
__decorate(
  [field('rep_id'), __metadata('design:type', String)],
  InteractionLog.prototype,
  'repId',
  void 0,
);
__decorate(
  [field('type'), __metadata('design:type', String)],
  InteractionLog.prototype,
  'type',
  void 0,
);
__decorate(
  [field('commercial_status'), __metadata('design:type', String)],
  InteractionLog.prototype,
  'commercialStatus',
  void 0,
);
__decorate(
  [field('notes'), __metadata('design:type', String)],
  InteractionLog.prototype,
  'notes',
  void 0,
);
__decorate(
  [date('next_follow_up_date'), __metadata('design:type', Date)],
  InteractionLog.prototype,
  'nextFollowUpDate',
  void 0,
);
__decorate(
  [field('viber_screenshot_url'), __metadata('design:type', String)],
  InteractionLog.prototype,
  'viberScreenshotUrl',
  void 0,
);
__decorate(
  [date('created_at_local'), __metadata('design:type', Date)],
  InteractionLog.prototype,
  'createdAtLocal',
  void 0,
);
__decorate(
  [date('synced_at_server'), __metadata('design:type', Date)],
  InteractionLog.prototype,
  'syncedAtServer',
  void 0,
);
__decorate(
  [field('is_offline_entry'), __metadata('design:type', Boolean)],
  InteractionLog.prototype,
  'isOfflineEntry',
  void 0,
);
__decorate(
  [field('device_id'), __metadata('design:type', String)],
  InteractionLog.prototype,
  'deviceId',
  void 0,
);
__decorate(
  [readonly, date('created_at'), __metadata('design:type', Date)],
  InteractionLog.prototype,
  'createdAt',
  void 0,
);
__decorate(
  [readonly, date('updated_at'), __metadata('design:type', Date)],
  InteractionLog.prototype,
  'updatedAt',
  void 0,
);
export class InteractionItem extends Model {
  // @ts-expect-error - WatermelonDB decorators conflict with TS class properties
  static {
    this.table = 'interaction_items';
  }
  static {
    this.associations = {
      interaction_logs: { type: 'belongs_to', key: 'interaction_log_id' },
      items: { type: 'belongs_to', key: 'item_id' },
    };
  }
}
__decorate(
  [field('interaction_log_id'), __metadata('design:type', String)],
  InteractionItem.prototype,
  'interactionLogId',
  void 0,
);
__decorate(
  [field('item_id'), __metadata('design:type', String)],
  InteractionItem.prototype,
  'itemId',
  void 0,
);
__decorate(
  [field('quantity'), __metadata('design:type', Number)],
  InteractionItem.prototype,
  'quantity',
  void 0,
);
__decorate(
  [field('unit_price_at_sale'), __metadata('design:type', Number)],
  InteractionItem.prototype,
  'unitPriceAtSale',
  void 0,
);
__decorate(
  [field('interest_level'), __metadata('design:type', String)],
  InteractionItem.prototype,
  'interestLevel',
  void 0,
);
export class DailyQuota extends Model {
  // @ts-expect-error - WatermelonDB decorators conflict with TS class properties
  static {
    this.table = 'daily_quotas';
  }
}
__decorate(
  [field('user_id'), __metadata('design:type', String)],
  DailyQuota.prototype,
  'userId',
  void 0,
);
__decorate(
  [field('target_visits'), __metadata('design:type', Number)],
  DailyQuota.prototype,
  'targetVisits',
  void 0,
);
__decorate(
  [field('target_phone'), __metadata('design:type', Number)],
  DailyQuota.prototype,
  'targetPhone',
  void 0,
);
__decorate(
  [field('target_viber'), __metadata('design:type', Number)],
  DailyQuota.prototype,
  'targetViber',
  void 0,
);
__decorate(
  [date('effective_from'), __metadata('design:type', Date)],
  DailyQuota.prototype,
  'effectiveFrom',
  void 0,
);
__decorate(
  [readonly, date('created_at'), __metadata('design:type', Date)],
  DailyQuota.prototype,
  'createdAt',
  void 0,
);
__decorate(
  [readonly, date('updated_at'), __metadata('design:type', Date)],
  DailyQuota.prototype,
  'updatedAt',
  void 0,
);
//# sourceMappingURL=models.js.map
