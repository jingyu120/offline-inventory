/**
 * Unit tests for the TelemetryLogger utility.
 *
 * The `database` module is mocked so no SQLite connection is opened.
 * The mock is declared INSIDE the jest.mock() factory to avoid hoisting issues.
 */

// Declare the mock object in module scope so tests can reference it
const mockInsertValues = jest.fn().mockResolvedValue(undefined);
const mockInsert = jest.fn().mockReturnValue({ values: mockInsertValues });

jest.mock('../database/database', () => ({
  database: {
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

import { TelemetryLogger } from './telemetry';

describe('TelemetryLogger', () => {
  beforeEach(() => {
    mockInsert.mockClear();
    mockInsertValues.mockClear();
  });

  it('inserts a telemetry event log with the correct fields', async () => {
    await TelemetryLogger.logEvent('CLICK_BUTTON', 'Clicked submit', 'info');

    expect(mockInsert).toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        event_type: 'CLICK_BUTTON',
        message: 'Clicked submit',
      }),
    );
  });

  it('uses "error" as the default log level when none is specified', async () => {
    await TelemetryLogger.logEvent('SYSTEM_ERROR', 'Something went wrong');

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'error' }),
    );
  });

  it('recovers gracefully and logs to console.error when the database insert fails', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    mockInsertValues.mockRejectedValueOnce(new Error('SQLite full'));

    await TelemetryLogger.logEvent('ERROR_LOG', 'Test error', 'error');

    expect(mockInsert).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('generates a unique UUID for every logged event', async () => {
    const capturedIds: string[] = [];
    mockInsertValues.mockImplementation(
      async (row: Record<string, unknown>) => {
        capturedIds.push(row['id'] as string);
      },
    );

    await TelemetryLogger.logEvent('EV1', 'msg1');
    await TelemetryLogger.logEvent('EV2', 'msg2');

    expect(capturedIds).toHaveLength(2);
    expect(capturedIds[0]).not.toBe(capturedIds[1]);
  });
});
