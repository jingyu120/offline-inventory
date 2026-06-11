import React from 'react';
import { Box, Text, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { AlertTriangle } from 'lucide-react-native';
import { useTranslation } from '../../../core/i18n/i18n';

interface InteractionStatusBannersProps {
  isBlocked: boolean;
  hasCollectionToday: boolean;
  hasDiscrepancy: boolean;
}

/** Renders the credit-block and OCR-discrepancy warning banners. */
export const InteractionStatusBanners: React.FC<
  InteractionStatusBannersProps
> = ({ isBlocked, hasCollectionToday, hasDiscrepancy }) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();

  return (
    <>
      {isBlocked && (
        <Box
          bg={hasCollectionToday ? 'successBg' : 'dangerBg'}
          p="m"
          borderRadius="m"
          mb="m"
          flexDirection="row"
          alignItems="center"
          style={{ gap: 8 }}
        >
          <AlertTriangle
            size={20}
            color={
              theme.colors[hasCollectionToday ? 'successText' : 'dangerText']
            }
          />
          <Box flex={1}>
            <Text
              variant="body"
              fontWeight="bold"
              color={hasCollectionToday ? 'successText' : 'dangerText'}
            >
              {hasCollectionToday
                ? t('accountBlockedReleased')
                : t('accountBlocked')}
            </Text>
            {!hasCollectionToday && (
              <Text variant="caption" color="dangerText" mt="xs">
                {t('mustCollectCashDesc')}
              </Text>
            )}
          </Box>
        </Box>
      )}

      {hasDiscrepancy && (
        <Box
          bg="warningBg"
          p="s"
          borderRadius="s"
          mb="m"
          flexDirection="row"
          alignItems="center"
        >
          <AlertTriangle
            size={18}
            stroke={theme.colors.warningText}
            style={{ marginRight: 8 }}
          />
          <Text
            variant="body"
            color="warningText"
            fontWeight="bold"
            style={{ flex: 1 }}
          >
            {t('discrepancyWarning')}
          </Text>
        </Box>
      )}
    </>
  );
};
