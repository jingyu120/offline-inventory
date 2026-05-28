import React, { useState, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { Box, Text } from '@burma-inventory/ui-components';
import { useErrorBoundary } from 'react-error-boundary';
import { database } from './database';
import { sqliteSchema } from '@burma-inventory/shared-types';
import { runGarbageCollection } from './garbageCollector';

export const DatabaseInitializer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [initialized, setInitialized] = useState(false);
  const { showBoundary } = useErrorBoundary();

  useEffect(() => {
    const initDb = async () => {
      try {
        // Query database to trigger lazy loading and schema setup (Web)
        // or verify native connection (Native)
        await database.select().from(sqliteSchema.shops).limit(1);
        await runGarbageCollection();
        setInitialized(true);
      } catch (err) {
        console.error('Database initialization failed:', err);
        showBoundary(err);
      }
    };
    initDb();
  }, [showBoundary]);

  if (!initialized) {
    return (
      <Box
        flex={1}
        justifyContent="center"
        alignItems="center"
        bg="mainBackground"
      >
        <ActivityIndicator size="large" color="#5A31F4" />
        <Text variant="body" mt="s" color="secondaryText">
          Initializing local database...
        </Text>
      </Box>
    );
  }

  return <>{children}</>;
};
