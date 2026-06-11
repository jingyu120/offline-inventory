import { Pressable, TouchableOpacity } from 'react-native';
import {
  Box,
  Button,
  Card,
  Text,
  Theme,
  ThemedTextInput,
} from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { Sparkles } from 'lucide-react-native';
import { useTranslation } from '../../../core/i18n/i18n';
import { DraftLineItem } from '../types';
import { WEB_TRANSITION } from './webStyles';

const STAGED_UNITS = ['PCS', 'PK', 'BAGS', 'PAL'];

interface StagingReviewProps {
  draftStagingItems: DraftLineItem[];
  selectedCurrency: string;
  onClearStaged: () => void;
  onCommit: () => void;
  updateStagedQuantity: (index: number, quantity: string) => void;
  updateStagedUnit: (index: number, unit: string) => void;
  updateStagedUnitPrice: (index: number, price: string) => void;
}

export function StagingReview({
  draftStagingItems,
  selectedCurrency,
  onClearStaged,
  onCommit,
  updateStagedQuantity,
  updateStagedUnit,
  updateStagedUnitPrice,
}: StagingReviewProps): React.JSX.Element | null {
  const theme = useTheme<Theme>();
  const { t } = useTranslation();

  if (draftStagingItems.length === 0) return null;

  return (
    <Card p="m" mb="m" borderColor="brand" borderWidth={1}>
      <Box
        flexDirection="row"
        alignItems="center"
        mb="s"
        justifyContent="space-between"
      >
        <Box flexDirection="row" alignItems="center">
          <Box mr="xs">
            <Sparkles size={18} stroke={theme.colors.brand} />
          </Box>
          <Text variant="body" fontWeight="bold" color="brand">
            {t('stagingReviewArea')}
          </Text>
        </Box>
        <TouchableOpacity onPress={onClearStaged}>
          <Text variant="bodySecondary" color="dangerText">
            {t('clearStaged')}
          </Text>
        </TouchableOpacity>
      </Box>

      <Text variant="caption" color="secondaryText" mb="m">
        {t('stagingReviewDesc')}
      </Text>

      {draftStagingItems.map((si, index) => (
        <Box
          key={`${si.item.id}-${index}`}
          mb="m"
          pb="m"
          borderBottomWidth={index < draftStagingItems.length - 1 ? 1 : 0}
          borderBottomColor="borderColor"
        >
          <Text variant="body" fontWeight="bold" mb="s">
            {si.item.name} ({si.item.sku})
          </Text>

          <Box
            flexDirection="row"
            gap="s"
            mb="s"
            flexWrap="wrap"
            alignItems="center"
          >
            <Box style={{ flex: 1, minWidth: 80 }}>
              <Text variant="caption" color="secondaryText" mb="xs">
                {t('qty')}
              </Text>
              <ThemedTextInput
                value={si.quantity.toString()}
                onChangeText={(val) => updateStagedQuantity(index, val)}
                keyboardType="number-pad"
                p="s"
                borderRadius="s"
                borderWidth={1}
                borderColor="borderColor"
                bg="mainBackground"
                style={{
                  fontSize: 13,
                  color: theme.colors.primaryText,
                  textAlign: 'center',
                }}
              />
            </Box>

            <Box>
              <Text variant="caption" mb="xs" color="secondaryText">
                {t('unit')}
              </Text>
              <Box flexDirection="row">
                {STAGED_UNITS.map((unit) => {
                  const isSelected = si.selectedUnit === unit;
                  return (
                    <Pressable
                      key={unit}
                      onPress={() => updateStagedUnit(index, unit)}
                      style={({ pressed }) => [
                        {
                          marginLeft: theme.spacing.xs,
                          transform: [{ scale: pressed ? 0.95 : 1 }],
                          ...WEB_TRANSITION,
                        },
                      ]}
                    >
                      <Box
                        px="s"
                        py="xs"
                        borderRadius="s"
                        borderWidth={1}
                        borderColor={
                          isSelected ? 'primaryButton' : 'borderColor'
                        }
                        bg={isSelected ? 'primaryButton' : 'cardBackground'}
                      >
                        <Text
                          variant="badge"
                          fontWeight="bold"
                          color={
                            isSelected ? 'primaryButtonText' : 'secondaryText'
                          }
                        >
                          {unit}
                        </Text>
                      </Box>
                    </Pressable>
                  );
                })}
              </Box>
            </Box>

            <Box style={{ flex: 1.2, minWidth: 120 }}>
              <Text variant="caption" color="secondaryText" mb="xs">
                {t('unitPriceLabel')} ({selectedCurrency})
              </Text>
              <ThemedTextInput
                value={si.unitPrice.toString()}
                onChangeText={(val) => updateStagedUnitPrice(index, val)}
                keyboardType="numeric"
                p="s"
                borderRadius="s"
                borderWidth={1}
                borderColor="borderColor"
                bg="mainBackground"
                style={{ fontSize: 13, color: theme.colors.primaryText }}
              />
            </Box>
          </Box>
        </Box>
      ))}

      <Box mt="s">
        <Button
          title={t('commitToOrderBasket')}
          variant="primary"
          onPress={onCommit}
        />
      </Box>
    </Card>
  );
}
