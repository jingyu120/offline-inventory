import React from 'react';
import { Box, Button, Text } from '@burma-inventory/ui-components';
import { useTranslation } from '../../../core/i18n/i18n';
import { translations } from '../../../core/i18n/translations';
import { COMMERCIAL_STATUSES } from '../../../config/appConfig';

type TranslationKey = keyof (typeof translations)['en'];

interface CommercialStatusSelectorProps {
  commercialStatus: string;
  setCommercialStatus: (status: string) => void;
}

/** Renders the selectable list of commercial status outcomes. */
export const CommercialStatusSelector: React.FC<
  CommercialStatusSelectorProps
> = ({ commercialStatus, setCommercialStatus }) => {
  const { t } = useTranslation();

  return (
    <>
      <Text variant="title" mt="m" mb="s">
        {t('commercialStatus')}
      </Text>
      <Box flexDirection="row" flexWrap="wrap" mb="m">
        {COMMERCIAL_STATUSES.map((status) => (
          <Box key={status.value} mr="s" mb="s">
            <Button
              title={t(status.labelKey as TranslationKey) || status.value}
              variant={
                commercialStatus === status.value ? 'primary' : 'outline'
              }
              onPress={() => setCommercialStatus(status.value)}
            />
          </Box>
        ))}
      </Box>
    </>
  );
};
