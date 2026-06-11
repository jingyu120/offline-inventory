import { Platform } from 'react-native';
import { getShadowStyle, shadows } from './shadows';

describe('getShadowStyle', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: originalOS,
      configurable: true,
    });
  });

  const setOS = (os: typeof Platform.OS) =>
    Object.defineProperty(Platform, 'OS', { value: os, configurable: true });

  it('produces a CSS boxShadow on web for every level', () => {
    setOS('web');
    expect(getShadowStyle('card')).toEqual({
      boxShadow: '0px 4px 12px rgba(0,0,0,0.04)',
    });
    expect(getShadowStyle('table')).toEqual({
      boxShadow: '0px 2px 6px rgba(0,0,0,0.03)',
    });
  });

  it('produces native shadow props off web for every level', () => {
    setOS('ios');
    expect(getShadowStyle('card')).toEqual({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
    });
    expect(getShadowStyle('table')).toEqual({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 6,
    });
  });

  it('exposes the raw shadow scale', () => {
    expect(shadows.card.radius).toBe(12);
    expect(shadows.table.radius).toBe(6);
  });
});
