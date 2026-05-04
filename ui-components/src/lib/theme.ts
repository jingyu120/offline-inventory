import { createTheme } from '@shopify/restyle';

const palette = {
  purpleLight: '#8C6FF7',
  purplePrimary: '#5A31F4',
  purpleDark: '#3F22AB',

  greenLight: '#56DCBA',
  greenPrimary: '#0ECD9D',
  greenDark: '#0A906E',

  black: '#0B0B0B',
  white: '#F0F2F3',
  pureWhite: '#FFFFFF',

  grayLight: '#EAEAEA',
  grayMedium: '#9A9A9A',
  grayDark: '#4A4A4A',

  danger: '#FF3B30',
  dangerLight: '#FFD4D2',
};

export const theme = createTheme({
  colors: {
    mainBackground: palette.white,
    cardBackground: palette.pureWhite,
    primaryText: palette.black,
    secondaryText: palette.grayDark,
    primaryButton: palette.purplePrimary,
    primaryButtonText: palette.pureWhite,
    secondaryButton: palette.grayLight,
    secondaryButtonText: palette.black,
    borderColor: palette.grayLight,
    errorText: palette.danger,
    errorBackground: palette.dangerLight,
    transparent: 'transparent',
  },
  spacing: {
    s: 8,
    m: 16,
    l: 24,
    xl: 40,
  },
  breakpoints: {
    phone: 0,
    tablet: 768,
  },
  borderRadii: {
    s: 4,
    m: 8,
    l: 12,
    xl: 20,
    none: 0,
  },
  textVariants: {
    header: {
      fontWeight: 'bold',
      fontSize: 34,
      color: 'primaryText',
    },
    title: {
      fontWeight: 'bold',
      fontSize: 24,
      color: 'primaryText',
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
      color: 'primaryText',
    },
    bodySecondary: {
      fontSize: 14,
      color: 'secondaryText',
    },
    button: {
      fontWeight: '600',
      fontSize: 16,
      textAlign: 'center',
    },
    error: {
      fontSize: 12,
      color: 'errorText',
    },
    defaults: {
      // We can define a default text variant here.
    },
  },
});

export type Theme = typeof theme;
