import React, { useState, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { Box, Text } from '@burma-inventory/ui-components';
import { useErrorBoundary } from 'react-error-boundary';
import { database } from './database';
import { sqliteSchema } from '@burma-inventory/shared-types';
import { runGarbageCollection } from './garbageCollector';
import { useCartStore, CartSession } from '../store/cartStore';
import { setLatestAuditHash } from '../utils/audit';
import { desc } from 'drizzle-orm';

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

        // 1. Hydrate the latest audit event hash from sqlite
        try {
          const lastEvents = await database
            .select({ hash: sqliteSchema.audit_events.hash })
            .from(sqliteSchema.audit_events)
            .orderBy(desc(sqliteSchema.audit_events.created_at))
            .limit(1);
          if (lastEvents.length > 0 && lastEvents[0].hash) {
            setLatestAuditHash(lastEvents[0].hash);
          }
        } catch (hashErr) {
          console.warn('Failed to load latest audit event hash:', hashErr);
        }

        // 2. Hydrate all draft carts from SQLite to Zustand
        try {
          const drafts = await database.select().from(sqliteSchema.draft_carts);
          const sessions: Record<string, CartSession> = {};
          for (const draft of drafts) {
            try {
              sessions[draft.shop_id] = {
                selectedItems: JSON.parse(draft.items_json),
                selectedCurrency: draft.currency,
                selectedProjectId: draft.project_id,
                commercialStatus: 'ORDER_PLACED',
                type: 'SHOP_VISIT',
                notes: '',
                isOverrideMarginAcknowledged: false,
                screenshotUri: null,
                hasDiscrepancy: false,
                traceId: (draft as $Any).trace_id || null,
                negotiatedPrice: '',
                objectionReason: '',
                competitorPrice: '',
                viberMessageText: '',
              };
            } catch (jsonErr) {
              console.error('Failed to parse draft items_json:', jsonErr);
            }
          }
          useCartStore.setState({ sessions });
        } catch (draftErr) {
          console.error(
            '[Recovery] Failed to hydrate draft cart sessions:',
            draftErr,
          );
        }

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
