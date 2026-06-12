import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
  DropdownSelector,
  useResponsive,
} from '@burma-inventory/ui-components';
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
  const { isPhone } = useResponsive();

  // On phones a horizontal tab row forces side-scrolling that hides the later
  // sections, so present the sections as a dropdown picker instead.
  if (isPhone) {
    const options = TAB_DESCRIPTORS.map(({ tab, labelKey }) => ({
      value: tab,
      label: t(labelKey),
    }));
    return (
      <Box mb="l">
        <DropdownSelector
          selectedValue={activeTab}
          options={options}
          onValueChange={(value) => {
            const descriptor = TAB_DESCRIPTORS.find((d) => d.tab === value);
            if (descriptor) onSelectTab(descriptor.tab);
          }}
        />
      </Box>
    );
  }

  // Tablet/desktop: full tab row. Wraps to a second line if space is tight
  // rather than scrolling, so every section stays visible.
  return (
    <Box
      flexDirection="row"
      flexWrap="wrap"
      borderBottomWidth={1}
      borderBottomColor="borderColor"
      mb="l"
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
