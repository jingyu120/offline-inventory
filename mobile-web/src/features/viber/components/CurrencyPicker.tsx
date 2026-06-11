import { Pressable } from 'react-native';
import { Box, Card, Text } from '@burma-inventory/ui-components';
import { CURRENCIES } from '../../../config/appConfig';
import { useTranslation } from '../../../core/i18n/i18n';
import { WEB_TRANSITION } from './webStyles';

interface CurrencyPickerProps {
  selectedCurrency: string;
  onSelectCurrency: (currency: string) => void;
}

export function CurrencyPicker({
  selectedCurrency,
  onSelectCurrency,
}: CurrencyPickerProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
      <Text variant="body" fontWeight="bold" mb="s">
        {t('orderCurrency')}
      </Text>
      <Box flexDirection="row">
        {CURRENCIES.map((c) => {
          const curr = c.value;
          const isSelected = selectedCurrency === curr;
          return (
            <Box key={curr} mr="s" style={{ flex: 1 }}>
              <Pressable
                onPress={() => onSelectCurrency(curr)}
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                  ...WEB_TRANSITION,
                })}
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
                    {curr}
                  </Text>
                </Box>
              </Pressable>
            </Box>
          );
        })}
      </Box>
    </Card>
  );
}
