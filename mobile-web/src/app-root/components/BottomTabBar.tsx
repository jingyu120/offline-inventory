import React from 'react';
import { TouchableOpacity, Platform } from 'react-native';
import { Box, Text } from '@burma-inventory/ui-components';
import { useAuth } from '../../utils/auth';
import { useTranslation } from '../../utils/i18n';
import { ROLE_SCREENS } from './NavBar';
import {
  ClipboardList,
  Map,
  Activity,
  Package,
  MessageSquare,
} from 'lucide-react-native';

interface BottomTabBarProps {
  currentScreen: 'ledger' | 'heatmap' | 'leadership' | 'intake' | 'viber-bot';
  setCurrentScreen: (
    screen: 'ledger' | 'heatmap' | 'leadership' | 'intake' | 'viber-bot',
  ) => void;
  activeTheme: any;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  currentScreen,
  setCurrentScreen,
  activeTheme,
}) => {
  const { activeRep } = useAuth();
  const { t, language } = useTranslation();

  return (
    <Box
      flexDirection="row"
      bg="cardBackground"
      borderTopWidth={1}
      borderColor="borderColor"
      py="s"
      style={
        Platform.OS === 'web'
          ? { boxShadow: '0px -2px 10px rgba(0,0,0,0.05)' }
          : {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
            }
      }
    >
      {ROLE_SCREENS[activeRep.role]?.map((screen) => {
        let label = '';
        let IconComponent: any = ClipboardList;
        if (screen === 'ledger') {
          label = language === 'en' ? 'Ledger' : t('shopLedger');
          IconComponent = ClipboardList;
        } else if (screen === 'heatmap') {
          label = language === 'en' ? 'Heatmap' : t('geographicHeatmap');
          IconComponent = Map;
        } else if (screen === 'leadership') {
          label = language === 'en' ? 'Oversight' : t('leadershipOversight');
          IconComponent = Activity;
        } else if (screen === 'intake') {
          label = language === 'en' ? 'Intake' : 'အော်ဒါ';
          IconComponent = Package;
        } else if (screen === 'viber-bot') {
          label = language === 'en' ? 'Drafter' : 'ဖုန်းမှတ်တမ်း';
          IconComponent = MessageSquare;
        }

        return (
          <TouchableOpacity
            key={screen}
            onPress={() => setCurrentScreen(screen)}
            style={{ alignItems: 'center', flex: 1 }}
          >
            <IconComponent
              size={20}
              color={
                currentScreen === screen
                  ? activeTheme.colors.primaryButton
                  : activeTheme.colors.secondaryText
              }
            />
            <Text
              style={{
                fontSize: 10,
                fontWeight: 'bold',
                marginTop: 4,
                textAlign: 'center',
                color:
                  currentScreen === screen
                    ? activeTheme.colors.primaryButton
                    : activeTheme.colors.secondaryText,
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </Box>
  );
};
