import React, { useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@shopify/restyle';
import {
  theme as lightTheme,
  darkTheme,
  getThemeForLanguage,
  Box,
} from '@burma-inventory/ui-components';
import { ShopLedgerScreen } from './ShopLedgerScreen';
import { GeographicHeatmapScreen } from './admin/GeographicHeatmapScreen';
import { TeamPulseScreen } from './admin/TeamPulseScreen';
import { IntakeScreen } from './IntakeScreen';
import { ViberSimulator } from './components/ViberSimulator';
import { SyncConflictModal } from './components/SyncConflictModal';
import { ToastProvider } from './components/ToastProvider';
import { LanguageProvider, useTranslation } from '../utils/i18n';
import { syncData } from '../sync';
import { powerSyncDb } from '../database';
import { useWindowDimensions, Platform, Alert } from 'react-native';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import { ImageUploadQueue } from '../utils/ImageUploadQueue';
import { AuthProvider, useAuth } from '../utils/auth';
import { NavBar, ROLE_SCREENS } from './components/NavBar';
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

  React.useEffect(() => {
    // 1. Process pending image uploads from background queue on startup
    ImageUploadQueue.processQueue().catch((err) => {
      console.error('[App] Background upload queue error:', err);
    });

    // 2. Perform Hardware Profile & Location Checks
    const runProfileChecks = async () => {
      if (Platform.OS === 'web') {
        if (isDesktop) {
          console.log(
            '[App] Environment: Running in Desktop Web view. Native location check-ins and device sensors are disabled.',
          );
          return;
        }
      }

      try {
        const isPhysDevice = Device.isDevice;
        console.log(
          `[App] Device Check: Physical Device = ${isPhysDevice}, Model = ${Device.modelName || 'Unknown'}`,
        );
      } catch (e) {
        console.warn('[App] Failed to check physical device status:', e);
      }

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn(
            '[App] Foreground location permission not granted. GPS check-ins will log as unverified.',
          );
        }
      } catch (e) {
        console.warn('[App] Failed to verify/request location permissions:', e);
      }
    };

    runProfileChecks();
  }, [isDesktop]);

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
        isSyncing={isSyncing}
        lastSync={lastSync}
        syncError={syncError}
        pendingChanges={pendingChanges}
        handleSync={handleSync}
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

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AppWithTheme themeMode={themeMode} setThemeMode={setThemeMode} />
      </LanguageProvider>
    </SafeAreaProvider>
  );
};

const AppWithTheme = ({ themeMode, setThemeMode }: any) => {
  const { language } = useTranslation();
  const baseTheme = themeMode === 'light' ? lightTheme : darkTheme;
  const activeTheme = getThemeForLanguage(baseTheme, language);

  return (
    <ThemeProvider theme={activeTheme}>
      <AuthProvider>
        <ToastProvider>
          <AppContent
            themeMode={themeMode}
            setThemeMode={setThemeMode}
            activeTheme={activeTheme}
          />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
