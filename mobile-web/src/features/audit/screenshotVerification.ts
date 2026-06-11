import { API_BASE_URL } from '../../config/appConfig';
import { VerifyScreenshotResponse } from './types';

const VERIFY_SCREENSHOT_ENDPOINT = `${API_BASE_URL}/ai/verify-screenshot`;
const DATA_IMAGE_PREFIX = 'data:image/';
const BLOB_PREFIX = 'blob:';

/** Extract the raw base64 payload from a screenshot URI across web/native. */
export async function extractScreenshotBase64(uri: string): Promise<string> {
  if (uri.startsWith(DATA_IMAGE_PREFIX)) {
    return uri.split(',')[1];
  }

  if (uri.startsWith(BLOB_PREFIX)) {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  const FileSystem = await import('expo-file-system');
  return FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
}

/**
 * Send a base64 screenshot to the AI verification endpoint and return the
 * extracted OCR text. Returns null when the request is unsuccessful.
 */
export async function verifyScreenshot(base64: string): Promise<string | null> {
  const response = await fetch(VERIFY_SCREENSHOT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64 }),
  });

  if (!response.ok) {
    return null;
  }

  const data: VerifyScreenshotResponse = await response.json();
  return data.extractedText || '';
}
