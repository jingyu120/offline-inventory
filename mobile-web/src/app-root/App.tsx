import React, { useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@shopify/restyle';
import {
  theme as lightTheme,
  darkTheme,
  Box,
} from '@burma-inventory/ui-components';
import { ShopLedgerScreen } from './ShopLedgerScreen';
import { GeographicHeatmapScreen } from './GeographicHeatmapScreen';
import { TeamPulseScreen } from './TeamPulseScreen';
import { IntakeScreen } from './IntakeScreen';
import { ViberSimulator } from './components/ViberSimulator';
import { SyncConflictModal } from './components/SyncConflictModal';
import { ToastProvider } from './components/ToastProvider';
import { LanguageProvider } from '../utils/i18n';
import { syncData } from '../sync';
import { powerSyncDb } from '../database';
import { useWindowDimensions } from 'react-native';
import { AuthProvider, useAuth } from '../utils/auth';
import { NavBar, ROLE_SCREENS } from './components/NavBar';
import { SyncStatusBar } from './components/SyncStatusBar';
import { BottomTabBar } from './components/BottomTabBar';

export const AppContent = ({ themeMode, setThemeMode, activeTheme }: any) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { activeRep } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<
    'ledger' | 'heatmap' | 'leadership' | 'intake' | 'viber-bot'
  >('ledger');

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState(0);

  const refreshPendingCount = React.useCallback(async () => {
    try {
      const stats = await powerSyncDb.getUploadQueueStats();
      setPendingChanges(stats.count);
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

    // Subscribe to PowerSync changes for interaction_logs to update badge count.
    const unsubscribe = powerSyncDb.onChange(
      {
        onChange: () => {
          refreshPendingCount().catch(console.error);
        },
      },
      { tables: ['interaction_logs'] },
    );

    return () => unsubscribe();
  }, [handleSync, refreshPendingCount]);

  React.useEffect(() => {
    const allowed = ROLE_SCREENS[activeRep.role];
    if (allowed && !allowed.includes(currentScreen)) {
      setCurrentScreen(allowed[0]);
    }
  }, [activeRep, currentScreen]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: activeTheme.colors.mainBackground }}
    >
      <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />

      <NavBar
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        activeTheme={activeTheme}
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
        isDesktop={isDesktop}
      />

      <SyncStatusBar
        isSyncing={isSyncing}
        lastSync={lastSync}
        syncError={syncError}
        pendingChanges={pendingChanges}
        handleSync={handleSync}
        isDesktop={isDesktop}
      />

      {/* Render Active Screen View */}
      <Box flex={1} zIndex={1}>
        {currentScreen === 'ledger' && <ShopLedgerScreen />}
        {currentScreen === 'heatmap' && <GeographicHeatmapScreen />}
        {currentScreen === 'leadership' && <TeamPulseScreen />}
        {currentScreen === 'intake' && <IntakeScreen />}
        {currentScreen === 'viber-bot' && <ViberSimulator />}
      </Box>

      {/* Sortly-style Mobile Bottom Navigation Tab Bar */}
      {!isDesktop && (
        <BottomTabBar
          currentScreen={currentScreen}
          setCurrentScreen={setCurrentScreen}
          activeTheme={activeTheme}
        />
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
