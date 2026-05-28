import '../env';
import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@shopify/restyle';
import {
  theme as lightTheme,
  darkTheme,
  getThemeForLanguage,
  Box,
  registerExchangeRateResolver,
} from '@burma-inventory/ui-components';
import { sqliteSchema } from '@burma-inventory/shared-types';
import { ShopLedgerScreen } from '../features/audit/screens/ShopLedgerScreen';
import { GeographicHeatmapScreen } from '../features/admin/screens/GeographicHeatmapScreen';
import { TeamPulseScreen } from '../features/admin/screens/TeamPulseScreen';
import { IntakeScreen } from '../features/inventory/screens/IntakeScreen';
import { ViberSimulator } from '../features/viber/components/ViberSimulator';
import { SyncConflictModal } from '../features/sync/components/SyncConflictModal';
import { ToastProvider } from '../core/components/ToastProvider';
import { LanguageProvider, useTranslation } from '../core/i18n/i18n';
import { syncData } from '../features/sync/sync';
import { powerSyncDb, database } from '../core/database/database';
import { useWindowDimensions, Platform, Alert } from 'react-native';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import { ImageUploadQueue } from '../features/sync/ImageUploadQueue';
import { registerBackgroundSyncAsync } from '../features/sync/backgroundTasks';
import { AuthProvider, useAuth } from '../core/auth/auth';
import { NavBar, ROLE_SCREENS } from '../core/components/NavBar';
import { BottomTabBar } from '../core/components/BottomTabBar';
import { SyncStatusBar } from '../features/sync/components/SyncStatusBar';
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorBoundaryFallback } from '../core/components/ErrorBoundaryFallback';
import { DatabaseInitializer } from '../core/database/DatabaseInitializer';
import { TelemetryLogger } from '../core/utils/telemetry';

registerExchangeRateResolver(async (currency) => {
  try {
    const rates = await database
      .select()
      .from(sqliteSchema.currency_exchange_rates);
    const rateObj = rates.find((r: any) => r.currency === currency);
    return rateObj ? rateObj.rate_to_kyat : undefined;
  } catch (err) {
    console.warn('[App] Failed to resolve exchange rate from database:', err);
    return undefined;
  }
});

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
    // 0. Setup global error telemetry logging
    let webErrorHandler: any;
    let webPromiseHandler: any;

    if (Platform.OS !== 'web') {
      const globalHandler = ErrorUtils.getGlobalHandler();
      ErrorUtils.setGlobalHandler((error: any, isFatal: any) => {
        TelemetryLogger.logEvent(
          'thread_panic',
          `Fatal: ${isFatal} | Error: ${error?.message || String(error)} | Stack: ${error?.stack || ''}`,
        ).catch((err) => console.error('[Telemetry] Failed to log:', err));
        globalHandler(error, isFatal);
      });
    } else {
      webErrorHandler = (event: ErrorEvent) => {
        TelemetryLogger.logEvent(
          'thread_panic',
          `Web Error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
        ).catch((err) => console.error('[Telemetry] Failed to log:', err));
      };
      window.addEventListener('error', webErrorHandler);

      webPromiseHandler = (event: PromiseRejectionEvent) => {
        TelemetryLogger.logEvent(
          'thread_panic',
          `Unhandled Rejection: ${event.reason?.message || String(event.reason)}`,
        ).catch((err) => console.error('[Telemetry] Failed to log:', err));
      };
      window.addEventListener('unhandledrejection', webPromiseHandler);
    }

    // 1. Prioritize lightweight JSON data sync first on startup
    const startSync = async () => {
      try {
        console.log('[App] Performing startup delta synchronization...');
        const { syncData } = await import('../features/sync/sync');
        await syncData();

        // 2. Process pending image uploads only if connection is not degraded
        const NetInfo = (await import('@react-native-community/netinfo'))
          .default;
        const state = await NetInfo.fetch();
        const is2G =
          state.type === 'cellular' &&
          state.details?.cellularGeneration === '2g';
        const isMockDegraded = (global as any).__mockNetworkDegraded === true;

        if (is2G || isMockDegraded) {
          console.log(
            '[App] Connection degraded. Postponing image upload queue processing.',
          );
        } else {
          await ImageUploadQueue.processQueue();
        }
      } catch (err) {
        console.error('[App] Startup sync or upload queue error:', err);
      }
    };

    startSync();

    // Register background sync task
    registerBackgroundSyncAsync().catch((err) => {
      console.error('[App] Background sync registration error:', err);
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

    return () => {
      if (Platform.OS === 'web') {
        if (webErrorHandler)
          window.removeEventListener('error', webErrorHandler);
        if (webPromiseHandler)
          window.removeEventListener('unhandledrejection', webPromiseHandler);
      }
    };
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

  const { language } = useTranslation();

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

      <SyncStatusBar
        isSyncing={isSyncing}
        syncError={syncError}
        pendingChanges={pendingChanges}
        lastSync={lastSync}
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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
          <DatabaseInitializer>
            <AuthProvider>
              <ToastProvider>
                <AppContent
                  themeMode={themeMode}
                  setThemeMode={setThemeMode}
                  activeTheme={activeTheme}
                />
              </ToastProvider>
            </AuthProvider>
          </DatabaseInitializer>
        </ErrorBoundary>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
};

export default App;
