import { calculateDistance } from './geo';

describe('geo', () => {
  describe('calculateDistance', () => {
    it('should return 0 when the coordinates are identical', () => {
      const lat = 16.8661;
      const lon = 96.1951;
      const distance = calculateDistance(lat, lon, lat, lon);
      expect(distance).toBe(0);
    });

    it('should calculate the correct distance between two known points in Yangon', () => {
      // Point 1: Shwedagon Pagoda (16.7984, 96.1497)
      // Point 2: Sule Pagoda (16.7746, 96.1588)
      // Theoretical Haversine distance is roughly ~2810 meters.
      const dist = calculateDistance(16.7984, 96.1497, 16.7746, 96.1588);

      expect(dist).toBeGreaterThan(2750);
      expect(dist).toBeLessThan(2850);
    });

    it('should behave symmetrically when swapping the coordinate parameters', () => {
      const lat1 = 16.7984;
      const lon1 = 96.1497;
      const lat2 = 16.7746;
      const lon2 = 96.1588;

      const d1 = calculateDistance(lat1, lon1, lat2, lon2);
      const d2 = calculateDistance(lat2, lon2, lat1, lon1);

      expect(d1).toBe(d2);
    });
  });
});
