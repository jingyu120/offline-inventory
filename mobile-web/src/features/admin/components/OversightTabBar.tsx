import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Box, Text } from '@burma-inventory/ui-components';
import { useTranslation } from '../../../core/i18n/i18n';
import { OVERSIGHT_TAB, OversightTab, TranslationKey } from '../types';

interface OversightTabBarProps {
  activeTab: OversightTab;
  onSelectTab: (tab: OversightTab) => void;
}

interface TabDescriptor {
  tab: OversightTab;
  labelKey: TranslationKey;
}

const TAB_DESCRIPTORS: TabDescriptor[] = [
  { tab: OVERSIGHT_TAB.OVERSIGHT, labelKey: 'oversightOverview' },
  { tab: OVERSIGHT_TAB.HITL, labelKey: 'hitlResolutions' },
  { tab: OVERSIGHT_TAB.DLQ, labelKey: 'dlqMonitor' },
  { tab: OVERSIGHT_TAB.APPROVALS, labelKey: 'approvals' },
  { tab: OVERSIGHT_TAB.RECONCILIATION, labelKey: 'arReconciliation' },
];

export const OversightTabBar: React.FC<OversightTabBarProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const { t } = useTranslation();

  return (
    <Box
      flexDirection="row"
      borderBottomWidth={1}
      borderBottomColor="borderColor"
      mb="l"
      gap="m"
    >
      {TAB_DESCRIPTORS.map(({ tab, labelKey }) => {
        const isActive = activeTab === tab;
        return (
          <TouchableOpacity key={tab} onPress={() => onSelectTab(tab)}>
            <Box
              py="s"
              px="m"
              borderBottomWidth={2}
              borderBottomColor={isActive ? 'brand' : 'transparent'}
            >
              <Text
                variant="body"
                fontWeight="bold"
                color={isActive ? 'brand' : 'secondaryText'}
              >
                {t(labelKey)}
              </Text>
            </Box>
          </TouchableOpacity>
        );
      })}
    </Box>
  );
};
