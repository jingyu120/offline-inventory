import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Box, Text, Theme } from '@burma-inventory/ui-components';
import { useTranslation } from '../../../core/i18n/i18n';
import { useTheme } from '@shopify/restyle';

interface MapHeaderFloatingProps {
  filteredShopsCount: number;
  filterVisible: boolean;
  setFilterVisible: (visible: boolean) => void;
}

export const MapHeaderFloating: React.FC<MapHeaderFloatingProps> = ({
  filteredShopsCount,
  filterVisible,
  setFilterVisible,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();

  return (
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
          backgroundColor: theme.colors.cardBackground,
          borderRadius: 20,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderWidth: 1,
          borderColor: theme.colors.borderColor,
          boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
        }}
      >
        <Text
          style={{
            fontWeight: 'bold',
            fontSize: 13,
            color: theme.colors.primaryText,
          }}
        >
          📍 {filteredShopsCount} {t('shops')}
        </Text>
      </Box>

      <TouchableOpacity
        onPress={() => setFilterVisible(!filterVisible)}
        style={{
          backgroundColor: filterVisible
            ? theme.colors.brand
            : theme.colors.cardBackground,
          borderRadius: 20,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderWidth: 1,
          borderColor: theme.colors.borderColor,
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
            color: filterVisible ? '#fff' : theme.colors.primaryText,
          }}
        >
          {filterVisible ? `✕ ${t('close')}` : `⚙️ ${t('filter')}`}
        </Text>
      </TouchableOpacity>
    </Box>
  );
};
