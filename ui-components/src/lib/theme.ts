import { createTheme } from '@shopify/restyle';

const palette = {
  // Brand Colors (Indigo)
  brandLight: '#EEF2F6', // Very soft indigo-gray
  brandPrimary: '#4F46E5', // Indigo 600
  brandDark: '#3730A3', // Indigo 800
  brandAccent: '#818CF8', // Indigo 400

  // Brand Vivid Purple (product accent — distinct from indigo)
  brand: '#5A31F4',
  brandBgSubtle: 'rgba(90, 49, 244, 0.06)',
  brandBorderSubtle: 'rgba(90, 49, 244, 0.15)',

  // Neutral Slate scale
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',

  pureWhite: '#FFFFFF',

  // Statuses
  successBg: '#D1FAE5', // Emerald 100
  successText: '#065F46', // Emerald 800
  successPrimary: '#10B981', // Emerald 500

  warningBg: '#FEF3C7', // Amber 100
  warningText: '#92400E', // Amber 800
  warningPrimary: '#F59E0B', // Amber 500

  dangerBg: '#FEE2E2', // Red 100
  dangerText: '#991B1B', // Red 800
  dangerPrimary: '#EF4444', // Red 500

  infoBg: '#E0F2FE', // Sky 100
  infoText: '#0369A1', // Sky 800
  infoPrimary: '#0284C7', // Sky 600
};

export const theme = createTheme({
  colors: {
    mainBackground: palette.slate50,
    secondaryBackground: palette.slate100,
    cardBackground: palette.pureWhite,
    primaryText: palette.slate900,
    secondaryText: palette.slate500,
    primaryButton: palette.brandPrimary,
    primaryButtonText: palette.pureWhite,
    secondaryButton: palette.slate100,
    secondaryButtonText: palette.slate700,
    borderColor: palette.slate200,
    errorText: palette.dangerText,
    errorBackground: palette.dangerBg,

    // Status colors
    success: palette.successPrimary,
    successBg: palette.successBg,
    successText: palette.successText,

    warning: palette.warningPrimary,
    warningBg: palette.warningBg,
    warningText: palette.warningText,

    danger: palette.dangerPrimary,
    dangerBg: palette.dangerBg,
    dangerText: palette.dangerText,

    info: palette.infoPrimary,
    infoBg: palette.infoBg,
    infoText: palette.infoText,

    transparent: 'transparent',
    pureWhite: palette.pureWhite,
    slate200: palette.slate200,
    slate300: palette.slate300,

    // Brand vivid purple semantic tokens
    brand: palette.brand,
    brandBg: palette.brandBgSubtle,
    brandBorder: palette.brandBorderSubtle,
  },
  spacing: {
    none: 0,
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 40,
    '-xs': -4,
    '-s': -8,
    '-m': -16,
    '-l': -24,
    '-xl': -40,
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
      fontSize: 28,
      lineHeight: 34,
      color: 'primaryText',
    },
    title: {
      fontWeight: '600',
      fontSize: 20,
      lineHeight: 26,
      color: 'primaryText',
    },
    subtitle: {
      fontWeight: '500',
      fontSize: 16,
      lineHeight: 22,
      color: 'secondaryText',
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: 'primaryText',
    },
    bodySecondary: {
      fontSize: 13,
      lineHeight: 18,
      color: 'secondaryText',
    },
    button: {
      fontWeight: '600',
      fontSize: 15,
      textAlign: 'center',
    },
    badge: {
      fontWeight: '600',
      fontSize: 12,
      textAlign: 'center',
    },
    error: {
      fontSize: 12,
      color: 'errorText',
    },
    // Large KPI numeric display (28px bold)
    kpi: {
      fontWeight: 'bold',
      fontSize: 28,
      lineHeight: 34,
      color: 'primaryText',
    },
    // Extra-small label / badge caption (11px)
    caption: {
      fontSize: 11,
      lineHeight: 16,
      color: 'secondaryText',
    },
    defaults: {
      fontSize: 15,
      color: 'primaryText',
    },
  },
});

export const darkTheme = {
  ...theme,
  colors: {
    ...theme.colors,
    mainBackground: palette.slate900,
    secondaryBackground: palette.slate800,
    cardBackground: palette.slate800,
    primaryText: palette.pureWhite,
    secondaryText: palette.slate400,
    borderColor: palette.slate700,
    primaryButton: palette.brandAccent,
    secondaryButton: palette.slate700,
    secondaryButtonText: palette.slate200,
    // brand purple stays vivid in dark mode
    brand: palette.brand,
    brandBg: 'rgba(90, 49, 244, 0.12)',
    brandBorder: 'rgba(90, 49, 244, 0.25)',
  },
};

export type Theme = typeof theme;
