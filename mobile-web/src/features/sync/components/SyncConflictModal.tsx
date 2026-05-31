import React from 'react';
import { Modal, ScrollView } from 'react-native';
import { Box, Text, Button } from '@burma-inventory/ui-components';
import { useSyncConflicts } from '../SyncConflictManager';
import { useTranslation } from '../../../core/i18n/i18n';
import { useTheme } from '@shopify/restyle';
import { Theme } from '@burma-inventory/ui-components';

// Error Boundary to prevent any render crash from crashing the whole app
class SyncConflictErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: $Any) {
    return { hasError: true };
  }

  override componentDidCatch(error: $Any, errorInfo: $Any) {
    console.error('SyncConflictModal crashed rendering:', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      // Return null or a subtle fallback so it doesn't crash the whole application
      return null;
    }
    return this.props.children;
  }
}

const SyncConflictModalContent: React.FC = () => {
  const conflicts = useSyncConflicts();
  const { t } = useTranslation();
  const theme = useTheme<Theme>();

  if (conflicts.length === 0) {
    return null;
  }

  // Get the first active conflict to resolve
  const current = conflicts[0];

  const handleResolve = (keepLocal: boolean) => {
    if (!current) return;
    if (keepLocal) {
      current.resolve(current.localRecord);
    } else {
      current.resolve(current.remoteRecord);
    }
  };

  // Helper to format values for display
  const renderRecordFields = (record: $Any) => {
    if (!record || typeof record !== 'object') {
      return (
        <Text variant="bodySecondary" fontSize={13}>
          {t('noRecordData')}
        </Text>
      );
    }

    return Object.entries(record)
      .filter(([key]) => !key.startsWith('_') && key !== 'id')
      .map(([key, value]) => {
        let valStr = '';
        if (value instanceof Date) {
          valStr = value.toLocaleString();
        } else if (value !== null && value !== undefined) {
          if (typeof value === 'object') {
            try {
              valStr = JSON.stringify(value);
            } catch (_) {
              valStr = String(value);
            }
          } else {
            valStr = String(value);
          }
        }

        return (
          <Box
            key={key}
            mb="xs"
            borderBottomWidth={1}
            borderColor="borderColor"
            pb="xs"
          >
            <Text
              variant="bodySecondary"
              fontSize={11}
              style={{ textTransform: 'uppercase' }}
            >
              {key}
            </Text>
            <Text variant="body" fontSize={13} fontWeight="medium">
              {valStr || t('empty') || '-'}
            </Text>
          </Box>
        );
      });
  };

  return (
    <Modal visible={true} transparent animationType="fade">
      <Box
        flex={1}
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)' }}
        justifyContent="center"
        alignItems="center"
        px="m"
      >
        <Box
          p="m"
          width="100%"
          bg="cardBackground"
          style={{
            maxWidth: 600,
            maxHeight: '85%',
            borderRadius: 16,
            boxShadow: '0px 10px 20px rgba(0,0,0,0.3)',
            elevation: 10,
          }}
        >
          {/* Header */}
          <Box mb="m" borderBottomWidth={1} borderColor="borderColor" pb="s">
            <Text variant="title" style={{ color: theme.colors.dangerText }}>
              ⚠️ {t('syncConflictTitle')}
            </Text>
            <Text variant="bodySecondary" mt="xs">
              {t('syncConflictDesc')}
            </Text>
            <Box
              bg="secondaryBackground"
              px="s"
              py="xs"
              borderRadius="s"
              mt="s"
              style={{ alignSelf: 'flex-start' }}
            >
              <Text variant="badge" color="secondaryText">
                {(t('syncConflictMeta') || 'Table: {table} | ID: {id}')
                  .replace('{table}', (current.table || '').toUpperCase())
                  .replace('{id}', current.id || '')}
              </Text>
            </Box>
          </Box>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            <Box
              flexDirection="row"
              flexWrap="wrap"
              justifyContent="space-between"
            >
              {/* Local Version Column */}
              <Box
                width="48%"
                minWidth={250}
                p="m"
                borderRadius="m"
                borderWidth={1.5}
                borderColor="primaryButton"
                style={{ backgroundColor: theme.colors.brandBg }}
                mb="m"
              >
                <Text
                  variant="body"
                  fontWeight="bold"
                  color="primaryButton"
                  mb="m"
                >
                  💻 {t('localVersion')}
                </Text>
                {renderRecordFields(current.localRecord)}
                <Box mt="l">
                  <Button
                    title={t('keepLocal')}
                    variant="primary"
                    onPress={() => handleResolve(true)}
                  />
                </Box>
              </Box>

              {/* Remote Version Column */}
              <Box
                width="48%"
                minWidth={250}
                p="m"
                borderRadius="m"
                borderWidth={1.5}
                borderColor="success"
                style={{ backgroundColor: theme.colors.successBg }}
                mb="m"
              >
                <Text variant="body" fontWeight="bold" color="success" mb="m">
                  🌐 {t('serverVersion')}
                </Text>
                {renderRecordFields(current.remoteRecord)}
                <Box mt="l">
                  <Button
                    title={t('keepServer')}
                    variant="primary"
                    onPress={() => handleResolve(false)}
                    style={{ backgroundColor: theme.colors.success }}
                  />
                </Box>
              </Box>
            </Box>
          </ScrollView>

          {/* Footer status */}
          <Box
            borderTopWidth={1}
            borderColor="borderColor"
            pt="s"
            alignItems="center"
          >
            <Text variant="bodySecondary" fontSize={12}>
              {conflicts.length} {t('unresolvedConflicts')}
            </Text>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

export const SyncConflictModal: React.FC = () => {
  return (
    <SyncConflictErrorBoundary>
      <SyncConflictModalContent />
    </SyncConflictErrorBoundary>
  );
};
