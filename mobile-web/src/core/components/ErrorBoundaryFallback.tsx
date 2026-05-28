import React from 'react';
import { Box, Text, Button, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { Platform } from 'react-native';
import { FallbackProps } from 'react-error-boundary';

export const ErrorBoundaryFallback: React.FC<FallbackProps> = ({
  error,
  resetErrorBoundary,
}) => {
  const theme = useTheme<Theme>();

  const handleReset = async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.indexedDB) {
          window.indexedDB.deleteDatabase('BurmaInventoryDB');
          window.indexedDB.deleteDatabase('tile-cache-db');
          window.localStorage.clear();
          window.location.reload();
        }
      } else {
        // Native reset
        const { IOS_DOCUMENT_PATH, ANDROID_DATABASE_PATH } = await import(
          '@op-engineering/op-sqlite'
        );
        const { opsqliteDb } = await import('../database/database.native');
        try {
          opsqliteDb.close();
        } catch {
          // Ignore close error
        }

        const baseDir =
          Platform.OS === 'ios' ? IOS_DOCUMENT_PATH : ANDROID_DATABASE_PATH;
        const ensureFileUri = (path: string) =>
          path.startsWith('file://') ? path : `file://${path}`;

        const dbFiles = [
          'burma_inventory.sqlite',
          'burma_inventory.sqlite-journal',
          'burma_inventory.sqlite-wal',
          'burma_inventory.sqlite-shm',
          'map_tiles.mbtiles',
          'map_tiles.mbtiles-journal',
          'map_tiles.mbtiles-wal',
          'map_tiles.mbtiles-shm',
        ];
        const FileSystem = await import('expo-file-system');

        for (const file of dbFiles) {
          try {
            const path = ensureFileUri(`${baseDir}/${file}`);
            await FileSystem.deleteAsync(path, { idempotent: true });
          } catch (err) {
            console.warn(`Failed to delete native db file: ${file}`, err);
          }
        }

        const { DevSettings } = await import('react-native');
        DevSettings.reload();
      }
    } catch (e) {
      console.error('Failed to reset local cache:', e);
      resetErrorBoundary();
    }
  };

  return (
    <Box
      flex={1}
      justifyContent="center"
      alignItems="center"
      bg="mainBackground"
      p="l"
    >
      <Box
        p="l"
        borderRadius="l"
        borderWidth={1.5}
        borderColor="danger"
        bg="dangerBg"
        maxWidth={500}
        width="100%"
        alignItems="center"
      >
        <Text variant="header" color="dangerText" mb="s" textAlign="center">
          ⚠ Local Database Panic
        </Text>
        <Text variant="body" color="dangerText" mb="m" textAlign="center">
          A critical database thread error or startup panic occurred. The local
          storage might be corrupted.
        </Text>
        <Box
          p="m"
          bg="cardBackground"
          borderRadius="m"
          borderWidth={1}
          borderColor="borderColor"
          width="100%"
          mb="l"
        >
          <Text
            variant="caption"
            style={{
              fontFamily: 'monospace',
              color: theme.colors.primaryText,
            }}
          >
            {(error as any)?.message || 'Unknown panic error'}
          </Text>
        </Box>
        <Button
          title="Reset Local Cache & Reload"
          variant="primary"
          onPress={handleReset}
        />
      </Box>
    </Box>
  );
};
