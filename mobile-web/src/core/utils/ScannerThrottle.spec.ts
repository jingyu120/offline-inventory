import { scannerThrottle } from './ScannerThrottle';
import { Alert } from 'react-native';

jest.mock('react-native', () => {
  return {
    Alert: {
      alert: jest.fn(),
    },
  };
});

describe('ScannerThrottle', () => {
  let mockAudioContext: any;

  beforeAll(() => {
    // Mock window AudioContext for audio alert checks
    mockAudioContext = jest.fn().mockImplementation(() => ({
      createOscillator: jest.fn().mockReturnValue({
        type: '',
        frequency: { setValueAtTime: jest.fn() },
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
      }),
      createGain: jest.fn().mockReturnValue({
        gain: { setValueAtTime: jest.fn() },
        connect: jest.fn(),
      }),
      currentTime: 0,
      destination: {},
    }));
    (globalThis as any).window = {
      AudioContext: mockAudioContext,
    };
  });

  afterAll(() => {
    delete (globalThis as any).window;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows the first barcode scan', () => {
    const allowed = scannerThrottle.processScan('BARCODE1');
    expect(allowed).toBe(true);
  });

  it('blocks a duplicate barcode scan inside the throttle window', () => {
    // Scan 1
    scannerThrottle.processScan('BARCODE2');
    // Scan 2 immediately after
    const allowed = scannerThrottle.processScan('BARCODE2');
    expect(allowed).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Duplicate Scan Blocked',
      expect.any(String),
    );
  });

  it('allows a different barcode scan immediately', () => {
    scannerThrottle.processScan('BARCODE3');
    const allowed = scannerThrottle.processScan('BARCODE4');
    expect(allowed).toBe(true);
  });

  it('handles empty barcodes by returning false without updating state', () => {
    expect(scannerThrottle.processScan(' ')).toBe(false);
  });

  it('handles custom translation function and triggers alert', () => {
    const t = jest.fn((key) => `translated-${key}`);
    scannerThrottle.processScan('BARCODE_T');
    scannerThrottle.processScan('BARCODE_T', t);
    expect(t).toHaveBeenCalledWith('duplicateScanBlocked');
    expect(t).toHaveBeenCalledWith('duplicateScanBlockedDesc');
  });

  it('handles audio context creation exception', () => {
    const originalAudioContext = (globalThis as any).window.AudioContext;
    (globalThis as any).window.AudioContext = jest
      .fn()
      .mockImplementation(() => {
        throw new Error('AudioContext error');
      });

    const consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation((_msg, _err) => undefined);
    scannerThrottle.processScan('BARCODE_ERR');
    scannerThrottle.processScan('BARCODE_ERR');

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Failed to play audio alert',
      expect.any(Error),
    );
    consoleWarnSpy.mockRestore();
    (globalThis as any).window.AudioContext = originalAudioContext;
  });
});
