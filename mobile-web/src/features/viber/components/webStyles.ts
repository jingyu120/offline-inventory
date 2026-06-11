import { Platform } from 'react-native';

/**
 * React-Native-Web accepts CSS properties (transition, outlineStyle) that are
 * absent from the native StyleSheet types. We surface them as plain string maps
 * so callers can spread them into style objects without weakening other types.
 */
export const WEB_TRANSITION: Record<string, string> =
  Platform.OS === 'web'
    ? {
        transitionProperty: 'transform, opacity',
        transitionDuration: '200ms',
        transitionTimingFunction: 'ease-in-out',
      }
    : {};

export const WEB_NO_OUTLINE: Record<string, string> =
  Platform.OS === 'web' ? { outlineStyle: 'none' } : {};
