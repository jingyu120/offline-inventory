import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import { Box, Text } from '@burma-inventory/ui-components';
import { useGeographicHeatmapData } from '../../hooks/useGeographicHeatmapData';
import { MapFilterPanel } from './components/MapFilterPanel';
import { MapDetailPane } from './components/MapDetailPane';
import { useTranslation } from '../../utils/i18n';
import { tileDb } from '../../utils/tileDb';
import { SYNC_API_URL } from '../../config';

// Import subcomponents
import { MapLegend } from './components/MapLegend';
import { MapHeaderFloating } from './components/MapHeaderFloating';

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
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const mapContainerRef = useRef<any>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const markersRef = useRef<any[]>([]);

  const {
    loading,
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
    regions,
    items,
  } = useGeographicHeatmapData();

  const sheetMaxHeight = isDesktop ? 500 : Math.min(height * 0.6, 440);
  const legendBottom = selectedShop
    ? isDesktop
      ? 280
      : sheetMaxHeight + 16
    : 16;

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
    console.log(
      '[Heatmap] Effect triggered. leafletLoaded:',
      leafletLoaded,
      'container:',
      mapContainerRef.current,
      'loading:',
      loading,
    );
    if (!leafletLoaded || !mapContainerRef.current) {
      console.log(
        '[Heatmap] Effect returned early due to missing leaflet or container',
      );
      return;
    }

    const L = (window as any).L;

    // Custom Offline-First TileLayer checking IndexedDB base64 data URL
    const OfflineTileLayer = L.TileLayer.extend({
      createTile(coords: any, done: any) {
        const tile = document.createElement('img');
        tile.crossOrigin = 'anonymous';
        const key = `tile-${coords.z}-${coords.x}-${coords.y}`;
        const fallbackUrl = this.getTileUrl(coords);

        tileDb
          .get(key)
          .then((cached) => {
            if (cached) {
              tile.src = cached;
              done(null, tile);
            } else {
              tile.src = fallbackUrl;
              tile.onload = () => done(null, tile);
              tile.onerror = (err) => done(err, tile);
            }
          })
          .catch((err) => {
            console.warn('Failed to load tile from db:', err);
            tile.src = fallbackUrl;
            tile.onload = () => done(null, tile);
            tile.onerror = (e) => done(e, tile);
          });

        return tile;
      },
    });

    // Map setup centered on Myanmar (Yangon)
    const map = L.map(mapContainerRef.current, {
      minZoom: 6,
      maxZoom: 14,
    }).setView([16.8409, 96.1735], 12);

    new OfflineTileLayer(`${SYNC_API_URL}/tiles/{z}/{x}/{y}.png`, {
      attribution: '&copy; OpenStreetMap contributors',
      crossOrigin: 'anonymous',
      minZoom: 6,
      maxZoom: 14,
    }).addTo(map);

    setMapInstance(map);

    return () => {
      map.remove();
      setMapInstance(null);
    };
  }, [leafletLoaded, loading, isDesktop]);

  // 4. Update Circle Markers on Filtered Shops Change
  useEffect(() => {
    if (!leafletLoaded || !mapInstance) return;
    const L = (window as any).L;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Create markers and add to map
    const newMarkers = filteredShops
      .filter((shop) => shop.latitude && shop.longitude)
      .map((shop) => {
        const color = getRecencyColor(shop.lastContactDate);
        const radius = getBubbleRadius(shop.lifetimeValue);

        const marker = L.circleMarker([shop.latitude!, shop.longitude!], {
          radius,
          fillColor: color,
          color: '#ffffff',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.85,
        }).addTo(mapInstance);

        marker.on('click', () => {
          handleShopSelect(shop);
        });

        // Store shop reference on marker for dynamic tooltips
        (marker as any).shopData = shop;
        // Bind an empty tooltip initially
        marker.bindTooltip('', { direction: 'top', permanent: false });

        return marker;
      });

    markersRef.current = newMarkers;

    // Helper function to update tooltips based on screen overlap
    const updateTooltips = () => {
      try {
        const markerData = newMarkers.map((m) => {
          const latLng = m.getLatLng();
          const p = mapInstance.latLngToContainerPoint(latLng);
          const r = getBubbleRadius((m as any).shopData.lifetimeValue);
          return { marker: m, shop: (m as any).shopData, p, r };
        });

        markerData.forEach((data) => {
          if (!data.p) return;
          // Find all markers overlapping with this one
          const overlaps = markerData.filter((other) => {
            if (!other.p) return false;
            const dist = data.p.distanceTo(other.p);
            return dist <= data.r + other.r;
          });

          if (overlaps.length > 1) {
            // Multiple overlapping shops
            // Sort by lifetime value descending
            const sorted = [...overlaps]
              .map((o) => o.shop)
              .sort((a, b) => b.lifetimeValue - a.lifetimeValue);

            const content = `
              <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; padding: 4px;">
                <b style="color: #374151;">Shops at this location (${sorted.length})</b>
                <ul style="margin: 4px 0 0 0; padding-left: 12px; list-style-type: disc;">
                  ${sorted
                    .map(
                      (s) => `
                    <li style="margin-bottom: 2px;">
                      <b>${s.name}</b>: K${s.lifetimeValue.toLocaleString()}
                    </li>
                  `,
                    )
                    .join('')}
                </ul>
              </div>
            `;
            data.marker.setTooltipContent(content);
          } else {
            // Single shop
            const s = data.shop;
            const content = `
              <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; padding: 4px;">
                <b style="color: #374151;">${s.name}</b><br/>
                <span style="color: #6B7280;">${t('lifetimeValue') || 'Value'}: K${s.lifetimeValue.toLocaleString()}</span><br/>
                <span style="color: #6B7280;">${t('sentimentTrend') || 'Sentiment'}: ${s.sentimentTrend}</span>
              </div>
            `;
            data.marker.setTooltipContent(content);
          }
        });
      } catch (e) {
        console.warn('Error computing map overlaps for tooltips:', e);
        // Fallback to single shop tooltip if container points fail
        newMarkers.forEach((m) => {
          const s = (m as any).shopData;
          m.setTooltipContent(
            `<b>${s.name}</b><br/>${t('lifetimeValue') || 'Value'}: K${s.lifetimeValue.toLocaleString()}<br/>${t('sentimentTrend') || 'Sentiment'}: ${s.sentimentTrend}`,
          );
        });
      }
    };

    // Calculate initially
    updateTooltips();

    // Recompute on zoom or move
    const handleMapChange = () => {
      updateTooltips();
    };
    mapInstance.on('zoomend', handleMapChange);
    mapInstance.on('moveend', handleMapChange);

    // Auto-bounds mapping coordinates
    const validCoords = filteredShops
      .filter((s) => s.latitude && s.longitude)
      .map((s) => [s.latitude, s.longitude]);

    if (validCoords.length > 0 && mapInstance) {
      mapInstance.fitBounds(validCoords, { padding: [30, 30] });
    }

    return () => {
      mapInstance.off('zoomend', handleMapChange);
      mapInstance.off('moveend', handleMapChange);
      newMarkers.forEach((m) => m.remove());
    };
  }, [filteredShops, leafletLoaded, mapInstance, t]);

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
            <MapLegend bottom={12} />
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
                allShops={filteredShops}
                onShopSelect={handleShopSelect}
                mapInstance={mapInstance}
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

      {/* Floating Header Badge and filter toggle */}
      <MapHeaderFloating
        filteredShopsCount={filteredShops.length}
        filterVisible={filterVisible}
        setFilterVisible={setFilterVisible}
      />

      {/* Collapsible Filter Panel Overlay */}
      {filterVisible && (
        <Box
          bg="cardBackground"
          borderColor="borderColor"
          borderWidth={1}
          borderRadius="l"
          p="m"
          style={{
            position: 'absolute',
            top: 56,
            left: 12,
            right: 12,
            zIndex: 1050,
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
      <MapLegend bottom={legendBottom} />

      {/* Selected Shop Bottom Sheet */}
      {selectedShop && (
        <Box
          bg="cardBackground"
          borderColor="borderColor"
          borderTopWidth={1}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1200,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: sheetMaxHeight,
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
            allShops={filteredShops}
            onShopSelect={handleShopSelect}
            mapInstance={mapInstance}
            maxHeight={sheetMaxHeight}
          />
        </Box>
      )}
    </Box>
  );
};
