import { ConflictResolutionService } from './conflict-resolution.service';
import * as schema from '@burma-inventory/shared-types';

function createTxWithAuditEvents(events: unknown[]) {
  const query: $Any = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(events),
  };
  return query;
}

describe('ConflictResolutionService', () => {
  let service: ConflictResolutionService;

  beforeEach(() => {
    service = new ConflictResolutionService();
  });

  describe('getFieldsChangedOnServer', () => {
    it('collects all keys when only new_state exists', async () => {
      const tx = createTxWithAuditEvents([
        {
          previous_state: null,
          new_state: JSON.stringify({ id: 'r-1', name: 'X', color: 'red' }),
        },
      ]);
      const fields = await service.getFieldsChangedOnServer(
        tx,
        'SHOP',
        'r-1',
        0,
      );
      expect(fields.has('name')).toBe(true);
      expect(fields.has('color')).toBe(true);
    });

    it('collects only differing keys when both states exist', async () => {
      const tx = createTxWithAuditEvents([
        {
          previous_state: JSON.stringify({
            id: 'r-1',
            name: 'X',
            color: 'red',
          }),
          new_state: JSON.stringify({ id: 'r-1', name: 'X', color: 'blue' }),
        },
      ]);
      const fields = await service.getFieldsChangedOnServer(
        tx,
        'SHOP',
        'r-1',
        0,
      );
      expect(fields.has('color')).toBe(true);
      expect(fields.has('name')).toBe(false);
    });

    it('ignores events for other records and unparseable states', async () => {
      const tx = createTxWithAuditEvents([
        { previous_state: '{bad', new_state: '{bad' },
        {
          previous_state: null,
          new_state: JSON.stringify({ id: 'other', name: 'Y' }),
        },
      ]);
      const fields = await service.getFieldsChangedOnServer(
        tx,
        'SHOP',
        'r-1',
        0,
      );
      expect(fields.size).toBe(0);
    });
  });

  describe('mergeUpdatedRecord', () => {
    it('returns the incoming record unchanged when not updated on server', async () => {
      const tx = createTxWithAuditEvents([]);
      const { mergedRecord, conflictWarnings } =
        await service.mergeUpdatedRecord(
          tx,
          'shops',
          'shop-1',
          { id: 'shop-1', name: 'Client', updated_at: 200 },
          { id: 'shop-1', name: 'Server', updated_at: 50 },
          100,
        );
      expect(mergedRecord.name).toBe('Client');
      expect(conflictWarnings).toEqual([]);
    });

    it('keeps server value and warns on commercial_status conflict', async () => {
      const tx = createTxWithAuditEvents([
        {
          previous_state: JSON.stringify({
            id: 'log-1',
            commercial_status: 'PAID',
          }),
          new_state: JSON.stringify({
            id: 'log-1',
            commercial_status: 'CANCELLED',
          }),
        },
      ]);
      const { mergedRecord, conflictWarnings } =
        await service.mergeUpdatedRecord(
          tx,
          'interaction_logs',
          'log-1',
          { id: 'log-1', commercial_status: 'PENDING', updated_at: 110 },
          { id: 'log-1', commercial_status: 'CANCELLED', updated_at: 105 },
          100,
        );
      expect(mergedRecord.commercial_status).toBe('CANCELLED');
      expect(conflictWarnings[0]).toContain('[Conflict Resolution]');
    });

    it('applies client value when the field was not changed on server', async () => {
      const tx = createTxWithAuditEvents([]);
      const { mergedRecord } = await service.mergeUpdatedRecord(
        tx,
        'shops',
        'shop-1',
        { id: 'shop-1', name: 'Client', updated_at: 110 },
        { id: 'shop-1', name: 'Server', updated_at: 105 },
        100,
      );
      expect(mergedRecord.name).toBe('Client');
    });

    it('skips undefined incoming fields and preserves equal values', async () => {
      const tx = createTxWithAuditEvents([]);
      const { mergedRecord } = await service.mergeUpdatedRecord(
        tx,
        'shops',
        'shop-1',
        {
          id: 'shop-1',
          name: 'Server',
          address: undefined,
          updated_at: 110,
        },
        { id: 'shop-1', name: 'Server', address: 'Main St', updated_at: 105 },
        100,
      );
      expect(mergedRecord.name).toBe('Server');
      expect(mergedRecord.address).toBe('Main St');
    });

    it('does not query audit events for an unaudited table updated on server', async () => {
      const tx: $Any = {
        select: jest.fn(),
        from: jest.fn(),
        where: jest.fn(),
      };
      const { mergedRecord } = await service.mergeUpdatedRecord(
        tx,
        'item_stocks',
        'stock-1',
        { id: 'stock-1', quantity: 5, updated_at: 110 },
        { id: 'stock-1', quantity: 9, updated_at: 105 },
        100,
      );
      // unaudited table -> no server-changed-field lookup, client value wins
      expect(tx.select).not.toHaveBeenCalled();
      expect(mergedRecord.quantity).toBe(5);
    });
  });

  it('exercises real schema reference for audit_events table', () => {
    expect(schema.pgSchema.audit_events).toBeDefined();
  });
});
