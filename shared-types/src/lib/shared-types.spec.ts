import type {
  InventoryItemRecord,
  InventoryStatus,
  WatermelonChangeSet,
} from './shared-types';

describe('shared-types', () => {
  it('InventoryStatus covers all three lifecycle states', () => {
    const statuses: InventoryStatus[] = ['EXPECTED', 'INVENTORY', 'HISTORICAL'];
    expect(statuses).toHaveLength(3);
  });

  it('InventoryItemRecord has all required sync fields', () => {
    const record: InventoryItemRecord = {
      id: 'abc-123',
      barcode: '1234567890',
      name: 'Test Item',
      quantity: 5,
      status: 'EXPECTED',
      user_id: 'user-1',
      location: null,
      received_at: null,
      sold_at: null,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    expect(record.id).toBe('abc-123');
    expect(record.status).toBe('EXPECTED');
  });

  it('WatermelonChangeSet is correctly shaped', () => {
    const changeset: WatermelonChangeSet<string> = {
      created: ['a'],
      updated: ['b'],
      deleted: ['c'],
    };
    expect(changeset.created).toHaveLength(1);
  });
});
