import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkQuality {
  isConnected: boolean;
  type: string;
  isDegraded: boolean;
}

export function useNetworkQuality(): NetworkQuality {
  const [quality, setQuality] = useState<NetworkQuality>({
    isConnected: true,
    type: 'unknown',
    isDegraded: false,
  });

  useEffect(() => {
    // 1. Fetch initial network state
    NetInfo.fetch().then((state: NetInfoState) => {
      const is2G =
        state.type === 'cellular' && state.details?.cellularGeneration === '2g';
      const isMockDegraded = (global as any).__mockNetworkDegraded === true;

      setQuality({
        isConnected: state.isConnected ?? false,
        type: state.type,
        isDegraded: is2G || isMockDegraded,
      });
    });

    // 2. Subscribe to changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const is2G =
        state.type === 'cellular' && state.details?.cellularGeneration === '2g';
      const isMockDegraded = (global as any).__mockNetworkDegraded === true;

      setQuality({
        isConnected: state.isConnected ?? false,
        type: state.type,
        isDegraded: is2G || isMockDegraded,
      });
    });

    return unsubscribe;
  }, []);

  return quality;
}
