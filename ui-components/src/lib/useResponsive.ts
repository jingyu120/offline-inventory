import { useWindowDimensions } from 'react-native';

/**
 * Layout breakpoints (min-width, px). Kept in sync with the Restyle theme
 * `breakpoints` so responsive props and imperative checks agree.
 */
export const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
} as const;

export interface ResponsiveInfo {
  width: number;
  height: number;
  /** width < 768 — single-column / stacked layout, bottom-tab navigation. */
  isPhone: boolean;
  /**
   * width >= 768 — wide enough for side-by-side (two-column) layouts.
   * Matches the app's long-standing `isDesktop` convention, so existing
   * `isDesktop` props/branches map onto it directly.
   */
  isDesktop: boolean;
  /** width >= 1024 — true desktop; opt into roomier multi-column layouts. */
  isLargeScreen: boolean;
  /** width >= 1440 — very wide monitors. */
  isWideScreen: boolean;
}

/**
 * Single source of truth for viewport-size decisions. Replaces the
 * `const { width } = useWindowDimensions(); const isDesktop = width >= 768`
 * snippet that was duplicated across every screen.
 */
export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    isPhone: width < BREAKPOINTS.tablet,
    isDesktop: width >= BREAKPOINTS.tablet,
    isLargeScreen: width >= BREAKPOINTS.desktop,
    isWideScreen: width >= BREAKPOINTS.wide,
  };
}
