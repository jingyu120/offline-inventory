import React, { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import {
  Box,
  Text,
  Card,
  Button,
  Theme,
  ThemedTextInput,
} from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from '../../../core/i18n/i18n';
import { EodDigest } from '../types';
import { ADMIN_INPUT_WEB_STYLE } from './webStyles';

interface EodDigestPanelProps {
  isDesktop: boolean;
  digestDate: string;
  setDigestDate: (value: string) => void;
  loadingDigest: boolean;
  digestResult: EodDigest | null;
  onCompile: () => void;
}

const DATE_FORMAT_PLACEHOLDER = 'YYYY-MM-DD';

export const EodDigestPanel: React.FC<EodDigestPanelProps> = ({
  isDesktop,
  digestDate,
  setDigestDate,
  loadingDigest,
  digestResult,
  onCompile,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();
  const [dateFocused, setDateFocused] = useState(false);

  return (
    <Card p="m" mb="m" bg="cardBackground">
      <Box
        flexDirection={isDesktop ? 'row' : 'column'}
        alignItems={isDesktop ? 'center' : 'stretch'}
        mb="m"
      >
        <Box
          flex={isDesktop ? 1 : undefined}
          mr={isDesktop ? 'm' : 'none'}
          mb={isDesktop ? 'none' : 's'}
        >
          <Text variant="title">{t('eodDigestTitle')}</Text>
          <Text variant="bodySecondary">{t('eodDigestSubtitle')}</Text>
        </Box>

        <Box
          flexDirection="row"
          alignItems="center"
          mt={isDesktop ? 'none' : 's'}
        >
          <Box mr="s">
            <Text variant="caption" color="secondaryText" mb="xs">
              {t('dateFilter')}
            </Text>
            <ThemedTextInput
              value={digestDate}
              onChangeText={setDigestDate}
              placeholder={DATE_FORMAT_PLACEHOLDER}
              onFocus={() => setDateFocused(true)}
              onBlur={() => setDateFocused(false)}
              p="s"
              borderRadius="s"
              borderWidth={dateFocused ? 2 : 1}
              borderColor={dateFocused ? 'success' : 'borderColor'}
              bg="cardBackground"
              minWidth={120}
              style={{
                fontSize: 14,
                fontFamily: 'monospace',
                color: theme.colors.primaryText,
                ...ADMIN_INPUT_WEB_STYLE,
              }}
            />
          </Box>
          <Box style={{ alignSelf: 'flex-end' }}>
            <Button
              title={t('compileDigest')}
              onPress={onCompile}
              variant="primary"
            />
          </Box>
        </Box>
      </Box>

      {loadingDigest ? (
        <Box py="l" justifyContent="center" alignItems="center">
          <ActivityIndicator size="large" color={theme.colors.primaryButton} />
          <Text variant="bodySecondary" mt="s">
            {t('gemmaCompiling')}
          </Text>
        </Box>
      ) : digestResult ? (
        <Box
          p="m"
          borderRadius="m"
          bg="brandBg"
          borderColor="brandBorder"
          borderWidth={1}
        >
          {/* Top performing rep */}
          <Box
            flexDirection="row"
            justifyContent="space-between"
            mb="m"
            borderBottomWidth={1}
            borderColor="borderColor"
            pb="s"
          >
            <Text variant="body" fontWeight="bold">
              {t('topPerformingRepLabel')}
            </Text>
            <Text variant="body" fontWeight="bold" color="success">
              {digestResult.topPerformingRep}
            </Text>
          </Box>

          {/* AI Curated Market Synthesis */}
          <Box mb="m">
            <Text variant="body" fontWeight="bold" color="brand" mb="s">
              {t('aiMarketBriefingSummary')}
            </Text>
            <Text variant="bodySecondary" style={{ lineHeight: 22 }}>
              {String(digestResult.marketSynthesis)}
            </Text>
          </Box>

          {/* Warnings list */}
          {digestResult.warnings.length > 0 && (
            <Box borderTopWidth={1} borderColor="borderColor" pt="m">
              <Text variant="body" fontWeight="bold" color="danger" mb="s">
                {t('complianceViolationsLogged')}
              </Text>
              {digestResult.warnings.map((w: string, idx: number) => (
                <Text
                  key={idx}
                  variant="bodySecondary"
                  color="dangerText"
                  mb="xs"
                >
                  ⚠️ {w}
                </Text>
              ))}
            </Box>
          )}
        </Box>
      ) : (
        <Box
          p="m"
          borderStyle="dashed"
          borderWidth={1.5}
          borderColor="borderColor"
          borderRadius="m"
          justifyContent="center"
          alignItems="center"
        >
          <Text variant="bodySecondary">{t('compileDigestInstruction')}</Text>
        </Box>
      )}
    </Card>
  );
};
