import React from 'react';
import {
  Switch,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {
  Box,
  Text,
  Card,
  DropdownSelector,
} from '@burma-inventory/ui-components';
import { Region, Item } from '@burma-inventory/shared-types';
import { useTranslation } from '../../../core/i18n/i18n';
import { REPS } from '../../../core/auth/auth';

const PLATFORM_WEB = 'web';

interface MapFilterPanelProps {
  regions: Region[];
  items: Item[];
  selectedRegion: string;
  setSelectedRegion: (region: string) => void;
  selectedRep: string;
  setSelectedRep: (rep: string) => void;
  selectedSku: string;
  setSelectedSku: (sku: string) => void;
  neglectedOnly: boolean;
  setNeglectedOnly: (val: boolean) => void;
  isCaching: boolean;
  cacheProgress: number;
  cacheTotal: number;
  preCacheOfflineMap: () => void;
  /** IDs of reps that actually appear as assignedRepId on at least one shop */
  availableReps: string[];
  /** Whether the TSP optimal route polyline is shown on the map */
  showRouteLine: boolean;
  setShowRouteLine: (val: boolean) => void;
  simplifiedMap: boolean;
  setSimplifiedMap: (val: boolean) => void;
  mapStyle: 'standard' | 'muted';
  setMapStyle: (val: 'standard' | 'muted') => void;
}

export const MapFilterPanel: React.FC<MapFilterPanelProps> = ({
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
  isCaching,
  cacheProgress,
  cacheTotal,
  preCacheOfflineMap,
  availableReps,
  showRouteLine,
  setShowRouteLine,
  simplifiedMap,
  setSimplifiedMap,
  mapStyle,
  setMapStyle,
}) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const regionOptions = [
    { label: t('allRegions'), value: '' },
    ...regions.map((r) => ({ label: r.name, value: r.id })),
  ];

  // Build rep options from the canonical REPS list, but only include reps that
  // actually appear as assignedRepId on at least one loaded shop. Fall back to
  // showing all sales reps if the availableReps list happens to be empty
  // (e.g. data not yet loaded).
  const repOptions = [
    { label: t('allReps'), value: '' },
    ...REPS.filter(
      (r) =>
        r.role === 'sales' &&
        (availableReps.length === 0 || availableReps.includes(r.id)),
    ).map((r) => ({ label: r.name, value: r.id })),
  ];

  const skuOptions = [
    { label: t('allProducts'), value: '' },
    ...items.map((i) => ({ label: `${i.name} (${i.sku})`, value: i.id })),
  ];

  const mapStyleOptions = [
    { label: t('mapStyleStandard'), value: 'standard' },
    { label: t('mapStyleMuted'), value: 'muted' },
  ];

  // When the region is reset to "all regions" auto-hide the route line since it
  // only makes sense for a focused area.
  const handleRegionChange = (regionId: string) => {
    setSelectedRegion(regionId);
    if (!regionId && showRouteLine) {
      setShowRouteLine(false);
    }
  };

  const routeLineDisabled = !selectedRegion;

  return (
    <Card p="m" mb="m" borderBottomWidth={1} borderColor="borderColor">
      <Box
        flexDirection="row"
        flexWrap="wrap"
        justifyContent="space-between"
        alignItems="center"
      >
        {/* Region selector */}
        <Box width={isDesktop ? '10%' : '100%'} minWidth={120} mb="s">
          <DropdownSelector
            label={t('region')}
            selectedValue={selectedRegion}
            onValueChange={handleRegionChange}
            options={regionOptions}
            placeholder={t('selectRegionPlaceholder')}
          />
        </Box>

        {/* Rep selector — options come from actual shop assignedRepId data */}
        <Box width={isDesktop ? '10%' : '100%'} minWidth={120} mb="s">
          <DropdownSelector
            label={t('salesRep')}
            selectedValue={selectedRep}
            onValueChange={setSelectedRep}
            options={repOptions}
            placeholder={t('selectRepPlaceholder')}
          />
        </Box>

        {/* SKU Interest Selector */}
        <Box width={isDesktop ? '10%' : '100%'} minWidth={120} mb="s">
          <DropdownSelector
            label={t('skuInterest')}
            selectedValue={selectedSku}
            onValueChange={setSelectedSku}
            options={skuOptions}
            placeholder={t('selectSkuPlaceholder')}
          />
        </Box>

        {/* Map Style Selector */}
        <Box width={isDesktop ? '10%' : '100%'} minWidth={120} mb="s">
          <DropdownSelector
            label={t('mapStyle')}
            selectedValue={mapStyle}
            onValueChange={(val: $Any) => setMapStyle(val)}
            options={mapStyleOptions}
            placeholder={t('mapStyleStandard')}
          />
        </Box>

        {/* Neglected Only Switch */}
        <Box
          flexDirection="row"
          alignItems="center"
          mb="s"
          width={isDesktop ? '13%' : '100%'}
          minWidth={120}
          justifyContent={isDesktop ? 'flex-end' : 'space-between'}
        >
          <Box mr="s">
            <Text variant="body" fontWeight="bold">
              {t('neglectedOnly')}
            </Text>
            <Text variant="bodySecondary">{t('noContact14d')}</Text>
          </Box>
          <Switch
            value={neglectedOnly}
            onValueChange={setNeglectedOnly}
            trackColor={{ false: '#767577', true: '#FF3B30' }}
            thumbColor={neglectedOnly ? '#fff' : '#f4f3f4'}
          />
        </Box>

        {/* Optimal Route Line Toggle — only active when a region is selected */}
        <Box
          flexDirection="row"
          alignItems="center"
          mb="s"
          width={isDesktop ? '13%' : '100%'}
          minWidth={120}
          justifyContent={isDesktop ? 'flex-end' : 'space-between'}
          style={{ opacity: routeLineDisabled ? 0.4 : 1 }}
        >
          <Box mr="s">
            <Text variant="body" fontWeight="bold">
              {t('showRouteLine')}
            </Text>
            <Text variant="bodySecondary">
              {routeLineDisabled
                ? t('selectRegionFirst')
                : t('optimalVisitOrder')}
            </Text>
          </Box>
          <Switch
            value={showRouteLine}
            onValueChange={routeLineDisabled ? undefined : setShowRouteLine}
            disabled={routeLineDisabled}
            trackColor={{ false: '#767577', true: '#4F46E5' }}
            thumbColor={showRouteLine ? '#fff' : '#f4f3f4'}
          />
        </Box>

        {/* Simplified Map Switch */}
        <Box
          flexDirection="row"
          alignItems="center"
          mb="s"
          width={isDesktop ? '13%' : '100%'}
          minWidth={120}
          justifyContent={isDesktop ? 'flex-end' : 'space-between'}
        >
          <Box mr="s">
            <Text variant="body" fontWeight="bold">
              {t('simplifiedMap')}
            </Text>
            <Text variant="bodySecondary">{t('uniformSmallDots')}</Text>
          </Box>
          <Switch
            value={simplifiedMap}
            onValueChange={setSimplifiedMap}
            trackColor={{ false: '#767577', true: '#10B981' }}
            thumbColor={simplifiedMap ? '#fff' : '#f4f3f4'}
          />
        </Box>

        {/* Pre-Cache Offline Map */}
        {Platform.OS === PLATFORM_WEB && (
          <Box
            flexDirection="row"
            alignItems="center"
            mb="s"
            width={isDesktop ? '15%' : '100%'}
            minWidth={140}
            justifyContent={isDesktop ? 'flex-end' : 'flex-start'}
          >
            <TouchableOpacity
              onPress={preCacheOfflineMap}
              disabled={isCaching}
              style={{
                backgroundColor: isCaching ? '#A5B4FC' : '#4F46E5',
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 6,
                flex: isDesktop ? undefined : 1,
                alignItems: 'center',
              }}
            >
              <Text
                variant="body"
                style={{ color: '#fff', fontWeight: 'bold' }}
              >
                {isCaching
                  ? t('cachingProgress')
                      .replace('{progress}', cacheProgress.toString())
                      .replace('{total}', cacheTotal.toString())
                  : t('cacheOfflineMap')}
              </Text>
            </TouchableOpacity>
          </Box>
        )}
      </Box>
    </Card>
  );
};
