import { Platform } from 'react-native';

class TileDb {
  private db: any = null;

  private async init(): Promise<any> {
    if (
      Platform.OS !== 'web' ||
      typeof window === 'undefined' ||
      !window.indexedDB
    ) {
      return null;
    }
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open('tile-cache-db', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('tiles')) {
          db.createObjectStore('tiles');
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async get(key: string): Promise<string | null> {
    if (
      Platform.OS !== 'web' ||
      typeof window === 'undefined' ||
      !window.indexedDB
    ) {
      return null;
    }
    try {
      const db = await this.init();
      if (!db) return null;

      return new Promise((resolve) => {
        const transaction = db.transaction('tiles', 'readonly');
        const store = transaction.objectStore('tiles');
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      console.warn('IndexedDB get error:', e);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    if (
      Platform.OS !== 'web' ||
      typeof window === 'undefined' ||
      !window.indexedDB
    ) {
      return;
    }
    try {
      const db = await this.init();
      if (!db) return;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction('tiles', 'readwrite');
        const store = transaction.objectStore('tiles');
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('IndexedDB set error:', e);
    }
  }
}

export const tileDb = new TileDb();
