import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import { Box, Text } from '@burma-inventory/ui-components';
import { useGeographicHeatmapData } from '../hooks/useGeographicHeatmapData';
import { MapFilterPanel } from '../components/MapFilterPanel';
import { MapDetailPane } from '../components/MapDetailPane';
import { useTranslation } from '../../../core/i18n/i18n';
import { tileDb } from '../../../core/database/tileDb';
import { SYNC_API_URL, RECENCY_CONFIGS } from '../../../config/appConfig';
import { ThermalGuard } from '../../../core/utils/thermalGuard';

// Import subcomponents
import { MapLegend } from '../components/MapLegend';
import { MapHeaderFloating } from '../components/MapHeaderFloating';

// Helper to dynamically load Leaflet from CDN to avoid React 19 dependency conflicts
const loadLeaflet = (callback: () => void) => {
  if (Platform.OS !== 'web') {
    callback();
    return;
  }

  const windowAny = window as $Any;
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

// Helper to calculate distance between coordinates
const getDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371e3; // meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Nearest Neighbor Traveling Salesperson Problem (TSP) solver
const solveTSP = (shops: $Any[]) => {
  if (shops.length === 0) return [];
  const unvisited = [...shops];
  const path = [unvisited.shift()];

  while (unvisited.length > 0) {
    const current = path[path.length - 1];
    let bestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const candidate = unvisited[i];
      const currentLat = current.latitude ?? 0;
      const currentLng = current.longitude ?? 0;
      const candidateLat = candidate.latitude ?? 0;
      const candidateLng = candidate.longitude ?? 0;
      const dist = getDistance(
        currentLat,
        currentLng,
        candidateLat,
        candidateLng,
      );
      if (dist < minDistance) {
        minDistance = dist;
        bestIndex = i;
      }
    }

    path.push(unvisited.splice(bestIndex, 1)[0]);
  }
  return path;
};

export const GeographicHeatmapScreen: React.FC = () => {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isWebMobile = Platform.OS === 'web' && !isDesktop;
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const mapContainerRef = useRef<$Any>(null);
  const [mapInstance, setMapInstance] = useState<$Any>(null);
  const markersRef = useRef<$Any[]>([]);
  const routePolylineRef = useRef<$Any>(null);

  const thermalState = ThermalGuard.getThermalState();
  const isThermalCritical = thermalState === 'CRITICAL';

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
    showRouteLine,
    setShowRouteLine,
    availableReps,
    mapStyle,
    setMapStyle,
  } = useGeographicHeatmapData();

  const [simplifiedMap, setSimplifiedMap] = useState(true);

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
    if (!lastContactDate) {
      return RECENCY_CONFIGS[RECENCY_CONFIGS.length - 1].color;
    }
    const diff = new Date().getTime() - new Date(lastContactDate).getTime();
    const diffInHours = diff / (1000 * 3600);
    const diffInDays = diff / (1000 * 3600 * 24);

    for (const cfg of RECENCY_CONFIGS) {
      if (cfg.hoursMax !== undefined && diffInHours < cfg.hoursMax) {
        return cfg.color;
      }
      if (cfg.daysMax !== undefined && diffInDays <= cfg.daysMax) {
        return cfg.color;
      }
    }
    return RECENCY_CONFIGS[RECENCY_CONFIGS.length - 1].color;
  };

  const getBubbleRadius = (ltv: number) => {
    const base = 6;
    const bonus = Math.min(ltv / 2500, 18);
    return base + bonus;
  };

  const tileLayerRef = useRef<$Any>(null);

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
    if (!leafletLoaded || !mapContainerRef.current || isThermalCritical) {
      console.log(
        '[Heatmap] Effect returned early due to missing leaflet, container, or thermal critical state',
      );
      return;
    }

    const L = (window as $Any).L;

    // Map setup centered on Myanmar (Yangon)
    const map = L.map(mapContainerRef.current, {
      minZoom: 6,
      maxZoom: 14,
    }).setView([16.8409, 96.1735], 12);

    setMapInstance(map);

    return () => {
      map.remove();
      setMapInstance(null);
    };
  }, [leafletLoaded, loading, isDesktop]);

  // 3b. Manage Tile Layer style dynamically
  useEffect(() => {
    if (!leafletLoaded || !mapInstance || isThermalCritical) return;
    const L = (window as $Any).L;

    // Remove old tile layer if exists
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
      tileLayerRef.current = null;
    }

    const effectiveMapStyle =
      mapStyle === 'muted' || simplifiedMap ? 'muted' : 'standard';

    const OfflineTileLayer = L.TileLayer.extend({
      createTile(coords: $Any, done: $Any) {
        const tile = document.createElement('img');
        tile.crossOrigin = 'anonymous';
        const style = this.options.mapStyle || 'standard';
        const key = `tile-${style}-${coords.z}-${coords.x}-${coords.y}`;
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

    const tileLayer = new OfflineTileLayer(
      `${SYNC_API_URL}/tiles/{z}/{x}/{y}.png?style=${effectiveMapStyle}`,
      {
        attribution:
          effectiveMapStyle === 'muted'
            ? '&copy; OpenStreetMap contributors, &copy; CARTO'
            : '&copy; OpenStreetMap contributors',
        crossOrigin: 'anonymous',
        minZoom: 6,
        maxZoom: 14,
        mapStyle: effectiveMapStyle,
      },
    ).addTo(mapInstance);

    tileLayerRef.current = tileLayer;

    return () => {
      if (tileLayerRef.current) {
        tileLayerRef.current.remove();
        tileLayerRef.current = null;
      }
    };
  }, [leafletLoaded, mapInstance, mapStyle, simplifiedMap, isThermalCritical]);

  // 4. Update Circle Markers on Filtered Shops Change
  useEffect(() => {
    if (!leafletLoaded || !mapInstance || isThermalCritical) return;
    const L = (window as $Any).L;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Clear old route polyline
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }

    // Create markers and add to map
    const newMarkers = filteredShops
      .filter((shop) => shop.latitude && shop.longitude)
      .map((shop) => {
        const isSelected = selectedShop && selectedShop.id === shop.id;
        const color = getRecencyColor(shop.lastContactDate);
        let radius = simplifiedMap ? 7 : getBubbleRadius(shop.lifetimeValue);
        if (isSelected) {
          radius = Math.max(radius + 6, 14);
        }
        const isGreen = color === '#22C55E' || color === '#4ADE80';

        const marker = L.circleMarker(
          [shop.latitude ?? 0, shop.longitude ?? 0],
          {
            radius,
            fillColor: isSelected ? '#4F46E5' : color, // Highlight selected with Indigo
            color: isSelected ? '#FFFFFF' : isGreen ? '#ffffff' : '#cbd5e1',
            weight: isSelected ? 4 : isGreen ? 2.5 : 1,
            opacity: 1,
            fillOpacity:
              isSelected || isGreen ? 1.0 : simplifiedMap ? 0.6 : 0.85,
          },
        ).addTo(mapInstance);

        if (isSelected || isGreen) {
          marker.bringToFront();
        }

        marker.on('click', () => {
          handleShopSelect(shop);
        });

        // Store shop reference on marker for dynamic tooltips
        (marker as $Any).shopData = shop;
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
          const r = simplifiedMap
            ? 7
            : getBubbleRadius((m as $Any).shopData.lifetimeValue);
          return { marker: m, shop: (m as $Any).shopData, p, r };
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
          const s = (m as $Any).shopData;
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

    // Solve TSP & draw optimal visit path — only when a specific region is
    // selected AND the user has toggled the route line on
    const validShops = filteredShops.filter((s) => s.latitude && s.longitude);
    if (showRouteLine && selectedRegion && validShops.length > 1) {
      const tspPath = solveTSP(validShops);
      const polylineCoords = tspPath.map((s) => [
        s.latitude ?? 0,
        s.longitude ?? 0,
      ]);
      const polyline = L.polyline(polylineCoords, {
        color: '#4F46E5',
        weight: 3,
        opacity: 0.8,
        dashArray: '8, 8',
      }).addTo(mapInstance);
      routePolylineRef.current = polyline;
    }

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
      if (routePolylineRef.current) {
        routePolylineRef.current.remove();
        routePolylineRef.current = null;
      }
    };
  }, [
    filteredShops,
    leafletLoaded,
    mapInstance,
    t,
    showRouteLine,
    selectedRegion,
    simplifiedMap,
    selectedShop,
  ]);

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
          showRouteLine={showRouteLine}
          setShowRouteLine={setShowRouteLine}
          availableReps={availableReps}
          simplifiedMap={simplifiedMap}
          setSimplifiedMap={setSimplifiedMap}
          mapStyle={mapStyle}
          setMapStyle={setMapStyle}
        />

        {/* Map + Side Panel Split View */}
        <Box flex={1} flexDirection="row" style={{ minHeight: 520, gap: 16 }}>
          {/* Left Side: Map Block */}
          <Box flex={7} style={{ position: 'relative', minHeight: 520 }}>
            {isThermalCritical ? (
              <Box
                flex={1}
                p="m"
                bg="dangerBg"
                borderColor="dangerText"
                borderWidth={1}
                borderRadius="m"
                justifyContent="center"
                alignItems="center"
                style={{ minHeight: 520 }}
              >
                <Text
                  variant="body"
                  color="dangerText"
                  fontWeight="bold"
                  textAlign="center"
                  mb="s"
                >
                  {t('thermalProtectionActive')}
                </Text>
                <Text
                  variant="bodySecondary"
                  color="dangerText"
                  textAlign="center"
                >
                  {t('thermalProtectionDesc')}
                </Text>
              </Box>
            ) : Platform.OS !== 'web' ? (
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
                  minHeight: 520,
                  borderRadius: '8px',
                  border: '1px solid #EAEAEA',
                }}
              />
            )}

            {/* Map Color Recency Legend */}
            <MapLegend bottom={12} />
          </Box>

          {/* Right Side: Context Ledger Sidebar */}
          <Box flex={3} style={{ minHeight: 520, minWidth: 280 }}>
            {selectedShop ? (
              <MapDetailPane
                selectedShop={selectedShop}
                setSelectedShop={setSelectedShop}
                shopContacts={shopContacts}
                loadingSentiment={loadingSentiment}
                sentimentResult={sentimentResult}
                allShops={filteredShops}
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
      {isWebMobile && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .leaflet-top.leaflet-left {
                margin-top: 60px !important;
              }
            `,
          }}
        />
      )}
      {/* Full-viewport Map */}
      {isThermalCritical ? (
        <Box
          flex={1}
          p="m"
          bg="dangerBg"
          borderColor="dangerText"
          borderWidth={1}
          justifyContent="center"
          alignItems="center"
          style={{ position: 'absolute', inset: 0 }}
        >
          <Text
            variant="body"
            color="dangerText"
            fontWeight="bold"
            textAlign="center"
            mb="s"
          >
            {t('thermalProtectionActive')}
          </Text>
          <Text variant="bodySecondary" color="dangerText" textAlign="center">
            {t('thermalProtectionDesc')}
          </Text>
        </Box>
      ) : Platform.OS !== 'web' ? (
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
        <>
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 1045,
            }}
            activeOpacity={1}
            onPress={() => setFilterVisible(false)}
          />
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
              showRouteLine={showRouteLine}
              setShowRouteLine={setShowRouteLine}
              availableReps={availableReps}
              simplifiedMap={simplifiedMap}
              setSimplifiedMap={setSimplifiedMap}
              mapStyle={mapStyle}
              setMapStyle={setMapStyle}
            />
          </Box>
        </>
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
            mapInstance={mapInstance}
            maxHeight={sheetMaxHeight}
          />
        </Box>
      )}
    </Box>
  );
};
