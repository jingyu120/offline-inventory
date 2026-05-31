export async function isNetworkDegraded(): Promise<boolean> {
  const isMockDegraded = (global as $Any).__mockNetworkDegraded === true;
  if (isMockDegraded) return true;

  const conn =
    (navigator as $Any).connection ||
    (navigator as $Any).mozConnection ||
    (navigator as $Any).webkitConnection;
  if (conn) {
    if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
      return true;
    }
  }
  return false;
}
