import React from 'react';
import {
  Box,
  Text,
  Card,
  DropdownSelector,
} from '@burma-inventory/ui-components';
import { useTranslation } from '../../../core/i18n/i18n';
import { SKU_METRICS } from '../../../config/appConfig';
import { TranslationKey } from '../types';

interface ShopOption {
  label: string;
  value: string;
}

interface DemandForecastPanelProps {
  isDesktop: boolean;
  selectedShopId: string;
  setSelectedShopId: (shopId: string) => void;
  shopOptions: ShopOption[];
}

export const DemandForecastPanel: React.FC<DemandForecastPanelProps> = ({
  isDesktop,
  selectedShopId,
  setSelectedShopId,
  shopOptions,
}) => {
  const { t } = useTranslation();

  return (
    <Box flex={1} minWidth={320} mr={isDesktop ? 'm' : 'none'} mb="m">
      <Card p="m" bg="cardBackground" height="100%">
        <Text variant="title" mb="s">
          {t('gemmaDemandForecast')}
        </Text>
        <Text variant="bodySecondary" mb="m">
          {t('selectAccountForecast')}
        </Text>

        {/* Shop Selector using cross-platform DropdownSelector */}
        <Box mb="m">
          <DropdownSelector
            label={t('accountSelector')}
            selectedValue={selectedShopId}
            onValueChange={(val) => setSelectedShopId(val)}
            options={shopOptions}
            placeholder={t('chooseShopAccountPlaceholder')}
          />
        </Box>

        {/* Forecast Lists */}
        {selectedShopId ? (
          <Box>
            {SKU_METRICS.map((sku, index) => (
              <Box
                key={index}
                py="s"
                borderBottomWidth={index < SKU_METRICS.length - 1 ? 1 : 0}
                borderColor="borderColor"
                flexDirection="row"
                justifyContent="space-between"
              >
                <Box>
                  <Text variant="body" fontWeight="bold">
                    {index + 1}. {sku.label}
                  </Text>
                  <Text variant="bodySecondary">
                    {t(sku.trendKey as TranslationKey) || sku.trendKey}
                  </Text>
                </Box>
                <Text
                  variant="body"
                  fontWeight="bold"
                  color={sku.themeColorKey}
                >
                  {t('probValue').replace('{prob}', sku.probability.toString())}
                </Text>
              </Box>
            ))}
          </Box>
        ) : (
          <Text variant="bodySecondary">{t('noShopSelected')}</Text>
        )}
      </Card>
    </Box>
  );
};
