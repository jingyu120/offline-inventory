import React from 'react';
import {
  Box,
  Text,
  DropdownSelector,
  TextField,
} from '@burma-inventory/ui-components';
import { useTranslation } from '../../../core/i18n/i18n';

interface PriceObjectionSectionProps {
  objectionReason: string;
  setObjectionReason: (val: string) => void;
  negotiatedPrice: string;
  setNegotiatedPrice: (val: string) => void;
  competitorPrice: string;
  setCompetitorPrice: (val: string) => void;
  isPriceTooHigh: boolean;
  selectedCurrency: string;
}

/** Captures price-objection intel: reason, negotiated and competitor prices. */
export const PriceObjectionSection: React.FC<PriceObjectionSectionProps> = ({
  objectionReason,
  setObjectionReason,
  negotiatedPrice,
  setNegotiatedPrice,
  competitorPrice,
  setCompetitorPrice,
  isPriceTooHigh,
  selectedCurrency,
}) => {
  const { t } = useTranslation();

  return (
    <Box mt="m" mb="m" borderTopWidth={1} borderTopColor="borderColor" pt="m">
      <Text variant="title" mb="s">
        {t('priceObjectionIntel')}
      </Text>

      <Box mb="m">
        <DropdownSelector
          label={t('objectionReason')}
          placeholder={t('selectObjectionReason')}
          selectedValue={objectionReason}
          onValueChange={(val) => setObjectionReason(val)}
          options={[
            { label: t('none') || 'None', value: '' },
            {
              label: t('priceTooHigh') || 'Price Too High',
              value: 'PRICE_TOO_HIGH',
            },
            {
              label: t('competitorLower') || 'Competitor Lower',
              value: 'COMPETITOR_LOWER',
            },
            {
              label: t('stockUnavailable') || 'Stock Unavailable',
              value: 'STOCK_UNAVAILABLE',
            },
            {
              label: t('lackOfCredit') || 'Lack of Credit',
              value: 'LACK_OF_CREDIT',
            },
          ]}
        />
      </Box>

      <Box mb="m">
        <TextField
          name="negotiated_price"
          label={`${t('negotiatedPrice')} (${selectedCurrency})`}
          value={negotiatedPrice}
          onChangeText={setNegotiatedPrice}
          keyboardType="numeric"
        />
      </Box>

      {isPriceTooHigh && (
        <Box mb="m">
          <TextField
            name="competitor_price"
            label={`${t('negotiatedCompetitorPrice')} (${selectedCurrency})`}
            value={competitorPrice}
            onChangeText={setCompetitorPrice}
            keyboardType="numeric"
          />
        </Box>
      )}
    </Box>
  );
};
