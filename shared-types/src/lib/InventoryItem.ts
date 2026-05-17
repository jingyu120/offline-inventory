import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class InventoryItem extends Model {
  static override table = 'inventory_items';

  @field('barcode') barcode!: string;
  @field('name') name!: string;
  @field('quantity') quantity!: number;
  @field('status') status!: string; // 'EXPECTED' | 'INVENTORY' | 'HISTORICAL'
  @field('user_id') userId!: string;
  @field('location') location?: string;
  @date('received_at') receivedAt?: Date;
  @date('sold_at') soldAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
