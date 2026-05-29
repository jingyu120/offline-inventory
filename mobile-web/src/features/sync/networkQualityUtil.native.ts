import NetInfo from '@react-native-community/netinfo';

export async function isNetworkDegraded(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    const is2G =
      state.type === 'cellular' && state.details?.cellularGeneration === '2g';
    const isMockDegraded = (global as any).__mockNetworkDegraded === true;
    return is2G || isMockDegraded;
  } catch (err) {
    console.warn(
      '[NetworkQuality] Failed to check network state, assuming not degraded:',
      err,
    );
    return (global as any).__mockNetworkDegraded === true;
  }
}
