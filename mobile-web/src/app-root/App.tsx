import React, { useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@shopify/restyle';
import {
  theme as lightTheme,
  darkTheme,
  Box,
  Text,
} from '@burma-inventory/ui-components';
import { ShopLedgerScreen } from './ShopLedgerScreen';
import { GeographicHeatmapScreen } from './GeographicHeatmapScreen';
import { TeamPulseScreen } from './TeamPulseScreen';
import { SyncConflictModal } from './components/SyncConflictModal';
import { ToastProvider, useToast } from './components/ToastProvider';
import { LanguageProvider, useTranslation } from '../utils/i18n';
import { syncData } from '../sync';
import { database } from '../database';
import { TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { AuthProvider, useAuth, REPS } from '../utils/auth';
import { ClipboardList, Map, Activity } from 'lucide-react-native';

export const AppContent = ({ themeMode, setThemeMode, activeTheme }: any) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { activeRep, setActiveRep } = useAuth();
  const { showToast } = useToast();
  const { t, language, setLanguage } = useTranslation();
  const [currentScreen, setCurrentScreen] = useState<
    'ledger' | 'heatmap' | 'leadership'
  >('ledger');

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState(0);

  const refreshPendingCount = React.useCallback(async () => {
    try {
      const logs = await database.get('interaction_logs').query().fetch();
      // Use WatermelonDB's internal _status as the canonical sync indicator.
      // Mixing it with syncedAtServer via OR inflates the count for all records
      // that have never been pushed (syncedAtServer is null by default).
      const unsyncedLogs = logs.filter((l: any) => l._raw._status !== 'synced');
      setPendingChanges(unsyncedLogs.length);
    } catch (e) {
      console.error('Failed to count unsynced logs:', e);
    }
  }, []);

  const handleSync = React.useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      await syncData();
      setLastSync(new Date());
      await refreshPendingCount();
    } catch (err: any) {
      setSyncError(err.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [refreshPendingCount]);

  React.useEffect(() => {
    handleSync().catch(console.error);

    // Subscribe to WatermelonDB changes for interaction_logs to update badge count.
    const subscription = database
      .withChangesForTables(['interaction_logs'])
      .subscribe(() => {
        refreshPendingCount().catch(console.error);
      });

    return () => subscription.unsubscribe();
  }, [handleSync, refreshPendingCount]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: activeTheme.colors.mainBackground }}
    >
      <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />

      {/* Navigation Header Bar */}
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        px="m"
        py="s"
        borderBottomWidth={1}
        borderColor="borderColor"
        bg="cardBackground"
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
          {/* Active Rep Selector */}
          <TouchableOpacity
            onPress={() => {
              const nextRep = activeRep.id === 'rep-1' ? REPS[1] : REPS[0];
              setActiveRep(nextRep);
              showToast(`Logged in as ${nextRep.name}`, 'success');
            }}
            style={{
              paddingVertical: 6,
              paddingHorizontal: isDesktop ? 12 : 8,
              borderRadius: 16,
              backgroundColor: '#5A31F4',
              marginRight: isDesktop ? 12 : 8,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: '#fff',
                fontWeight: 'bold',
              }}
            >
              👤 {isDesktop ? activeRep.name : activeRep.name.split(' ')[0]}
            </Text>
          </TouchableOpacity>

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
            onPress={() =>
              setThemeMode(themeMode === 'light' ? 'dark' : 'light')
            }
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
              <TouchableOpacity
                onPress={() => setCurrentScreen('ledger')}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 20,
                  backgroundColor:
                    currentScreen === 'ledger' ? '#5A31F4' : 'transparent',
                  marginRight: 8,
                }}
              >
                <Text
                  variant="body"
                  fontWeight="bold"
                  style={{
                    color: currentScreen === 'ledger' ? '#fff' : '#5A31F4',
                  }}
                >
                  📋 {t('shopLedger')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setCurrentScreen('heatmap')}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 20,
                  backgroundColor:
                    currentScreen === 'heatmap' ? '#5A31F4' : 'transparent',
                  marginRight: 8,
                }}
              >
                <Text
                  variant="body"
                  fontWeight="bold"
                  style={{
                    color: currentScreen === 'heatmap' ? '#fff' : '#5A31F4',
                  }}
                >
                  🗺️ {t('geographicHeatmap')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setCurrentScreen('leadership')}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 20,
                  backgroundColor:
                    currentScreen === 'leadership' ? '#5A31F4' : 'transparent',
                }}
              >
                <Text
                  variant="body"
                  fontWeight="bold"
                  style={{
                    color: currentScreen === 'leadership' ? '#fff' : '#5A31F4',
                  }}
                >
                  📊 {t('leadershipOversight')}
                </Text>
              </TouchableOpacity>
            </Box>
          )}
        </Box>
      </Box>

      {/* Sync Diagnostics Dashboard Bar */}
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        px="m"
        py="xs"
        bg="secondaryBackground"
        borderBottomWidth={1}
        borderColor="borderColor"
      >
        <Box flexDirection="row" alignItems="center">
          <Box
            width={8}
            height={8}
            borderRadius="s"
            backgroundColor={
              syncError ? 'danger' : isSyncing ? 'warning' : 'success'
            }
            marginRight="s"
          />
          <Text variant="bodySecondary" fontSize={isDesktop ? 13 : 11}>
            {syncError
              ? `${t('syncError')}: ${syncError}`
              : isSyncing
                ? t('syncing')
                : lastSync
                  ? `${t('syncedAt')} ${lastSync.toLocaleTimeString()}`
                  : t('syncPending')}
          </Text>
          {pendingChanges > 0 && (
            <Text
              variant="badge"
              style={{
                backgroundColor: '#EF4444',
                color: '#fff',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 10,
                marginLeft: 8,
                fontSize: 10,
              }}
            >
              {pendingChanges} {t('localChanges')}
            </Text>
          )}
        </Box>

        <TouchableOpacity
          onPress={handleSync}
          disabled={isSyncing}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isSyncing ? '#94A3B8' : '#5A31F4',
            paddingVertical: 4,
            paddingHorizontal: 12,
            borderRadius: 12,
          }}
        >
          <Text
            variant="bodySecondary"
            style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}
          >
            {isSyncing ? `🔄` : `⚡ ${t('syncNow')}`}
          </Text>
        </TouchableOpacity>
      </Box>

      {/* Render Active Screen View */}
      <Box flex={1}>
        {currentScreen === 'ledger' && <ShopLedgerScreen />}
        {currentScreen === 'heatmap' && <GeographicHeatmapScreen />}
        {currentScreen === 'leadership' && <TeamPulseScreen />}
      </Box>

      {/* Sortly-style Mobile Bottom Navigation Tab Bar */}
      {!isDesktop && (
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
          <TouchableOpacity
            onPress={() => setCurrentScreen('ledger')}
            style={{ alignItems: 'center', flex: 1 }}
          >
            <ClipboardList
              size={20}
              color={
                currentScreen === 'ledger'
                  ? '#5A31F4'
                  : activeTheme.colors.secondaryText
              }
            />
            <Text
              style={{
                fontSize: 10,
                fontWeight: 'bold',
                marginTop: 4,
                color:
                  currentScreen === 'ledger'
                    ? '#5A31F4'
                    : activeTheme.colors.secondaryText,
              }}
            >
              {t('shopLedger')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCurrentScreen('heatmap')}
            style={{ alignItems: 'center', flex: 1 }}
          >
            <Map
              size={20}
              color={
                currentScreen === 'heatmap'
                  ? '#5A31F4'
                  : activeTheme.colors.secondaryText
              }
            />
            <Text
              style={{
                fontSize: 10,
                fontWeight: 'bold',
                marginTop: 4,
                color:
                  currentScreen === 'heatmap'
                    ? '#5A31F4'
                    : activeTheme.colors.secondaryText,
              }}
            >
              {t('geographicHeatmap')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCurrentScreen('leadership')}
            style={{ alignItems: 'center', flex: 1 }}
          >
            <Activity
              size={20}
              color={
                currentScreen === 'leadership'
                  ? '#5A31F4'
                  : activeTheme.colors.secondaryText
              }
            />
            <Text
              style={{
                fontSize: 10,
                fontWeight: 'bold',
                marginTop: 4,
                color:
                  currentScreen === 'leadership'
                    ? '#5A31F4'
                    : activeTheme.colors.secondaryText,
              }}
            >
              {t('leadershipOversight')}
            </Text>
          </TouchableOpacity>
        </Box>
      )}

      {/* Sync Conflict Resolver Modal */}
      <SyncConflictModal />
    </SafeAreaView>
  );
};

export const App = () => {
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const activeTheme = themeMode === 'light' ? lightTheme : darkTheme;

  return (
    <SafeAreaProvider>
      <ThemeProvider theme={activeTheme}>
        <LanguageProvider>
          <AuthProvider>
            <ToastProvider>
              <AppContent
                themeMode={themeMode}
                setThemeMode={setThemeMode}
                activeTheme={activeTheme}
              />
            </ToastProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;
