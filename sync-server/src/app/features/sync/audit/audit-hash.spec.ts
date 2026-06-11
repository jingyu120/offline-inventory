import { calculateEventHash, generateSequentialId } from './audit-hash';

describe('audit-hash', () => {
  describe('calculateEventHash', () => {
    it('produces a 64-character hex SHA-256 string', () => {
      const hash = calculateEventHash(
        {
          event_id: '1',
          trace_id: 'trace',
          entity_type: 'ORDER',
          action: 'CREATE',
          previous_state: null,
          new_state: '{"a":1}',
          gps_coordinates: null,
          created_at: 1000,
        },
        'rep-1',
        'prev-hash',
      );
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('stringifies object states before hashing and stays deterministic', () => {
      const event = {
        event_id: '1',
        trace_id: null,
        entity_type: 'SHOP',
        action: 'UPDATE',
        previous_state: { id: 'shop-1', name: 'A' },
        new_state: { id: 'shop-1', name: 'B' },
        gps_coordinates: '1,2',
        created_at: 2000,
      };
      const first = calculateEventHash(event, 'rep-1', 'prev');
      const second = calculateEventHash(event, 'rep-1', 'prev');
      expect(first).toBe(second);
    });

    it('produces different hashes when the previous hash differs', () => {
      const event = {
        event_id: '1',
        entity_type: 'ORDER',
        action: 'CREATE',
        previous_state: null,
        new_state: null,
        created_at: 1,
      };
      expect(calculateEventHash(event, 'a', 'p1')).not.toBe(
        calculateEventHash(event, 'a', 'p2'),
      );
    });
  });

  describe('generateSequentialId', () => {
    it('generates unique, hyphen-delimited ids', () => {
      const a = generateSequentialId();
      const b = generateSequentialId();
      expect(a).toMatch(/^\d{15,}-[0-9a-f]{16}$/);
      expect(a).not.toBe(b);
    });
  });
});
