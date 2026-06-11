import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Box, Text } from '@burma-inventory/ui-components';
import { useTranslation } from '../../../core/i18n/i18n';
import { CURRENCIES } from '../../../config/appConfig';

interface CurrencySelectorProps {
  selectedCurrency: string;
  setSelectedCurrency: (val: string) => void;
}

/** Renders the price-currency toggle row. */
export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  selectedCurrency,
  setSelectedCurrency,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <Text variant="title" mb="s">
        {t('priceCurrency')}
      </Text>
      <Box flexDirection="row" mb="m">
        {CURRENCIES.map((curr) => {
          const isSelected = selectedCurrency === curr.value;
          return (
            <Box key={curr.value} mr="s" style={{ flex: 1 }}>
              <TouchableOpacity
                onPress={() => setSelectedCurrency(curr.value)}
                activeOpacity={0.7}
              >
                <Box
                  py="s"
                  px="m"
                  borderRadius="m"
                  borderWidth={1}
                  borderColor={isSelected ? 'primaryButton' : 'borderColor'}
                  bg={isSelected ? 'primaryButton' : 'cardBackground'}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text
                    variant="body"
                    fontWeight="bold"
                    color={isSelected ? 'primaryButtonText' : 'primaryText'}
                  >
                    {curr.label}
                  </Text>
                </Box>
              </TouchableOpacity>
            </Box>
          );
        })}
      </Box>
    </>
  );
};
