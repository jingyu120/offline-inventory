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

// On web, NetInfo defaults to polling `HEAD /` to probe internet reachability,
// which floods the network tab with (repeatedly aborted) requests every poll
// cycle. This app only consumes `isConnected`/`type` (never `isInternetReachable`),
// and `isConnected` still tracks `navigator.onLine` without the probe — so disable
// the active reachability check entirely.
NetInfo.configure({ reachabilityShouldRun: () => false });

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

// ── SSE Real-Time Invalidations listener ──
import { syncData } from '../syncEngine';
import { SYNC_API_URL } from '../../../config/appConfig';

let currentEventSource: EventSource | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

function connectSSE() {
  if (currentEventSource || reconnectTimeout) return;
  if (typeof EventSource === 'undefined') {
    console.warn('[SSE] EventSource is not defined in this environment.');
    return;
  }

  const url = `${SYNC_API_URL}/live-invalidations`;

  try {
    const es = new EventSource(url);
    currentEventSource = es;

    es.onopen = () => {
      // Connection established; no action required beyond keeping the stream open.
    };

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        if (payload.table) {
          syncData(payload.table).catch((err) => {
            console.error('[SSE] Targeted sync failed:', err);
          });
        }
      } catch (err) {
        console.error('[SSE] Failed to parse event data:', err);
      }
    };

    es.onerror = (err) => {
      console.warn(
        '[SSE] EventSource connection error, closing and scheduling reconnect:',
        err,
      );
      disconnectSSE();

      // Only reconnect if still online and not degraded
      const currentQuality = getActiveNetworkQuality();
      if (currentQuality.isConnected && !currentQuality.isDegraded) {
        reconnectTimeout = setTimeout(() => {
          reconnectTimeout = null;
          connectSSE();
        }, 5000);
      }
    };
  } catch (err) {
    console.error('[SSE] Failed to create EventSource:', err);
  }
}

function disconnectSSE() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (currentEventSource) {
    try {
      currentEventSource.close();
    } catch {
      // ignore close errors on shutdown
    }
    currentEventSource = null;
  }
}

// Subscribe to network quality transitions
NetworkQualityObserver.subscribe((quality) => {
  const isOnlineAndNotDegraded = quality.isConnected && !quality.isDegraded;
  if (isOnlineAndNotDegraded) {
    connectSSE();
  } else {
    disconnectSSE();
  }
});
