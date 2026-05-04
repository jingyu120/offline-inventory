import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class InventoryItem extends Model {
  static table = 'inventory_items';

  @field('barcode') barcode!: string;
  @field('name') name!: string;
  @field('quantity') quantity!: number;
  @field('status') status!: string; // 'PENDING' | 'RECEIVED'
  @field('user_id') userId!: string;
  @field('location') location?: string;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
