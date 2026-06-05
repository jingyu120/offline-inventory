import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkQuality {
  isConnected: boolean;
  type: string;
  isDegraded: boolean;
}

let activeNetworkQuality: NetworkQuality = {
  isConnected: true,
  type: 'unknown',
  isDegraded: false,
};

const networkListeners = new Set<(quality: NetworkQuality) => void>();

const updateNetworkQuality = (state: NetInfoState) => {
  const is2G =
    state.type === 'cellular' && state.details?.cellularGeneration === '2g';
  const isMockDegraded = (global as $Any).__mockNetworkDegraded === true;

  activeNetworkQuality = {
    isConnected: state.isConnected ?? false,
    type: state.type,
    isDegraded: is2G || isMockDegraded,
  };
  networkListeners.forEach((listener) => {
    try {
      listener(activeNetworkQuality);
    } catch (e) {
      console.error('Error in NetworkQualityObserver listener callback:', e);
    }
  });
};

// Initialize NetInfo listener at the module level
NetInfo.fetch()
  .then(updateNetworkQuality)
  .catch((err) => console.error('[NetworkQuality] Initial fetch failed:', err));
NetInfo.addEventListener(updateNetworkQuality);

export function getActiveNetworkQuality(): NetworkQuality {
  return activeNetworkQuality;
}

export const NetworkQualityObserver = {
  subscribe(callback: (quality: NetworkQuality) => void): () => void {
    networkListeners.add(callback);
    callback(activeNetworkQuality);
    return () => {
      networkListeners.delete(callback);
    };
  },
};

export function useNetworkQuality(): NetworkQuality {
  const [quality, setQuality] = useState<NetworkQuality>(activeNetworkQuality);

  useEffect(() => {
    return NetworkQualityObserver.subscribe((newQuality) => {
      setQuality(newQuality);
    });
  }, []);

  return quality;
}
