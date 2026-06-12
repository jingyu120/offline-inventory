import * as Location from 'expo-location';

let cachedLocation: {
  coords: {
    latitude: number;
    longitude: number;
  };
  timestamp: number;
} | null = null;

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export async function getCachedLocation(
  options?: Location.LocationOptions,
): Promise<{
  coords: {
    latitude: number;
    longitude: number;
  };
}> {
  const now = Date.now();
  if (cachedLocation && now - cachedLocation.timestamp < CACHE_DURATION_MS) {
    return cachedLocation;
  }

  const freshLoc = await Location.getCurrentPositionAsync(options);
  cachedLocation = {
    coords: {
      latitude: freshLoc.coords.latitude,
      longitude: freshLoc.coords.longitude,
    },
    timestamp: now,
  };
  return cachedLocation;
}

export function clearLocationCache() {
  cachedLocation = null;
}
