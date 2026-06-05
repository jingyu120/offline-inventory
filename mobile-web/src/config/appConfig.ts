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

// 7. Inventory and Viber simulator config
export const LOW_STOCK_THRESHOLD = 50;
export const STOCK_ADJUSTMENT_INCREMENT = 10;

// Combined Viber Configuration Group
export const VIBER_CONFIG = {
  BRAND_TOKENS: ['shera', 'gator', 'karat', 'vrh', 'scg', 'knauf'] as string[],
  SPEC_TOKENS: [
    '6mm',
    '8mm',
    '9mm',
    '1/2',
    'cement',
    'gypsum',
    'pvc',
  ] as string[],
  SCORING_WEIGHTS: {
    BRAND: 10,
    SPEC: 5,
    GENERIC: 1,
  },
  KNOWN_UNITS: [
    'pcs',
    'pc',
    'pk',
    'bags',
    'bag',
    'pal',
    'units',
    'unit',
  ] as string[],
  SIMULATOR_LOG_TYPES: ['PHONE_CALL', 'VIBER', 'SHOP_VISIT'] as string[],
  OVERRIDE_MARGIN_LIMIT_FACTOR: 0.85,
};

export const VIBER_BRAND_TOKENS = VIBER_CONFIG.BRAND_TOKENS;
export const VIBER_SPEC_TOKENS = VIBER_CONFIG.SPEC_TOKENS;
export const VIBER_SCORING_WEIGHTS = VIBER_CONFIG.SCORING_WEIGHTS;
export const VIBER_KNOWN_UNITS = VIBER_CONFIG.KNOWN_UNITS;
export const VIBER_SIMULATOR_LOG_TYPES = VIBER_CONFIG.SIMULATOR_LOG_TYPES;
export const OVERRIDE_MARGIN_LIMIT_FACTOR =
  VIBER_CONFIG.OVERRIDE_MARGIN_LIMIT_FACTOR;

// 8. Representative configuration list and mappers
export interface RepresentativeConfig {
  id: string;
  name: string;
  territory: string;
}

export const REPRESENTATIVES: RepresentativeConfig[] = [
  { id: 'rep-1', name: 'Ko Min', territory: 'Yangon' },
  { id: 'rep-2', name: 'Ko Hla', territory: 'Mandalay/Shan' },
];

export const getRepresentativeName = (repId: string): string => {
  const rep = REPRESENTATIVES.find((r) => r.id === repId);
  return rep ? rep.name : repId;
};

export const getLogTypeLabel = (
  logType: string,
  t: (key: $Any) => string,
): string => {
  const config = INTERACTION_TYPES.find((it) => it.value === logType);
  if (config) {
    return config.labelKey === 'Viber' ? 'Viber' : t(config.labelKey);
  }
  return logType.replaceAll('_', ' ');
};

// 9. Unified Inventory Status configuration
export const INVENTORY_STATUS = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  AVAILABLE: 'AVAILABLE',
  COMMITTED: 'COMMITTED',
  SOLD: 'SOLD',
} as const;

export type InventoryStatus =
  (typeof INVENTORY_STATUS)[keyof typeof INVENTORY_STATUS];

// Combined GPS and Geofencing Configuration Group
export const GPS_CONFIG = {
  FALLBACK_COORDS: { latitude: 16.8661, longitude: 96.1951 },
  GEOFENCE_RADIUS_AUDIT_METERS: 100,
  GEOFENCE_RADIUS_INTAKE_METERS: 100,
  GEOFENCE_RADIUS_CHECKIN_METERS: 500,
  SIMULATED_NEARBY_OFFSET: 0.001,
  SIMULATED_FAR_OFFSET: 0.03,
  VERIFIED_REWARD_POINTS: 50,
  STREAK_DAYS_INCREMENT: 1,
  FIRST_TIME_BADGE: 'First Check-in',
  WAREHOUSE_COORDS: {
    'loc-yangon-wh': { latitude: 16.8661, longitude: 96.1951 },
    'loc-mandalay-wh': { latitude: 21.9754, longitude: 96.0838 },
  } as Record<string, { latitude: number; longitude: number }>,
};

// 10. Centralized Geofencing Radii
export const GEOFENCE_RADIUS_AUDIT_METERS =
  GPS_CONFIG.GEOFENCE_RADIUS_AUDIT_METERS;
export const GEOFENCE_RADIUS_INTAKE_METERS =
  GPS_CONFIG.GEOFENCE_RADIUS_INTAKE_METERS;
export const GEOFENCE_RADIUS_CHECKIN_METERS =
  GPS_CONFIG.GEOFENCE_RADIUS_CHECKIN_METERS;

// 13. Warehouse Coordinates configuration
export const WAREHOUSE_COORDS = GPS_CONFIG.WAREHOUSE_COORDS;

// 12. GPS Check-in Simulation & Reward configurations
export interface GpsCheckInConfig {
  fallbackLatitude: number;
  fallbackLongitude: number;
  simulatedNearbyOffset: number;
  simulatedFarOffset: number;
  verifiedRewardPoints: number;
  streakDaysIncrement: number;
  firstTimeBadge: string;
}

export const GPS_CHECK_IN_CONFIG: GpsCheckInConfig = {
  fallbackLatitude: GPS_CONFIG.FALLBACK_COORDS.latitude,
  fallbackLongitude: GPS_CONFIG.FALLBACK_COORDS.longitude,
  simulatedNearbyOffset: GPS_CONFIG.SIMULATED_NEARBY_OFFSET,
  simulatedFarOffset: GPS_CONFIG.SIMULATED_FAR_OFFSET,
  verifiedRewardPoints: GPS_CONFIG.VERIFIED_REWARD_POINTS,
  streakDaysIncrement: GPS_CONFIG.STREAK_DAYS_INCREMENT,
  firstTimeBadge: GPS_CONFIG.FIRST_TIME_BADGE,
};

// Combined AI & Vision Configuration Group
export const AI_VISION_CONFIG = {
  IMAGE_UPLOAD: {
    resizeWidth: 1080,
    quality: 0.7,
    format: 'jpeg' as 'jpeg' | 'png',
  },
  OCR_MOCK_HEURISTIC: {
    ocrTriggerWords: ['5', 'premium'] as string[],
    targetNameToken: 'premium',
    targetSkuToken: 'pb-640',
    targetQty: 5,
  },
};

// 11. Image Upload & Compression configuration
export interface ImageUploadConfig {
  resizeWidth: number;
  quality: number;
  format: 'jpeg' | 'png';
}

export const IMAGE_UPLOAD_CONFIG: ImageUploadConfig =
  AI_VISION_CONFIG.IMAGE_UPLOAD;

// 15. OCR Mock Validation Heuristics configuration
export interface OcrMockHeuristicRule {
  ocrTriggerWords: string[];
  targetNameToken: string;
  targetSkuToken: string;
  targetQty: number;
}

export const OCR_MOCK_HEURISTIC: OcrMockHeuristicRule =
  AI_VISION_CONFIG.OCR_MOCK_HEURISTIC;

// 16. Mock Project Capital Configurations
export interface MockProjectCapitalConfig {
  projectName: string;
  capitalValue: string;
}

export const MOCK_PROJECT_CAPITALS: MockProjectCapitalConfig[] = [
  { projectName: 'Galaxy Tower-3', capitalValue: 'K150,000,000' },
  { projectName: 'Zaw Residence', capitalValue: 'K85,000,000' },
];

// 18. Default Design Tile Patterns configuration
export interface DesignPatternConfig {
  id: string;
  name: string;
  brand: string;
  brandId: string;
  description: string;
  gradient: string[];
}

export const DEFAULT_PATTERNS: DesignPatternConfig[] = [
  {
    id: 'shera-wood-classic',
    name: 'Shera Wood Classic',
    brand: 'Shera',
    brandId: 'brand-shera',
    description:
      'Vibrant, durable teak woodgrain texture for natural rustic siding.',
    gradient: ['#F59E0B', '#B45309'],
  },
  {
    id: 'scg-smart-board-modern',
    name: 'SCG Plank Modern',
    brand: 'SCG Smart Board',
    brandId: 'brand-scg',
    description:
      'Sleek, minimalist smooth fiber cement surface for clean siding.',
    gradient: ['#6366F1', '#4F46E5'],
  },
  {
    id: 'knauf-gypsum-standard',
    name: 'Knauf Ceiling Standard',
    brand: 'Knauf',
    brandId: 'brand-knauf',
    description: 'High-performance gypsum panel for ceiling sound dampening.',
    gradient: ['#3B82F6', '#1D4ED8'],
  },
  {
    id: 'karat-ceramic-elegance',
    name: 'Karat Ceramic Elegance',
    brand: 'Karat',
    brandId: 'brand-karat',
    description:
      'Stunning premium glazed ceramic tiles for walls and bathroom interiors.',
    gradient: ['#10B981', '#047857'],
  },
  {
    id: 'gator-heavy-board',
    name: 'Gator Heavy Board',
    brand: 'Gator',
    brandId: 'brand-gator',
    description: 'Ultra-tough impact-resistant fiber cement sheeting.',
    gradient: ['#EC4899', '#BE185D'],
  },
];

// 19. Thermal Simulator status colors configurations
export const THERMAL_COLOR_TOKENS = {
  NOMINAL: 'success',
  FAIR: 'warning',
  SERIOUS: 'danger',
} as const;

export const THERMAL_CRITICAL_COLOR = '#7F1D1D';
