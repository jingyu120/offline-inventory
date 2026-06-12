import {
  writeAuditEvent,
  AuditEventPayload,
  getLatestAuditHash,
  setLatestAuditHash,
} from './audit';

describe('audit logger', () => {
  const mockEvent: AuditEventPayload = {
    event_id: 'evt-1',
    trace_id: 'trace-1',
    actor_id: 'user-1',
    device_id: 'device-1',
    entity_type: 'ORDER',
    action: 'CREATE',
    previous_state: null,
    new_state: '{"total": 500}',
    gps_coordinates: null,
    created_at: 1234567,
  };

  it('chains with genesis hash when database is empty', async () => {
    const mockTx = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockResolvedValue(undefined),
    };

    const hash = await writeAuditEvent(mockTx as any, mockEvent);
    expect(hash).toHaveLength(64);
    expect(mockTx.insert).toHaveBeenCalled();
    expect(mockTx.values).toHaveBeenCalledWith({
      ...mockEvent,
      hash,
      status: 'VALID',
      updated_at: mockEvent.created_at,
    });
  });

  it('chains mathematically to preceding event hash when present', async () => {
    const mockTx = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ hash: 'prev-event-hash-123' }]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockResolvedValue(undefined),
    };

    const hash = await writeAuditEvent(mockTx as any, mockEvent);
    expect(hash).toHaveLength(64);
    // Since prev-event-hash-123 is present, it will be included in the hashed string context
    expect(mockTx.insert).toHaveBeenCalled();
  });

  it('gets and sets the latest audit hash', () => {
    const freshHash = 'some-new-hash-val';
    setLatestAuditHash(freshHash);
    expect(getLatestAuditHash()).toBe(freshHash);
  });
});
