import { Platform } from 'react-native';

/**
 * React-Native-Web accepts CSS properties (transition, outlineStyle) that are
 * absent from the native StyleSheet types. We surface them as plain string maps
 * so callers can spread them into admin input styles without weakening other
 * types or reaching for `any`.
 */
export const ADMIN_INPUT_WEB_STYLE: Record<string, string> =
  Platform.OS === 'web'
    ? {
        outlineStyle: 'none',
        transitionProperty: 'border-color, border-width',
        transitionDuration: '150ms',
        transitionTimingFunction: 'ease-in-out',
      }
    : {};
