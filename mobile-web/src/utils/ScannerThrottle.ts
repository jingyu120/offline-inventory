import { Alert } from 'react-native';

class ScannerThrottle {
  private lastScanTime = 0;
  private lastBarcode = '';
  private throttleWindowMs = 750;

  /**
   * Process a barcode scan.
   * Returns true if the scan is allowed, false if it is throttled.
   */
  public processScan(barcode: string): boolean {
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
      this.triggerAlert();
      return false;
    }

    this.lastBarcode = cleanBarcode;
    this.lastScanTime = now;
    return true;
  }

  private triggerAlert() {
    // Audio alert
    try {
      if (typeof window !== 'undefined' && window.AudioContext) {
        const audioCtx = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 note
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15); // 150ms beep
      }
    } catch (e) {
      console.warn('Failed to play audio alert', e);
    }

    // Visual Alert using Alert
    Alert.alert(
      'Duplicate Scan Blocked',
      'Please wait a moment before scanning the same barcode again.',
    );
  }
}

export const scannerThrottle = new ScannerThrottle();
