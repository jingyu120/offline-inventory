import { useState, useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import axios from 'axios';
import { trpcClient } from '../../../core/trpc/trpcClient';
import {
  AI_ANALYZE_SENTIMENT_URL,
  SYNC_API_URL,
} from '../../../config/appConfig';
import { tileDb } from '../../../core/database/tileDb';
import {
  fetchRegions,
  fetchAllItems,
  fetchShops,
  fetchInteractionLogs,
  fetchAllInteractionItems,
  fetchShopDetails,
} from '../../../core/data/repositories';
import {
  Region,
  Item,
  InteractionLog,
  InteractionItem,
  Contact,
} from '@burma-inventory/shared-types';
import { useAuth } from '../../../core/auth/auth';

export interface ProcessedShop {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  regionId: string;
  assignedRepId?: string;
  lifetimeValue: number;
  sentimentTrend: string;
  lastContactDate?: Date;
  logs: InteractionLog[];
}

export const useGeographicHeatmapData = () => {
  const { activeRep } = useAuth();
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<ProcessedShop[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [rawInteractionItems, setRawInteractionItems] = useState<
    InteractionItem[]
  >([]);

  // Filter States
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedRep, setSelectedRep] = useState('');
  const [selectedSku, setSelectedSku] = useState('');
  const [neglectedOnly, setNeglectedOnly] = useState(false);

  // Selected Shop Panel States
  const [selectedShop, setSelectedShop] = useState<ProcessedShop | null>(null);
  const [shopContacts, setShopContacts] = useState<Contact[]>([]);
  const [loadingSentiment, setLoadingSentiment] = useState(false);
  const [sentimentResult, setSentimentResult] = useState<{
    sentimentTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    explanation: string;
  } | null>(null);

  // Caching States
  const [isCaching, setIsCaching] = useState(false);
  const [cacheProgress, setCacheProgress] = useState(0);
  const [cacheTotal, setCacheTotal] = useState(0);

  const lon2tile = (lon: number, zoom: number) => {
    return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
  };

  const lat2tile = (lat: number, zoom: number) => {
    return Math.floor(
      ((1 -
        Math.log(
          Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180),
        ) /
          Math.PI) /
        2) *
        Math.pow(2, zoom),
    );
  };

  const preCacheOfflineMap = async () => {
    if (Platform.OS !== 'web') {
      console.warn('Map caching is only supported on Web platform.');
      return;
    }
    if (isCaching) return;
    setIsCaching(true);
    setCacheProgress(0);

    const locations = [
      { name: 'Yangon', lat: 16.8409, lon: 96.1735 },
      { name: 'Mandalay', lat: 21.9588, lon: 96.0891 },
      { name: 'Taunggyi', lat: 20.7888, lon: 97.0337 },
    ];

    const zooms = [6, 7, 8, 11, 12];
    const tileRequests: { z: number; x: number; y: number }[] = [];

    // Build unique tile list to download
    locations.forEach((loc) => {
      zooms.forEach((z) => {
        const cx = lon2tile(loc.lon, z);
        const cy = lat2tile(loc.lat, z);
        // 3x3 grid centered around the city tile
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const x = cx + dx;
            const y = cy + dy;
            if (
              !tileRequests.some((t) => t.z === z && t.x === x && t.y === y)
            ) {
              tileRequests.push({ z, x, y });
            }
          }
        }
      });
    });

    setCacheTotal(tileRequests.length);

    let completed = 0;

    for (const tile of tileRequests) {
      const url = `${SYNC_API_URL}/tiles/${tile.z}/${tile.x}/${tile.y}.png`;
      const key = `tile-${tile.z}-${tile.x}-${tile.y}`;

      try {
        const response = await fetch(url, { mode: 'cors' });
        if (response.ok) {
          const blob = await response.blob();
          const reader = new FileReader();
          await new Promise<void>((resolve, reject) => {
            reader.onloadend = async () => {
              try {
                await tileDb.set(key, reader.result as string);
                resolve();
              } catch (e) {
                // Handle cache full or write failure gracefully
                reject(e);
              }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });
        }
      } catch (e) {
        console.warn(`Could not cache tile ${tile.z}/${tile.x}/${tile.y}:`, e);
      }

      completed++;
      setCacheProgress(completed);
    }

    setIsCaching(false);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const regionsList = await fetchRegions();
      setRegions(regionsList);

      const itemsList = await fetchAllItems();
      setItems(itemsList);

      let shopsList = await fetchShops();
      if (activeRep.role === 'sales' && activeRep.regionId) {
        shopsList = shopsList.filter((s) => s.regionId === activeRep.regionId);
      }
      const logsList = await fetchInteractionLogs();
      const interactionItemsList = await fetchAllInteractionItems();

      setRawInteractionItems(interactionItemsList);

      // Map logs to shopId
      const logsByShop = new Map<string, InteractionLog[]>();
      logsList.forEach((l) => {
        const arr = logsByShop.get(l.shopId) || [];
        arr.push(l);
        logsByShop.set(l.shopId, arr);
      });

      // Process shops with last contact date and logs
      const processed: ProcessedShop[] = shopsList.map((shop) => {
        const shopLogs = logsByShop.get(shop.id) || [];
        const sortedLogs = [...shopLogs].sort(
          (a, b) => b.createdAtLocal - a.createdAtLocal,
        );
        const lastContactDateNum = sortedLogs[0]?.createdAtLocal;
        const lastContactDate = lastContactDateNum
          ? new Date(lastContactDateNum)
          : undefined;

        return {
          id: shop.id,
          name: shop.name,
          address: shop.address,
          latitude: shop.latitude ?? undefined,
          longitude: shop.longitude ?? undefined,
          regionId: shop.regionId,
          assignedRepId: shop.assignedRepId ?? undefined,
          lifetimeValue: shop.lifetimeValue,
          sentimentTrend: shop.sentimentTrend,
          lastContactDate,
          logs: sortedLogs,
        };
      });

      setShops(processed);
    } catch (e) {
      console.error('Failed to load map data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeRep.id]);

  // Filter Logic
  const getFilteredShops = () => {
    let result = [...shops];

    if (selectedRegion) {
      result = result.filter((s) => s.regionId === selectedRegion);
    }

    if (selectedRep) {
      result = result.filter((s) => s.assignedRepId === selectedRep);
    }

    if (selectedSku) {
      const matchingLogIds = new Set(
        rawInteractionItems
          .filter((ii) => ii.itemId === selectedSku)
          .map((ii) => ii.interactionLogId),
      );
      result = result.filter((s) =>
        s.logs.some((log) => matchingLogIds.has(log.id)),
      );
    }

    if (neglectedOnly) {
      result = result.filter((s) => {
        if (!s.lastContactDate) return true;
        const diff = new Date().getTime() - s.lastContactDate.getTime();
        const diffInDays = diff / (1000 * 3600 * 24);
        return diffInDays > 14;
      });
    }

    return result;
  };

  // Handle Marker Selection & Sentiment Analysis
  const handleShopSelect = async (shop: ProcessedShop) => {
    setSelectedShop(shop);
    setSentimentResult(null);
    setLoadingSentiment(true);

    try {
      const { contacts } = await fetchShopDetails(shop.id);
      setShopContacts(contacts);

      const notes = shop.logs.map((l) => l.notes).filter(Boolean);
      const response = await trpcClient.analyzeSentiment.mutate({ notes });
      setSentimentResult(response);
    } catch (e) {
      console.error(
        'Failed to analyze sentiment, falling back to database cached trend:',
        e,
      );
      setSentimentResult({
        sentimentTrend: shop.sentimentTrend as any,
        explanation:
          'Failed to query live Gemma 4 sentiment server. Displaying database default cached trend.',
      });
    } finally {
      setLoadingSentiment(false);
    }
  };

  const filteredShops = useMemo(() => {
    return getFilteredShops();
  }, [
    shops,
    selectedRegion,
    selectedRep,
    selectedSku,
    rawInteractionItems,
    neglectedOnly,
  ]);

  return {
    loading,
    shops,
    regions,
    items,
    rawInteractionItems,
    selectedRegion,
    setSelectedRegion,
    selectedRep,
    setSelectedRep,
    selectedSku,
    setSelectedSku,
    neglectedOnly,
    setNeglectedOnly,
    selectedShop,
    setSelectedShop,
    shopContacts,
    loadingSentiment,
    sentimentResult,
    loadData,
    filteredShops,
    handleShopSelect,
    isCaching,
    cacheProgress,
    cacheTotal,
    preCacheOfflineMap,
  };
};
export type UseGeographicHeatmapDataReturn = ReturnType<
  typeof useGeographicHeatmapData
>;
