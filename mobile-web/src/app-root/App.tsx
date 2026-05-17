import React from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@shopify/restyle';
import { theme } from '@burma-inventory/ui-components';
import { ShopLedgerScreen } from './ShopLedgerScreen';
import { syncData } from '../sync';

export const App = () => {
  React.useEffect(() => {
    // syncData().catch(console.error);
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider theme={theme}>
        <SafeAreaView
          style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}
        >
          <StatusBar style="dark" />
          <ShopLedgerScreen />
        </SafeAreaView>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;
