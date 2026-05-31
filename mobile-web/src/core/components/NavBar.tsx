import React, { useState, useEffect } from 'react';
import { Platform, Pressable } from 'react-native';
import { Box, Text } from '@burma-inventory/ui-components';
import { useAuth, REPS } from '../auth/auth';
import { useToast } from './ToastProvider';
import { useTranslation } from '../i18n/i18n';
import { ChevronDown, RefreshCw } from 'lucide-react-native';
import { ROLE_SCREENS, SCREENS } from '../../config/appConfig';
import { ThermalGuard, ThermalState } from '../utils/thermalGuard';
export { ROLE_SCREENS };

interface NavBarProps {
  themeMode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => void;
  activeTheme: $Any;
  currentScreen: 'ledger' | 'heatmap' | 'leadership' | 'intake' | 'viber-bot';
  setCurrentScreen: (
    screen: 'ledger' | 'heatmap' | 'leadership' | 'intake' | 'viber-bot',
  ) => void;
  isDesktop: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  syncError: string | null;
  pendingChanges: number;
  handleSync: () => Promise<void>;
}

export const NavBar: React.FC<NavBarProps> = ({
  themeMode,
  setThemeMode,
  activeTheme,
  currentScreen,
  setCurrentScreen,
  isDesktop,
  isSyncing,
  lastSync,
  syncError,
  pendingChanges,
  handleSync,
}) => {
  const { activeRep, setActiveRep } = useAuth();
  const { showToast } = useToast();
  const { t, language, setLanguage } = useTranslation();
  const [isRepDropdownOpen, setIsRepDropdownOpen] = useState(false);
  const [isNavDropdownOpen, setIsNavDropdownOpen] = useState(false);
  const [isThermalDropdownOpen, setIsThermalDropdownOpen] = useState(false);
  const [thermalState, setThermalState] = useState<ThermalState>(
    ThermalGuard.getThermalState(),
  );

  useEffect(() => {
    return ThermalGuard.subscribe((state) => {
      setThermalState(state);
    });
  }, []);

  const getScreenDetails = (
    screen: 'ledger' | 'heatmap' | 'leadership' | 'intake' | 'viber-bot',
  ) => {
    const cfg = SCREENS.find((s) => s.value === screen);
    if (cfg) {
      return { label: t(cfg.labelKey as $Any) || cfg.value, icon: cfg.icon };
    }
    return { label: screen, icon: '📄' };
  };

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
      {(isRepDropdownOpen || isNavDropdownOpen || isThermalDropdownOpen) && (
        <Pressable
          style={{
            position: (Platform.OS === 'web'
              ? 'fixed'
              : 'absolute') as 'absolute',
            top: 0,
            bottom: Platform.OS === 'web' ? 0 : -2000,
            left: Platform.OS === 'web' ? 0 : -1000,
            right: Platform.OS === 'web' ? 0 : -1000,
            zIndex: 1000,
            backgroundColor: 'transparent',
          }}
          onPress={() => {
            setIsRepDropdownOpen(false);
            setIsNavDropdownOpen(false);
            setIsThermalDropdownOpen(false);
          }}
        />
      )}
      <Box flexDirection="row" alignItems="center" flex={1} overflow="visible">
        <Text
          variant="title"
          fontWeight="bold"
          color="brand"
          style={{ fontSize: isDesktop ? 20 : 16 }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          🇲🇲 {t('title')}
        </Text>
        {isDesktop && (
          <Text variant="bodySecondary" ml="s">
            | {t('representativePortal')}
          </Text>
        )}
      </Box>

      <Box
        flexDirection="row"
        alignItems="center"
        overflow="visible"
        zIndex={10010}
      >
        {/* Active Rep Selector Dropdown */}
        <Box
          position="relative"
          zIndex={10010}
          overflow="visible"
          mr={isDesktop ? 'm' : 's'}
        >
          <Pressable
            onPress={() => {
              setIsRepDropdownOpen(!isRepDropdownOpen);
              setIsNavDropdownOpen(false);
            }}
            style={({ pressed, hovered }: $Any) => ({
              paddingVertical: 6,
              paddingHorizontal: isDesktop ? 12 : 8,
              borderRadius: 16,
              backgroundColor: hovered
                ? activeTheme.colors.primaryButton
                : activeTheme.colors.brand,
              flexDirection: 'row',
              alignItems: 'center',
              transform: [{ scale: pressed ? 0.98 : 1 }],
              cursor: 'pointer',
              ...(Platform.OS === 'web'
                ? ({
                    transitionProperty: 'transform, background-color',
                    transitionDuration: '150ms',
                    transitionTimingFunction: 'ease-in-out',
                  } as $Any)
                : {}),
            })}
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
                : activeRep.name}
            </Text>
            <ChevronDown size={12} stroke="#fff" style={{ marginLeft: 4 }} />
          </Pressable>

          {isRepDropdownOpen && (
            <Box
              position="absolute"
              top={35}
              right={0}
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
              {REPS.map((rep) => {
                const isSelected = activeRep.id === rep.id;
                return (
                  <Pressable
                    key={rep.id}
                    onPress={() => {
                      setActiveRep(rep);
                      setIsRepDropdownOpen(false);
                      showToast(
                        `Logged in as ${rep.name} (${rep.role})`,
                        'success',
                      );
                    }}
                    style={({ pressed, hovered }: $Any) => ({
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      backgroundColor: isSelected
                        ? activeTheme.colors.brandBg
                        : hovered
                          ? activeTheme.colors.secondaryBackground
                          : 'transparent',
                      borderRadius: 4,
                      marginBottom: 2,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                      cursor: 'pointer',
                      ...(Platform.OS === 'web'
                        ? ({
                            transitionProperty: 'transform, background-color',
                            transitionDuration: '150ms',
                            transitionTimingFunction: 'ease-in-out',
                          } as $Any)
                        : {}),
                    })}
                  >
                    <Text
                      variant="body"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      fontSize={13}
                      color={isSelected ? 'brand' : 'primaryText'}
                    >
                      {rep.name} ({rep.role})
                    </Text>
                    <Text variant="bodySecondary" style={{ fontSize: 10 }}>
                      {rep.regionName || t('noRegion')}
                    </Text>
                  </Pressable>
                );
              })}
            </Box>
          )}
        </Box>

        {/* Language Toggle Button */}
        <Pressable
          onPress={() => setLanguage(language === 'en' ? 'my' : 'en')}
          style={({ pressed, hovered }: $Any) => ({
            paddingVertical: isDesktop ? 6 : undefined,
            paddingHorizontal: isDesktop ? 12 : undefined,
            width: isDesktop ? undefined : 32,
            height: isDesktop ? undefined : 32,
            borderRadius: 16,
            backgroundColor: hovered
              ? activeTheme.colors.secondaryBackground
              : activeTheme.colors.borderColor,
            marginRight: isDesktop ? 12 : 10,
            justifyContent: 'center',
            alignItems: 'center',
            transform: [{ scale: pressed ? 0.98 : 1 }],
            cursor: 'pointer',
            ...(Platform.OS === 'web'
              ? ({
                  transitionProperty: 'transform, background-color',
                  transitionDuration: '150ms',
                  transitionTimingFunction: 'ease-in-out',
                } as $Any)
              : {}),
          })}
        >
          <Text
            fontSize={isDesktop ? 12 : 14}
            color="primaryText"
            fontWeight="bold"
          >
            {language === 'en' ? '🇲🇲' : '🇬🇧'}
          </Text>
        </Pressable>

        {/* Thermal Throttling Simulator Dropdown */}
        <Box
          position="relative"
          zIndex={10025}
          overflow="visible"
          style={{ marginRight: isDesktop ? 12 : 10 }}
        >
          <Pressable
            onPress={() => {
              setIsThermalDropdownOpen(!isThermalDropdownOpen);
              setIsRepDropdownOpen(false);
              setIsNavDropdownOpen(false);
            }}
            style={({ pressed, hovered }: $Any) => {
              let bg = activeTheme.colors.borderColor;
              if (thermalState === 'NOMINAL')
                bg = '#10B981'; // green
              else if (thermalState === 'FAIR')
                bg = '#F59E0B'; // yellow
              else if (thermalState === 'SERIOUS')
                bg = '#EF4444'; // orange
              else if (thermalState === 'CRITICAL') bg = '#7F1D1D'; // red/maroon
              return {
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 16,
                backgroundColor: bg,
                flexDirection: 'row',
                alignItems: 'center',
                transform: [{ scale: pressed ? 0.98 : 1 }],
                cursor: 'pointer',
                minHeight: isDesktop ? undefined : 32,
              };
            }}
          >
            <Text style={{ fontSize: 11, color: '#fff', fontWeight: 'bold' }}>
              🌡️{' '}
              {t(
                `thermal${thermalState.charAt(0) + thermalState.slice(1).toLowerCase()}` as $Any,
              ) || thermalState}
            </Text>
          </Pressable>
          {isThermalDropdownOpen && (
            <Box
              position="absolute"
              top={35}
              right={0}
              bg="cardBackground"
              borderColor="borderColor"
              borderWidth={1}
              borderRadius="m"
              p="xs"
              zIndex={99999}
              style={{
                minWidth: 150,
                ...Platform.select({
                  web: { boxShadow: '0px 4px 12px rgba(0,0,0,0.15)' },
                  default: { elevation: 5 },
                }),
              }}
            >
              {(
                ['NOMINAL', 'FAIR', 'SERIOUS', 'CRITICAL'] as ThermalState[]
              ).map((state) => {
                const isSelected = state === thermalState;
                return (
                  <Pressable
                    key={state}
                    onPress={() => {
                      ThermalGuard.setThermalState(state);
                      setIsThermalDropdownOpen(false);
                      showToast(
                        `${t('thermalState')}: ${state}`,
                        state === 'SERIOUS' || state === 'CRITICAL'
                          ? 'warning'
                          : 'success',
                      );
                    }}
                    style={({ pressed, hovered }: $Any) => ({
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      backgroundColor: isSelected
                        ? activeTheme.colors.brandBg
                        : hovered
                          ? activeTheme.colors.secondaryBackground
                          : 'transparent',
                      borderRadius: 4,
                      marginBottom: 2,
                      cursor: 'pointer',
                    })}
                  >
                    <Text
                      variant="body"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      fontSize={12}
                      color={isSelected ? 'brand' : 'primaryText'}
                    >
                      {t(
                        `thermal${state.charAt(0) + state.slice(1).toLowerCase()}` as $Any,
                      ) || state}
                    </Text>
                  </Pressable>
                );
              })}
            </Box>
          )}
        </Box>

        {/* Theme Toggle Button */}
        <Pressable
          onPress={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
          style={({ pressed, hovered }: $Any) => ({
            paddingVertical: isDesktop ? 6 : undefined,
            paddingHorizontal: isDesktop ? 12 : undefined,
            width: isDesktop ? undefined : 32,
            height: isDesktop ? undefined : 32,
            borderRadius: 16,
            backgroundColor: hovered
              ? activeTheme.colors.secondaryBackground
              : activeTheme.colors.borderColor,
            marginRight: isDesktop ? 12 : 10,
            justifyContent: 'center',
            alignItems: 'center',
            transform: [{ scale: pressed ? 0.98 : 1 }],
            cursor: 'pointer',
            ...(Platform.OS === 'web'
              ? ({
                  transitionProperty: 'transform, background-color',
                  transitionDuration: '150ms',
                  transitionTimingFunction: 'ease-in-out',
                } as $Any)
              : {}),
          })}
        >
          <Text fontSize={isDesktop ? 12 : 14} color="primaryText">
            {themeMode === 'light' ? '🌙' : '☀️'}
          </Text>
        </Pressable>

        {/* Sync Status / Manual Trigger Button */}
        <Pressable
          onPress={handleSync}
          disabled={isSyncing}
          style={({ pressed, hovered }: $Any) => {
            const statusBg = syncError
              ? activeTheme.colors.danger
              : isSyncing
                ? activeTheme.colors.warning
                : activeTheme.colors.success;
            const hoveredBg = syncError
              ? activeTheme.colors.dangerText
              : isSyncing
                ? activeTheme.colors.warningText
                : activeTheme.colors.successText;
            return {
              paddingVertical: isDesktop ? 6 : undefined,
              paddingHorizontal: isDesktop ? 12 : undefined,
              width: isDesktop ? undefined : 32,
              height: isDesktop ? undefined : 32,
              borderRadius: 16,
              backgroundColor: hovered ? hoveredBg : statusBg,
              marginRight: isDesktop ? 16 : 0,
              justifyContent: 'center',
              alignItems: 'center',
              transform: [{ scale: pressed ? 0.96 : 1 }],
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              position: 'relative',
              overflow: 'visible',
              ...(Platform.OS === 'web'
                ? ({
                    transitionProperty: 'transform, background-color',
                    transitionDuration: '150ms',
                    transitionTimingFunction: 'ease-in-out',
                    userSelect: 'none',
                  } as $Any)
                : {}),
            };
          }}
          {...(Platform.OS === 'web'
            ? {
                title: syncError
                  ? `${t('syncError')}: ${syncError}`
                  : isSyncing
                    ? t('syncing')
                    : lastSync
                      ? `${t('syncedAt')} ${lastSync.toLocaleTimeString()}`
                      : t('syncPending'),
              }
            : {})}
        >
          <RefreshCw size={isDesktop ? 13 : 15} color="#fff" />

          {/* Pending changes badge */}
          {pendingChanges > 0 && (
            <Box
              position="absolute"
              bottom={-4}
              right={isDesktop ? -2 : -4}
              bg="cardBackground"
              px="xs"
              style={{
                paddingVertical: 1,
                borderRadius: 8,
                borderWidth: 1.5,
                borderColor: syncError
                  ? activeTheme.colors.danger
                  : activeTheme.colors.success,
              }}
            >
              <Text
                style={{
                  color: syncError
                    ? activeTheme.colors.danger
                    : activeTheme.colors.success,
                  fontSize: 8,
                  fontWeight: 'bold',
                }}
              >
                {pendingChanges}
              </Text>
            </Box>
          )}
        </Pressable>

        {/* Modules Navigation Dropdown */}
        {isDesktop &&
          ROLE_SCREENS[activeRep.role] &&
          ROLE_SCREENS[activeRep.role].length > 0 && (
            <Box position="relative" zIndex={10020} overflow="visible">
              <Pressable
                onPress={() => {
                  setIsNavDropdownOpen(!isNavDropdownOpen);
                  setIsRepDropdownOpen(false);
                }}
                style={({ pressed, hovered }: $Any) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: hovered
                    ? activeTheme.colors.secondaryBackground
                    : activeTheme.colors.cardBackground,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: activeTheme.colors.borderColor,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  cursor: 'pointer',
                  ...(Platform.OS === 'web'
                    ? ({
                        transitionProperty: 'transform, background-color',
                        transitionDuration: '150ms',
                        transitionTimingFunction: 'ease-in-out',
                      } as $Any)
                    : {}),
                })}
              >
                <Text
                  variant="body"
                  fontWeight="bold"
                  fontSize={13}
                  color="primaryText"
                >
                  {getScreenDetails(currentScreen).icon}{' '}
                  {getScreenDetails(currentScreen).label}
                </Text>
                {ROLE_SCREENS[activeRep.role].length > 1 && (
                  <ChevronDown
                    size={14}
                    color={activeTheme.colors.secondaryText}
                    style={{ marginLeft: 6 }}
                  />
                )}
              </Pressable>

              {isNavDropdownOpen && ROLE_SCREENS[activeRep.role].length > 1 && (
                <Box
                  position="absolute"
                  top={35}
                  right={0}
                  bg="cardBackground"
                  borderColor="borderColor"
                  borderWidth={1}
                  borderRadius="m"
                  p="xs"
                  zIndex={99999}
                  style={{
                    minWidth: 220,
                    ...Platform.select({
                      web: { boxShadow: '0px 4px 12px rgba(0,0,0,0.15)' },
                      default: { elevation: 5 },
                    }),
                  }}
                >
                  {ROLE_SCREENS[activeRep.role].map((screen) => {
                    const isSelected = screen === currentScreen;
                    const { label, icon } = getScreenDetails(screen);
                    return (
                      <Pressable
                        key={screen}
                        onPress={() => {
                          setCurrentScreen(screen);
                          setIsNavDropdownOpen(false);
                        }}
                        style={({ pressed, hovered }: $Any) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          backgroundColor: isSelected
                            ? activeTheme.colors.brandBg
                            : hovered
                              ? activeTheme.colors.secondaryBackground
                              : 'transparent',
                          borderRadius: 6,
                          marginBottom: 2,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                          cursor: 'pointer',
                          ...(Platform.OS === 'web'
                            ? ({
                                transitionProperty:
                                  'transform, background-color',
                                transitionDuration: '150ms',
                                transitionTimingFunction: 'ease-in-out',
                              } as $Any)
                            : {}),
                        })}
                      >
                        <Text
                          variant="body"
                          fontWeight={isSelected ? 'bold' : 'normal'}
                          fontSize={13}
                          color={isSelected ? 'brand' : 'primaryText'}
                        >
                          {icon} {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </Box>
              )}
            </Box>
          )}
      </Box>
    </Box>
  );
};
