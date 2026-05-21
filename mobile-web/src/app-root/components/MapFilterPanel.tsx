import React from 'react';
import { Switch, TouchableOpacity, Platform } from 'react-native';
import {
  Box,
  Text,
  Card,
  DropdownSelector,
} from '@burma-inventory/ui-components';
import { Region, Item } from '@burma-inventory/shared-types';
import { useTranslation } from '../../utils/i18n';

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
}) => {
  const { t } = useTranslation();

  const regionOptions = [
    { label: t('allRegions'), value: '' },
    ...regions.map((r) => ({ label: r.name, value: r.id })),
  ];

  const repOptions = [
    { label: t('allReps'), value: '' },
    { label: 'Ko Min (Rep-1)', value: 'rep-1' },
    { label: 'Ko Hla (Rep-2)', value: 'rep-2' },
  ];

  const skuOptions = [
    { label: t('allProducts'), value: '' },
    ...items.map((i) => ({ label: `${i.name} (${i.sku})`, value: i.id })),
  ];

  return (
    <Card p="m" mb="m" borderBottomWidth={1} borderColor="borderColor">
      <Box
        flexDirection="row"
        flexWrap="wrap"
        justifyContent="space-between"
        alignItems="center"
      >
        {/* Region selector */}
        <Box width="18%" minWidth={140} mb="s">
          <DropdownSelector
            label={t('region')}
            selectedValue={selectedRegion}
            onValueChange={setSelectedRegion}
            options={regionOptions}
            placeholder={t('selectRegionPlaceholder')}
          />
        </Box>

        {/* Rep selector */}
        <Box width="18%" minWidth={140} mb="s">
          <DropdownSelector
            label={t('salesRep')}
            selectedValue={selectedRep}
            onValueChange={setSelectedRep}
            options={repOptions}
            placeholder={t('selectRepPlaceholder')}
          />
        </Box>

        {/* SKU Interest Selector */}
        <Box width="18%" minWidth={140} mb="s">
          <DropdownSelector
            label={t('skuInterest')}
            selectedValue={selectedSku}
            onValueChange={setSelectedSku}
            options={skuOptions}
            placeholder={t('selectSkuPlaceholder')}
          />
        </Box>

        {/* Neglected Switch */}
        <Box
          flexDirection="row"
          alignItems="center"
          mb="s"
          width="18%"
          minWidth={140}
          justifyContent="flex-end"
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

        {/* Pre-Cache Offline Map */}
        {Platform.OS === 'web' && (
          <Box
            flexDirection="row"
            alignItems="center"
            mb="s"
            width="22%"
            minWidth={160}
            justifyContent="flex-end"
          >
            <TouchableOpacity
              onPress={preCacheOfflineMap}
              disabled={isCaching}
              style={{
                backgroundColor: isCaching ? '#A5B4FC' : '#4F46E5',
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 6,
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
