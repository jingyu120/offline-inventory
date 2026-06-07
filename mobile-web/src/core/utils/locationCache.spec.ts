import { getCachedLocation, clearLocationCache } from './locationCache';
import * as Location from 'expo-location';

jest.mock('expo-location', () => ({
  getCurrentPositionAsync: jest.fn(),
}));

describe('locationCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearLocationCache();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should call Location.getCurrentPositionAsync when cache is empty', async () => {
    const mockLocation = {
      coords: {
        latitude: 16.8661,
        longitude: 96.1951,
        altitude: null,
        accuracy: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
      mockLocation,
    );

    const result = await getCachedLocation();

    expect(Location.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
    expect(result.coords.latitude).toBe(16.8661);
    expect(result.coords.longitude).toBe(96.1951);
  });

  it('should return cached coordinates on subsequent calls within 5 minutes', async () => {
    const mockLocation = {
      coords: {
        latitude: 16.8661,
        longitude: 96.1951,
      },
      timestamp: Date.now(),
    };
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
      mockLocation,
    );

    // First call (cache miss)
    await getCachedLocation();
    expect(Location.getCurrentPositionAsync).toHaveBeenCalledTimes(1);

    // Second call (cache hit)
    const result = await getCachedLocation();
    expect(Location.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
    expect(result.coords.latitude).toBe(16.8661);
    expect(result.coords.longitude).toBe(96.1951);
  });

  it('should fetch fresh location after cache expires (5 minutes)', async () => {
    const mockLocation = {
      coords: {
        latitude: 16.8661,
        longitude: 96.1951,
      },
      timestamp: Date.now(),
    };
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
      mockLocation,
    );

    // First call
    await getCachedLocation();
    expect(Location.getCurrentPositionAsync).toHaveBeenCalledTimes(1);

    // Fast-forward time by 5 minutes and 1 second (301,000 ms)
    jest.advanceTimersByTime(301000);

    // Second call (cache expired)
    await getCachedLocation();
    expect(Location.getCurrentPositionAsync).toHaveBeenCalledTimes(2);
  });

  it('should force a fresh fetch if cache is cleared manually', async () => {
    const mockLocation = {
      coords: {
        latitude: 16.8661,
        longitude: 96.1951,
      },
      timestamp: Date.now(),
    };
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
      mockLocation,
    );

    await getCachedLocation();
    expect(Location.getCurrentPositionAsync).toHaveBeenCalledTimes(1);

    clearLocationCache();

    await getCachedLocation();
    expect(Location.getCurrentPositionAsync).toHaveBeenCalledTimes(2);
  });
});
