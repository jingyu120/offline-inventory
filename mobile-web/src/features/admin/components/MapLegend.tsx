import React from 'react';
import { Box, Text } from '@burma-inventory/ui-components';
import { useTranslation } from '../../../core/i18n/i18n';
import { useTheme } from '@shopify/restyle';
import { Theme } from '@burma-inventory/ui-components';

interface MapLegendProps {
  bottom?: number | string;
}

export const MapLegend: React.FC<MapLegendProps> = ({ bottom = 12 }) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();

  return (
    <Box
      style={{
        position: 'absolute',
        bottom: bottom as any,
        left: 12,
        backgroundColor: theme.colors.cardBackground,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.borderColor,
        zIndex: 1000,
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
      }}
    >
      <Text
        variant="bodySecondary"
        fontWeight="bold"
        mb="xs"
        color="secondaryText"
      >
        {t('lastContactRecency')}
      </Text>
      {[
        { color: '#22C55E', label: t('activeContact') },
        { color: '#4ADE80', label: t('recentContact') },
        { color: '#EAB308', label: t('warningContact') },
        { color: '#FF3B30', label: t('neglectedContact') },
      ].map((item) => (
        <Box key={item.color} flexDirection="row" alignItems="center" mb="xs">
          <Box
            width={12}
            height={12}
            bg="transparent"
            style={{ backgroundColor: item.color, borderRadius: 6 }}
            mr="s"
          />
          <Text variant="bodySecondary" color="secondaryText">
            {item.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
};
