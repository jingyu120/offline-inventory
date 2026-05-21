import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Box, Text } from '@burma-inventory/ui-components';
import { useTranslation } from '../../utils/i18n';

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
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderRadius: 20,
          paddingHorizontal: 14,
          paddingVertical: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
        }}
      >
        <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#1E293B' }}>
          📍 {filteredShopsCount} {t('shops')}
        </Text>
      </Box>

      <TouchableOpacity
        onPress={() => setFilterVisible(!filterVisible)}
        style={{
          backgroundColor: filterVisible ? '#5A31F4' : 'rgba(255,255,255,0.95)',
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
  );
};
