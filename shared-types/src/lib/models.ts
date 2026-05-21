import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class Region extends Model {
  // @ts-expect-error - WatermelonDB decorators conflict with TS class properties
  static table = 'regions';

  @field('name') name!: string;
  @field('division') division!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}

export class Shop extends Model {
  // @ts-expect-error - WatermelonDB decorators conflict with TS class properties
  static table = 'shops';
  static override associations = {
    contacts: { type: 'has_many', foreignKey: 'shop_id' },
    interaction_logs: { type: 'has_many', foreignKey: 'shop_id' },
    regions: { type: 'belongs_to', key: 'region_id' },
  } as const;

  @field('name') name!: string;
  @field('address') address!: string;
  @field('latitude') latitude?: number;
  @field('longitude') longitude?: number;
  @field('region_id') regionId!: string;
  @field('assigned_rep_id') assignedRepId?: string;
  @field('lifetime_value') lifetimeValue!: number;
  @field('sentiment_trend') sentimentTrend!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}

export class Contact extends Model {
  // @ts-expect-error - WatermelonDB decorators conflict with TS class properties
  static table = 'contacts';
  static override associations = {
    shops: { type: 'belongs_to', key: 'shop_id' },
  } as const;

  @field('shop_id') shopId!: string;
  @field('name') name!: string;
  @field('phone_number') phoneNumber!: string;
  @field('email') email?: string;
  @field('is_primary') isPrimary!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}

export class Item extends Model {
  // @ts-expect-error - WatermelonDB decorators conflict with TS class properties
  static table = 'items';
  static override associations = {
    interaction_items: { type: 'has_many', foreignKey: 'item_id' },
  } as const;

  @field('sku') sku!: string;
  @field('name') name!: string;
  @field('unit_price') unitPrice!: number;
  @field('category') category!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}

export class InteractionLog extends Model {
  // @ts-expect-error - WatermelonDB decorators conflict with TS class properties
  static table = 'interaction_logs';
  static override associations = {
    shops: { type: 'belongs_to', key: 'shop_id' },
    interaction_items: { type: 'has_many', foreignKey: 'interaction_log_id' },
  } as const;

  @field('shop_id') shopId!: string;
  @field('rep_id') repId!: string;
  @field('type') type!: string;
  @field('commercial_status') commercialStatus!: string;
  @field('notes') notes!: string;
  @date('next_follow_up_date') nextFollowUpDate?: Date;
  @field('viber_screenshot_url') viberScreenshotUrl?: string;
  @date('created_at_local') createdAtLocal!: Date;
  @date('synced_at_server') syncedAtServer?: Date;
  @field('is_offline_entry') isOfflineEntry!: boolean;
  @field('device_id') deviceId!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}

export class InteractionItem extends Model {
  // @ts-expect-error - WatermelonDB decorators conflict with TS class properties
  static table = 'interaction_items';
  static override associations = {
    interaction_logs: { type: 'belongs_to', key: 'interaction_log_id' },
    items: { type: 'belongs_to', key: 'item_id' },
  } as const;

  @field('interaction_log_id') interactionLogId!: string;
  @field('item_id') itemId!: string;
  @field('quantity') quantity!: number;
  @field('unit_price_at_sale') unitPriceAtSale!: number;
  @field('interest_level') interestLevel?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}

export class DailyQuota extends Model {
  // @ts-expect-error - WatermelonDB decorators conflict with TS class properties
  static table = 'daily_quotas';

  @field('user_id') userId!: string;
  @field('target_visits') targetVisits!: number;
  @field('target_phone') targetPhone!: number;
  @field('target_viber') targetViber!: number;
  @date('effective_from') effectiveFrom!: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}

export class ItemStock extends Model {
  // @ts-expect-error - WatermelonDB decorators conflict with TS class properties
  static table = 'item_stocks';
  static override associations = {
    items: { type: 'belongs_to', key: 'item_id' },
  } as const;

  @field('item_id') itemId!: string;
  @field('quantity') quantity!: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
