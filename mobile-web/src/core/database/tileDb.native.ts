import { open } from '@op-engineering/op-sqlite';

let mbtilesDb: $Any = null;
try {
  mbtilesDb = open({
    name: 'map_tiles.mbtiles',
  });
} catch (e) {
  console.warn('Failed to open map_tiles.mbtiles SQLite database:', e);
}

// Simple base64 utility for Uint8Array
function Uint8ArrayToBase64(arr: Uint8Array): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  const l = arr.length;
  for (let i = 0; i < l; i += 3) {
    const b1 = arr[i];
    const b2 = i + 1 < l ? arr[i + 1] : NaN;
    const b3 = i + 2 < l ? arr[i + 2] : NaN;

    const c1 = b1 >> 2;
    const c2 = ((b1 & 3) << 4) | (isNaN(b2) ? 0 : b2 >> 4);
    const c3 = isNaN(b2) ? 64 : ((b2 & 15) << 2) | (isNaN(b3) ? 0 : b3 >> 6);
    const c4 = isNaN(b3) ? 64 : b3 & 63;

    result +=
      chars.charAt(c1) +
      chars.charAt(c2) +
      (c3 === 64 ? '=' : chars.charAt(c3)) +
      (c4 === 64 ? '=' : chars.charAt(c4));
  }
  return result;
}

export const tileDb = {
  get: async (key: string): Promise<string | null> => {
    if (!mbtilesDb) return null;

    // key is formatted as "tile-z-x-y"
    const match = key.match(/^tile-(\d+)-(\d+)-(\d+)$/);
    if (!match) return null;

    const z = parseInt(match[1], 10);
    const x = parseInt(match[2], 10);
    const y = parseInt(match[3], 10);

    // MBTiles tile_row is y-inverted: (2^z - 1) - y
    const tileRow = Math.pow(2, z) - 1 - y;

    try {
      const result = await mbtilesDb.execute(
        'SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?;',
        [z, x, tileRow],
      );
      if (result.rows && result.rows.length > 0) {
        const row = result.rows.item(0);
        const blob = row.tile_data;
        if (typeof blob === 'string') {
          return blob.startsWith('data:')
            ? blob
            : `data:image/png;base64,${blob}`;
        } else if (blob instanceof Uint8Array) {
          const base64 = Uint8ArrayToBase64(blob);
          return `data:image/png;base64,${base64}`;
        }
      }
    } catch (err) {
      console.warn('Error reading tile from MBTiles database:', err);
    }
    return null;
  },
  set: async (_key: string, _value: string): Promise<void> => {
    // MBTiles is a read-only local store, so set is a no-op
    return;
  },
};
