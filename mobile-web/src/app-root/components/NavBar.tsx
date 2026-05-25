import React, { useState } from 'react';
import { TouchableOpacity, Platform } from 'react-native';
import { Box, Text } from '@burma-inventory/ui-components';
import { useAuth, REPS } from '../../utils/auth';
import { useToast } from './ToastProvider';
import { useTranslation } from '../../utils/i18n';
import { ChevronDown } from 'lucide-react-native';

export const ROLE_SCREENS: Record<
  string,
  ('ledger' | 'heatmap' | 'leadership' | 'intake' | 'viber-bot')[]
> = {
  sales: ['ledger'],
  manager: ['heatmap', 'leadership'],
  intake: ['intake'],
  admin: ['ledger', 'heatmap', 'leadership', 'intake', 'viber-bot'],
};

interface NavBarProps {
  themeMode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => void;
  activeTheme: any;
  currentScreen: 'ledger' | 'heatmap' | 'leadership' | 'intake' | 'viber-bot';
  setCurrentScreen: (
    screen: 'ledger' | 'heatmap' | 'leadership' | 'intake' | 'viber-bot',
  ) => void;
  isDesktop: boolean;
}

export const NavBar: React.FC<NavBarProps> = ({
  themeMode,
  setThemeMode,
  activeTheme,
  currentScreen,
  setCurrentScreen,
  isDesktop,
}) => {
  const { activeRep, setActiveRep } = useAuth();
  const { showToast } = useToast();
  const { t, language, setLanguage } = useTranslation();
  const [isRepDropdownOpen, setIsRepDropdownOpen] = useState(false);

  return (
    <Box
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      px="m"
      py="s"
      borderBottomWidth={1}
      borderColor="borderColor"
      bg="cardBackground"
      position="relative"
      zIndex={10000}
    >
      <Box flexDirection="row" alignItems="center">
        <Text
          variant="title"
          fontWeight="bold"
          style={{ color: '#5A31F4', fontSize: isDesktop ? 20 : 16 }}
        >
          🇲🇲 {t('title')}
        </Text>
        {isDesktop && (
          <Text variant="bodySecondary" ml="s">
            | {t('representativePortal')}
          </Text>
        )}
      </Box>

      <Box flexDirection="row" alignItems="center">
        {/* Active Rep Selector Dropdown */}
        <Box position="relative" zIndex={10010}>
          <TouchableOpacity
            onPress={() => setIsRepDropdownOpen(!isRepDropdownOpen)}
            style={{
              paddingVertical: 6,
              paddingHorizontal: isDesktop ? 12 : 8,
              borderRadius: 16,
              backgroundColor: '#5A31F4',
              marginRight: isDesktop ? 12 : 8,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: '#fff',
                fontWeight: 'bold',
              }}
            >
              👤{' '}
              {isDesktop
                ? `${activeRep.name} (${activeRep.role.toUpperCase()})`
                : activeRep.name.split(' ')[0]}
            </Text>
            <ChevronDown size={12} stroke="#fff" style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          {isRepDropdownOpen && (
            <Box
              position="absolute"
              top={35}
              right={10}
              bg="cardBackground"
              borderColor="borderColor"
              borderWidth={1}
              borderRadius="m"
              p="xs"
              zIndex={99999}
              style={{
                minWidth: 200,
                ...Platform.select({
                  web: { boxShadow: '0px 4px 12px rgba(0,0,0,0.15)' },
                  default: { elevation: 5 },
                }),
              }}
            >
              {REPS.map((rep) => (
                <TouchableOpacity
                  key={rep.id}
                  onPress={() => {
                    setActiveRep(rep);
                    setIsRepDropdownOpen(false);
                    showToast(
                      `Logged in as ${rep.name} (${rep.role})`,
                      'success',
                    );
                  }}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    backgroundColor:
                      activeRep.id === rep.id
                        ? 'rgba(90, 49, 244, 0.08)'
                        : 'transparent',
                    borderRadius: 4,
                    marginBottom: 2,
                  }}
                >
                  <Text
                    variant="body"
                    fontWeight={activeRep.id === rep.id ? 'bold' : 'normal'}
                    style={{ fontSize: 13 }}
                  >
                    {rep.name} ({rep.role})
                  </Text>
                  <Text variant="bodySecondary" style={{ fontSize: 10 }}>
                    {rep.regionName || 'No Region'}
                  </Text>
                </TouchableOpacity>
              ))}
            </Box>
          )}
        </Box>

        {/* Language Toggle Button */}
        <TouchableOpacity
          onPress={() => setLanguage(language === 'en' ? 'my' : 'en')}
          style={{
            paddingVertical: 6,
            paddingHorizontal: isDesktop ? 12 : 8,
            borderRadius: 16,
            backgroundColor: themeMode === 'light' ? '#E2E8F0' : '#475569',
            marginRight: isDesktop ? 12 : 8,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: themeMode === 'light' ? '#1E293B' : '#F1F5F9',
              fontWeight: 'bold',
            }}
          >
            {language === 'en' ? '🇲🇲' : '🇬🇧'}
          </Text>
        </TouchableOpacity>

        {/* Theme Toggle Button */}
        <TouchableOpacity
          onPress={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
          style={{
            paddingVertical: 6,
            paddingHorizontal: isDesktop ? 12 : 8,
            borderRadius: 16,
            backgroundColor: themeMode === 'light' ? '#CBD5E1' : '#334155',
            marginRight: isDesktop ? 16 : 0,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: themeMode === 'light' ? '#1E293B' : '#F1F5F9',
            }}
          >
            {themeMode === 'light' ? '🌙' : '☀️'}
          </Text>
        </TouchableOpacity>

        {/* Desktop Screen Switcher Tabs */}
        {isDesktop && (
          <Box
            flexDirection="row"
            ml="m"
            borderLeftWidth={1}
            borderColor="borderColor"
            pl="m"
          >
            {ROLE_SCREENS[activeRep.role]?.map((screen) => {
              let label = '';
              let icon = '';
              if (screen === 'ledger') {
                label = t('shopLedger');
                icon = '📋';
              } else if (screen === 'heatmap') {
                label = t('geographicHeatmap');
                icon = '🗺️';
              } else if (screen === 'leadership') {
                label = t('leadershipOversight');
                icon = '📊';
              } else if (screen === 'intake') {
                label = 'Intake';
                icon = '📦';
              } else if (screen === 'viber-bot') {
                label = 'Order Drafter';
                icon = '💬';
              }
              return (
                <TouchableOpacity
                  key={screen}
                  onPress={() => setCurrentScreen(screen)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 20,
                    backgroundColor:
                      currentScreen === screen ? '#5A31F4' : 'transparent',
                    marginRight: 8,
                  }}
                >
                  <Text
                    variant="body"
                    fontWeight="bold"
                    style={{
                      color: currentScreen === screen ? '#fff' : '#5A31F4',
                    }}
                  >
                    {icon} {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
};
