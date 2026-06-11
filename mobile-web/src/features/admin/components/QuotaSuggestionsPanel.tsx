import React from 'react';
import { ActivityIndicator } from 'react-native';
import { Box, Text, Card, Button, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from '../../../core/i18n/i18n';
import { QuotaOptimization } from '../types';

interface QuotaSuggestionsPanelProps {
  quotaOptimizations: QuotaOptimization[];
  optimizationsLoading: boolean;
  onApplyAdjustments: () => void;
}

export const QuotaSuggestionsPanel: React.FC<QuotaSuggestionsPanelProps> = ({
  quotaOptimizations,
  optimizationsLoading,
  onApplyAdjustments,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();

  return (
    <Box flex={1} minWidth={320} mb="m">
      <Card p="m" bg="cardBackground" height="100%">
        <Text variant="title" mb="s">
          {t('quotaOptimizations')}
        </Text>
        <Text variant="bodySecondary" mb="m">
          {t('quotaSubtitle')}
        </Text>

        {optimizationsLoading ? (
          <Box py="m" justifyContent="center" alignItems="center">
            <ActivityIndicator
              size="small"
              color={theme.colors.primaryButton}
            />
          </Box>
        ) : (
          <Box>
            {quotaOptimizations.map((opt, idx) => (
              <Box
                key={idx}
                mb="m"
                borderLeftWidth={3}
                borderLeftColor="brand"
                pl="s"
              >
                <Box flexDirection="row" justifyContent="space-between" mb="xs">
                  <Text variant="body" fontWeight="bold">
                    {opt.region}
                  </Text>
                  <Text variant="body" fontWeight="bold" color="brand">
                    {t('quotaDailySuggested')
                      .replace('{current}', opt.currentQuota.toString())
                      .replace('{suggested}', opt.suggestedQuota.toString())}
                  </Text>
                </Box>
                <Text variant="bodySecondary" style={{ lineHeight: 18 }}>
                  {opt.reason}
                </Text>
              </Box>
            ))}

            <Box mt="m">
              <Button
                title={t('applyGemmaAdjustments')}
                onPress={onApplyAdjustments}
                variant="primary"
              />
            </Box>
          </Box>
        )}
      </Card>
    </Box>
  );
};
