const DEFAULT_API_BASE = 'http://localhost:3000/api';

// Support both Metro's process.env and general env variables
const getApiBaseUrl = (): string => {
  const envUrl =
    process.env['SYNC_API_URL'] || process.env['EXPO_PUBLIC_SYNC_API_URL'];
  if (envUrl) {
    // Strip trailing /sync if the user provided the full sync URL as the base sync env
    return envUrl.endsWith('/sync') ? envUrl.replace(/\/sync$/, '') : envUrl;
  }
  return DEFAULT_API_BASE;
};

export const API_BASE_URL = getApiBaseUrl();
export const SYNC_API_URL = `${API_BASE_URL}/sync`;
export const AI_PARSE_NOTE_URL = `${API_BASE_URL}/ai/parse-note`;
export const AI_ANALYZE_SENTIMENT_URL = `${API_BASE_URL}/ai/analyze-sentiment`;
export const AI_EOD_DIGEST_URL = `${API_BASE_URL}/ai/eod-digest`;
export const AI_QUOTAS_OPTIMIZATIONS_URL = `${API_BASE_URL}/ai/quota-optimizations`;
export const AI_OCR_INVOICE_URL = `${API_BASE_URL}/ai/ocr-invoice`;

export interface ScreenConfig {
  value: 'ledger' | 'heatmap' | 'leadership' | 'intake' | 'viber-bot';
  labelKey: string;
  icon: string;
}

export interface CommercialStatusConfig {
  value: string;
  labelKey: string;
  badgeBg:
    | 'successBg'
    | 'warningBg'
    | 'dangerBg'
    | 'infoBg'
    | 'secondaryBackground';
  badgeColor:
    | 'successText'
    | 'warningText'
    | 'dangerText'
    | 'infoText'
    | 'secondaryText';
}

export interface InteractionTypeConfig {
  value: string;
  labelKey: string;
}

export interface CurrencyConfig {
  value: string;
  label: string;
  symbol: string;
  defaultRateToMmk: number;
}

export interface RecencyConfig {
  hoursMax?: number;
  daysMax?: number;
  color: string;
  labelKey: string;
}

export interface SkuMetricConfig {
  label: string;
  value: number;
  themeColorKey: 'primaryButton' | 'success' | 'warning';
  trendKey: string;
  probability: number;
}

// 1. Roles and Screens configuration
export const ROLE_SCREENS: Record<
  string,
  ('ledger' | 'heatmap' | 'leadership' | 'intake' | 'viber-bot')[]
> = {
  sales: ['ledger'],
  manager: ['heatmap', 'leadership'],
  intake: ['intake'],
  admin: ['ledger', 'heatmap', 'leadership', 'intake', 'viber-bot'],
};

export const SCREENS: ScreenConfig[] = [
  { value: 'ledger', labelKey: 'shopLedger', icon: '📋' },
  { value: 'heatmap', labelKey: 'geographicHeatmap', icon: '🗺️' },
  { value: 'leadership', labelKey: 'leadershipOversight', icon: '📊' },
  { value: 'intake', labelKey: 'intake', icon: '📦' },
  { value: 'viber-bot', labelKey: 'orderDrafter', icon: '💬' },
];

// 2. Commercial Status configurations
export const COMMERCIAL_STATUSES: CommercialStatusConfig[] = [
  {
    value: 'FOLLOWED_UP',
    labelKey: 'statusFollowedUp',
    badgeBg: 'secondaryBackground',
    badgeColor: 'secondaryText',
  },
  {
    value: 'INTERESTED',
    labelKey: 'statusInterested',
    badgeBg: 'infoBg',
    badgeColor: 'infoText',
  },
  {
    value: 'ORDER_PLACED',
    labelKey: 'statusClosed',
    badgeBg: 'successBg',
    badgeColor: 'successText',
  },
  {
    value: 'NOT_INTERESTED',
    labelKey: 'statusNoDeal',
    badgeBg: 'dangerBg',
    badgeColor: 'dangerText',
  },
];

// 3. Interaction Type configurations
export const INTERACTION_TYPES: InteractionTypeConfig[] = [
  { value: 'SHOP_VISIT', labelKey: 'typeVisit' },
  { value: 'PHONE_CALL', labelKey: 'phone' },
  { value: 'VIBER', labelKey: 'Viber' }, // Falls back directly to 'Viber' label
  { value: 'STOCK_DELIVERY', labelKey: 'typeOrder' },
  { value: 'PAYMENT_COLLECTION', labelKey: 'typeCollection' },
];

// 4. Currency configurations
export const CURRENCIES: CurrencyConfig[] = [
  { value: 'MMK', label: 'MMK', symbol: 'Ks', defaultRateToMmk: 1 },
  { value: 'USD', label: 'USD', symbol: '$', defaultRateToMmk: 2100 },
  { value: 'THB', label: 'THB', symbol: '฿', defaultRateToMmk: 58.5 },
];

// 5. Map Recency Rules (Geographic Heatmap markers)
export const RECENCY_CONFIGS: RecencyConfig[] = [
  { hoursMax: 48, color: '#22C55E', labelKey: 'activeContact' }, // Bright Green
  { daysMax: 7, color: '#4ADE80', labelKey: 'recentContact' }, // Faded Green
  { daysMax: 14, color: '#EAB308', labelKey: 'warningContact' }, // Yellow Warning
  { color: '#FF3B30', labelKey: 'neglectedContact' }, // Red Neglected
];

// 6. SKU metrics (Mock and dashboard display)
export const SKU_METRICS: SkuMetricConfig[] = [
  {
    label: 'Premium Beer 640ml',
    value: 85,
    themeColorKey: 'primaryButton',
    trendKey: 'trendSummerPeak',
    probability: 85,
  },
  {
    label: 'Classic Cider 500ml',
    value: 60,
    themeColorKey: 'success',
    trendKey: 'trendStableYearRound',
    probability: 60,
  },
  {
    label: 'Special Stout 320ml',
    value: 45,
    themeColorKey: 'warning',
    trendKey: 'trendRainySpike',
    probability: 40,
  },
];

export interface ScannerThrottleConfig {
  throttleWindowMs: number;
  gain: number;
  frequency: number;
  duration: number;
}

export interface SyncConfig {
  dbChunkSize: number;
}

export const SCANNER_THROTTLE_CONFIG: ScannerThrottleConfig = {
  throttleWindowMs: 750,
  gain: 0.1,
  frequency: 440,
  duration: 0.15,
};

export const SYNC_CONFIG: SyncConfig = {
  dbChunkSize: 100,
};
