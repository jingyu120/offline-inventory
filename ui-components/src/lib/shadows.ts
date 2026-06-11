import { Platform, ViewStyle } from 'react-native';

/**
 * Centralized elevation/shadow scale for the design system.
 *
 * Card and Table previously hand-rolled near-identical platform-branched
 * shadow blocks with inline magic values. Those live here once so the
 * visual language stays consistent and platform handling is not duplicated.
 */
export interface ShadowSpec {
  readonly offsetY: number;
  readonly radius: number;
  readonly opacity: number;
}

export const shadows = {
  card: { offsetY: 4, radius: 12, opacity: 0.04 },
  table: { offsetY: 2, radius: 6, opacity: 0.03 },
} as const satisfies Record<string, ShadowSpec>;

export type ShadowLevel = keyof typeof shadows;

/**
 * Resolves a named shadow level into the platform-correct style object.
 * Web uses the CSS `boxShadow` property; native uses RN shadow* props.
 */
export function getShadowStyle(level: ShadowLevel): ViewStyle {
  const spec = shadows[level];
  if (Platform.OS === 'web') {
    return {
      boxShadow: `0px ${spec.offsetY}px ${spec.radius}px rgba(0,0,0,${spec.opacity})`,
    } as ViewStyle;
  }
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: spec.offsetY },
    shadowOpacity: spec.opacity,
    shadowRadius: spec.radius,
  };
}
