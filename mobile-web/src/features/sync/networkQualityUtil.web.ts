export async function isNetworkDegraded(): Promise<boolean> {
  const isMockDegraded = (global as any).__mockNetworkDegraded === true;
  if (isMockDegraded) return true;

  const conn =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;
  if (conn) {
    if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
      return true;
    }
  }
  return false;
}
