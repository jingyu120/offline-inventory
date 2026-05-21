/**
 * sync.web.ts — Web platform sync stub.
 *
 * PowerSync sync is native-only. On web we provide no-op implementations so
 * the app compiles and runs without the React Native bridge.
 */

export async function syncData(): Promise<void> {
  // No-op on web — PowerSync replication only applies to native builds.
  console.info(
    '[Web] syncData() called — PowerSync sync is not available on web.',
  );
}

export const syncConnector = null;
