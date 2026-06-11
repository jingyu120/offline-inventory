import React, { useState } from 'react';
import { Platform, ScrollView } from 'react-native';
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
import { OdooImportResult } from '../types';
import { ADMIN_INPUT_WEB_STYLE } from './webStyles';

interface OdooImporterPanelProps {
  csvText: string;
  setCsvText: (value: string) => void;
  importing: boolean;
  importResult: OdooImportResult | null;
  onSubmit: () => void;
  onClear: () => void;
}

const PLATFORM_IOS = 'ios';
const CSV_PLACEHOLDER =
  'Name,Address,Region,Division,ContactName,PhoneNumber,Email,PriceTier,LifetimeValue\nCity Mart Hledan,Yangon,Yangon Division,U Hla,0912345678,hledan@citymart.com.mm,Retailer,5000';

export const OdooImporterPanel: React.FC<OdooImporterPanelProps> = ({
  csvText,
  setCsvText,
  importing,
  importResult,
  onSubmit,
  onClear,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();
  const [csvFocused, setCsvFocused] = useState(false);

  return (
    <Card p="m" mb="m" bg="cardBackground">
      <Text variant="title" mb="xs">
        {t('odooImporterTitle')}
      </Text>
      <Text variant="bodySecondary" mb="m">
        {t('odooImporterDesc')}
      </Text>

      <ThemedTextInput
        multiline
        numberOfLines={6}
        value={csvText}
        onChangeText={setCsvText}
        placeholder={CSV_PLACEHOLDER}
        placeholderTextColor={theme.colors.secondaryText}
        onFocus={() => setCsvFocused(true)}
        onBlur={() => setCsvFocused(false)}
        minHeight={120}
        p="m"
        borderColor={csvFocused ? 'success' : 'slate300'}
        borderWidth={csvFocused ? 2 : 1}
        borderRadius="m"
        bg="mainBackground"
        mb="s"
        style={{
          fontFamily: Platform.OS === PLATFORM_IOS ? 'Courier' : 'monospace',
          fontSize: 13,
          color: theme.colors.primaryText,
          textAlignVertical: 'top',
          ...ADMIN_INPUT_WEB_STYLE,
        }}
      />

      <Box flexDirection="row" gap="s" mb={importResult ? 'm' : 'none'}>
        <Button
          title={importing ? t('importing') : t('importCsvData')}
          onPress={onSubmit}
          variant="primary"
          disabled={importing || !csvText.trim()}
        />
        <Button title={t('clear')} onPress={onClear} variant="secondary" />
      </Box>

      {importResult && (
        <Box
          p="m"
          borderRadius="m"
          bg={importResult.success ? 'successBg' : 'dangerBg'}
          borderWidth={1}
          borderColor={importResult.success ? 'success' : 'danger'}
        >
          {importResult.success ? (
            <Box>
              <Text
                variant="body"
                fontWeight="bold"
                color="successText"
                mb="xs"
              >
                {t('importSucceeded')}
              </Text>
              <Text variant="bodySecondary" color="successText">
                {t('importSucceededMsg', {
                  count: importResult.importedCount ?? 0,
                })}
              </Text>
              {importResult.warnings && importResult.warnings.length > 0 && (
                <Box mt="s" pt="s" borderTopWidth={1} borderColor="borderColor">
                  <Text
                    variant="bodySecondary"
                    fontWeight="bold"
                    color="successText"
                    mb="xs"
                  >
                    {t('warningsLabel')}
                  </Text>
                  <ScrollView
                    style={{ maxHeight: 100 }}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                  >
                    {importResult.warnings.map((w, idx) => (
                      <Text
                        key={idx}
                        variant="bodySecondary"
                        color="successText"
                      >
                        ⚠️ {w}
                      </Text>
                    ))}
                  </ScrollView>
                </Box>
              )}
            </Box>
          ) : (
            <Box>
              <Text variant="body" fontWeight="bold" color="errorText" mb="xs">
                {t('importFailed')}
              </Text>
              <Text variant="bodySecondary" color="errorText">
                {importResult.error}
              </Text>
            </Box>
          )}
        </Box>
      )}
    </Card>
  );
};
