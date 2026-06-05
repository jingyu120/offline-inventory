import { SCANNER_THROTTLE_CONFIG } from '../../config/appConfig';
import { Alert } from 'react-native';

class ScannerThrottle {
  private lastScanTime = 0;
  private lastBarcode = '';
  private throttleWindowMs = SCANNER_THROTTLE_CONFIG.throttleWindowMs;

  /**
   * Process a barcode scan.
   * Returns true if the scan is allowed, false if it is throttled.
   */
  public processScan(barcode: string, t?: (key: $Any) => string): boolean {
    const now = Date.now();
    const cleanBarcode = barcode.trim();

    if (!cleanBarcode) return false;

    if (
      cleanBarcode === this.lastBarcode &&
      now - this.lastScanTime < this.throttleWindowMs
    ) {
      console.warn(
        `ScannerThrottle: Blocked duplicate scan for barcode: "${cleanBarcode}"`,
      );
      this.triggerAlert(t);
      return false;
    }

    this.lastBarcode = cleanBarcode;
    this.lastScanTime = now;
    return true;
  }

  private triggerAlert(t?: (key: $Any) => string) {
    // Audio alert
    try {
      if (typeof window !== 'undefined' && window.AudioContext) {
        const audioCtx = new (window.AudioContext ||
          (window as $Any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(
          SCANNER_THROTTLE_CONFIG.frequency,
          audioCtx.currentTime,
        ); // A4 note
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        gainNode.gain.setValueAtTime(
          SCANNER_THROTTLE_CONFIG.gain,
          audioCtx.currentTime,
        );
        oscillator.start();
        oscillator.stop(
          audioCtx.currentTime + SCANNER_THROTTLE_CONFIG.duration,
        ); // 150ms beep
      }
    } catch (e) {
      console.warn('Failed to play audio alert', e);
    }

    // Visual Alert using Alert
    const alertTitle = t ? t('duplicateScanBlocked') : 'Duplicate Scan Blocked';
    const alertDesc = t
      ? t('duplicateScanBlockedDesc')
      : 'Please wait a moment before scanning the same barcode again.';
    Alert.alert(alertTitle, alertDesc);
  }
}

export const scannerThrottle = new ScannerThrottle();
