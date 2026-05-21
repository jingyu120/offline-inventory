import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Box, Text } from '@burma-inventory/ui-components';
import { useGeographicHeatmapData } from '../hooks/useGeographicHeatmapData';
import { MapFilterPanel } from './components/MapFilterPanel';
import { MapDetailPane } from './components/MapDetailPane';
import { useTranslation } from '../utils/i18n';
import { tileDb } from '../utils/tileDb';

// Helper to dynamically load Leaflet from CDN to avoid React 19 dependency conflicts
const loadLeaflet = (callback: () => void) => {
  if (Platform.OS !== 'web') {
    callback();
    return;
  }

  const windowAny = window as any;
  if (windowAny.L) {
    callback();
    return;
  }

  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }

  if (!document.getElementById('leaflet-js')) {
    const script = document.createElement('script');
    script.id = 'leaflet-js';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => callback();
    document.head.appendChild(script);
  } else {
    const interval = setInterval(() => {
      if (windowAny.L) {
        clearInterval(interval);
        callback();
      }
    }, 100);
  }
};

export const GeographicHeatmapScreen: React.FC = () => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const mapContainerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const {
    loading,
    shops,
    regions,
    items,
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
    filteredShops,
    handleShopSelect,
    isCaching,
    cacheProgress,
    cacheTotal,
    preCacheOfflineMap,
  } = useGeographicHeatmapData();

  // 1. Load Leaflet Asset Libraries
  useEffect(() => {
    loadLeaflet(() => {
      setLeafletLoaded(true);
    });
  }, []);

  // 2. Map Recency Rule Helpers
  const getRecencyColor = (lastContactDate?: Date) => {
    if (!lastContactDate) return '#FF3B30'; // Red - Neglected
    const diff = new Date().getTime() - new Date(lastContactDate).getTime();
    const diffInHours = diff / (1000 * 3600);
    const diffInDays = diff / (1000 * 3600 * 24);

    if (diffInHours < 48) return '#22C55E'; // Bright Green
    if (diffInDays < 7) return '#4ADE80'; // Faded Green
    if (diffInDays >= 8 && diffInDays <= 14) return '#EAB308'; // Yellow Warning
    return '#FF3B30'; // Red Neglected
  };

  const getBubbleRadius = (ltv: number) => {
    const base = 6;
    const bonus = Math.min(ltv / 2500, 18);
    return base + bonus;
  };

  // 3. Initialize Map Instance
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;

    const L = (window as any).L;

    // Custom Offline-First TileLayer checking IndexedDB base64 data URL
    const OfflineTileLayer = L.TileLayer.extend({
      createTile(coords: any, done: any) {
        const tile = document.createElement('img');
        const key = `tile-${coords.z}-${coords.x}-${coords.y}`;

        tileDb
          .get(key)
          .then((cached) => {
            if (cached) {
              tile.src = cached;
              done(null, tile);
            } else {
              tile.src = this.getTileUrl(coords);
              tile.onload = () => done(null, tile);
              tile.onerror = (err) => done(err, tile);
            }
          })
          .catch((err) => {
            console.warn('Failed to load tile from db:', err);
            tile.src = this.getTileUrl(coords);
            tile.onload = () => done(null, tile);
            tile.onerror = (e) => done(e, tile);
          });

        return tile;
      },
    });

    // Map setup centered on Myanmar (Yangon)
    const map = L.map(mapContainerRef.current).setView([16.8409, 96.1735], 12);

    new OfflineTileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [leafletLoaded]);

  // 4. Update Circle Markers on Filtered Shops Change
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current) return;
    const L = (window as any).L;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Plot new ones
    filteredShops.forEach((shop) => {
      if (!shop.latitude || !shop.longitude) return;

      const color = getRecencyColor(shop.lastContactDate);
      const radius = getBubbleRadius(shop.lifetimeValue);

      const marker = L.circleMarker([shop.latitude, shop.longitude], {
        radius,
        fillColor: color,
        color: '#ffffff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.85,
      }).addTo(mapRef.current);

      marker.on('click', () => {
        handleShopSelect(shop);
      });

      marker.bindTooltip(
        `<b>${shop.name}</b><br/>${t('lifetimeValue')}: K${shop.lifetimeValue.toLocaleString()}<br/>${t('sentimentTrend')}: ${shop.sentimentTrend}`,
        { direction: 'top', permanent: false },
      );

      markersRef.current.push(marker);
    });

    // Auto-bounds mapping coordinates
    const validCoords = filteredShops
      .filter((s) => s.latitude && s.longitude)
      .map((s) => [s.latitude, s.longitude]);

    if (validCoords.length > 0 && mapRef.current) {
      mapRef.current.fitBounds(validCoords, { padding: [30, 30] });
    }
  }, [filteredShops, leafletLoaded, t]);

  if (loading) {
    return (
      <Box
        flex={1}
        justifyContent="center"
        alignItems="center"
        bg="mainBackground"
      >
        <ActivityIndicator size="large" color="#4F46E5" />
      </Box>
    );
  }

  if (isDesktop) {
    // ─── Katana Desktop: Filter panel above, map + sidebar side-by-side ───
    return (
      <Box flex={1} p="m" bg="mainBackground">
        {/* Title Header */}
        <Box mb="m">
          <Text variant="header">{t('marketIntelHeatmap')}</Text>
          <Text variant="bodySecondary">
            {t('activeAccountsPlotting').replace(
              '{count}',
              filteredShops.length.toString(),
            )}
          </Text>
        </Box>

        {/* Strategic Filter Panel */}
        <MapFilterPanel
          regions={regions}
          items={items}
          selectedRegion={selectedRegion}
          setSelectedRegion={setSelectedRegion}
          selectedRep={selectedRep}
          setSelectedRep={setSelectedRep}
          selectedSku={selectedSku}
          setSelectedSku={setSelectedSku}
          neglectedOnly={neglectedOnly}
          setNeglectedOnly={setNeglectedOnly}
          isCaching={isCaching}
          cacheProgress={cacheProgress}
          cacheTotal={cacheTotal}
          preCacheOfflineMap={preCacheOfflineMap}
        />

        {/* Map + Side Panel Split View */}
        <Box flex={1} flexDirection="row" flexWrap="wrap">
          {/* Left Side: Map Block */}
          <Box
            flex={7}
            minWidth={350}
            height={500}
            style={{ position: 'relative' }}
          >
            {Platform.OS !== 'web' ? (
              <Box
                flex={1}
                justifyContent="center"
                alignItems="center"
                bg="secondaryBackground"
              >
                <Text variant="body">{t('heatmapWebOptimized')}</Text>
              </Box>
            ) : (
              <div
                ref={mapContainerRef}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '8px',
                  border: '1px solid #EAEAEA',
                }}
              />
            )}

            {/* Map Color Recency Legend */}
            <Box
              style={{
                position: 'absolute',
                bottom: 12,
                left: 12,
                backgroundColor: 'rgba(255,255,255,0.92)',
                padding: 10,
                borderRadius: 8,
                zIndex: 1000,
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              }}
            >
              <Text variant="bodySecondary" fontWeight="bold" mb="xs">
                {t('lastContactRecency')}
              </Text>
              <Box flexDirection="row" alignItems="center" mb="xs">
                <Box
                  width={12}
                  height={12}
                  bg="transparent"
                  style={{ backgroundColor: '#22C55E', borderRadius: 6 }}
                  mr="s"
                />
                <Text variant="bodySecondary">{t('activeContact')}</Text>
              </Box>
              <Box flexDirection="row" alignItems="center" mb="xs">
                <Box
                  width={12}
                  height={12}
                  bg="transparent"
                  style={{ backgroundColor: '#4ADE80', borderRadius: 6 }}
                  mr="s"
                />
                <Text variant="bodySecondary">{t('recentContact')}</Text>
              </Box>
              <Box flexDirection="row" alignItems="center" mb="xs">
                <Box
                  width={12}
                  height={12}
                  bg="transparent"
                  style={{ backgroundColor: '#EAB308', borderRadius: 6 }}
                  mr="s"
                />
                <Text variant="bodySecondary">{t('warningContact')}</Text>
              </Box>
              <Box flexDirection="row" alignItems="center">
                <Box
                  width={12}
                  height={12}
                  bg="transparent"
                  style={{ backgroundColor: '#FF3B30', borderRadius: 6 }}
                  mr="s"
                />
                <Text variant="bodySecondary">{t('neglectedContact')}</Text>
              </Box>
            </Box>
          </Box>

          {/* Right Side: Context Ledger Sidebar */}
          <Box
            flex={3}
            minWidth={300}
            pl={Platform.OS === 'web' ? 'm' : 'none'}
            pt={Platform.OS === 'web' ? 'none' : 'm'}
          >
            {selectedShop ? (
              <MapDetailPane
                selectedShop={selectedShop}
                setSelectedShop={setSelectedShop}
                shopContacts={shopContacts}
                loadingSentiment={loadingSentiment}
                sentimentResult={sentimentResult}
              />
            ) : (
              <Box
                p="m"
                bg="cardBackground"
                height="100%"
                minHeight={250}
                justifyContent="center"
                alignItems="center"
                borderRadius="l"
                borderWidth={1.5}
                style={{ borderStyle: 'dashed', borderColor: '#ccc' }}
              >
                <Text variant="body" textAlign="center" color="secondaryText">
                  {t('selectShopMarker')}
                </Text>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    );
  }

  // ─── Sortly Mobile: Full-viewport map with floating filter & detail sheet ───
  return (
    <Box flex={1} style={{ position: 'relative' }}>
      {/* Full-viewport Map */}
      {Platform.OS !== 'web' ? (
        <Box
          flex={1}
          justifyContent="center"
          alignItems="center"
          bg="secondaryBackground"
        >
          <Text variant="body">{t('heatmapWebOptimized')}</Text>
        </Box>
      ) : (
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            inset: 0,
          }}
        />
      )}

      {/* Floating Header Badge */}
      <Box
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          zIndex: 1100,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box
          style={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 8,
            boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
          }}
        >
          <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#1E293B' }}>
            📍 {filteredShops.length} {t('shops')}
          </Text>
        </Box>

        {/* Floating Filter Toggle Button */}
        <TouchableOpacity
          onPress={() => setFilterVisible((v) => !v)}
          style={{
            backgroundColor: filterVisible
              ? '#5A31F4'
              : 'rgba(255,255,255,0.95)',
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 8,
            boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Text
            style={{
              fontWeight: 'bold',
              fontSize: 13,
              color: filterVisible ? '#fff' : '#1E293B',
            }}
          >
            {filterVisible ? '✕ Close' : '⚙️ Filter'}
          </Text>
        </TouchableOpacity>
      </Box>

      {/* Collapsible Filter Panel Overlay */}
      {filterVisible && (
        <Box
          style={{
            position: 'absolute',
            top: 56,
            left: 12,
            right: 12,
            zIndex: 1050,
            backgroundColor: 'rgba(255,255,255,0.97)',
            borderRadius: 16,
            padding: 16,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}
        >
          <MapFilterPanel
            regions={regions}
            items={items}
            selectedRegion={selectedRegion}
            setSelectedRegion={setSelectedRegion}
            selectedRep={selectedRep}
            setSelectedRep={setSelectedRep}
            selectedSku={selectedSku}
            setSelectedSku={setSelectedSku}
            neglectedOnly={neglectedOnly}
            setNeglectedOnly={setNeglectedOnly}
            isCaching={isCaching}
            cacheProgress={cacheProgress}
            cacheTotal={cacheTotal}
            preCacheOfflineMap={preCacheOfflineMap}
          />
        </Box>
      )}

      {/* Map Color Recency Legend (bottom-left) */}
      <Box
        style={{
          position: 'absolute',
          bottom: selectedShop ? 280 : 16,
          left: 12,
          backgroundColor: 'rgba(255,255,255,0.92)',
          padding: 8,
          borderRadius: 8,
          zIndex: 1000,
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        }}
      >
        {[
          { color: '#22C55E', label: t('activeContact') },
          { color: '#EAB308', label: t('warningContact') },
          { color: '#FF3B30', label: t('neglectedContact') },
        ].map((item) => (
          <Box key={item.color} flexDirection="row" alignItems="center" mb="xs">
            <Box
              width={10}
              height={10}
              bg="transparent"
              style={{
                backgroundColor: item.color,
                borderRadius: 5,
                marginRight: 6,
              }}
            />
            <Text style={{ fontSize: 10, color: '#475569' }}>{item.label}</Text>
          </Box>
        ))}
      </Box>

      {/* Selected Shop Bottom Sheet */}
      {selectedShop && (
        <Box
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1200,
            backgroundColor: '#fff',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: 260,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
            overflow: 'hidden',
          }}
        >
          <MapDetailPane
            selectedShop={selectedShop}
            setSelectedShop={setSelectedShop}
            shopContacts={shopContacts}
            loadingSentiment={loadingSentiment}
            sentimentResult={sentimentResult}
          />
        </Box>
      )}
    </Box>
  );
};
