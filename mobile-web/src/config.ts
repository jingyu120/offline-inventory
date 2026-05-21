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
