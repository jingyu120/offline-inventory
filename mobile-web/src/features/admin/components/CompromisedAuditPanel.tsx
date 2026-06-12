import React from 'react';
import { ActivityIndicator } from 'react-native';
import { Box, Text, Card, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { ShieldAlert, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { useTranslation } from '../../../core/i18n/i18n';
import {
  useCompromisedAuditEvents,
  CompromisedAuditEvent,
} from '../hooks/useCompromisedAuditEvents';

/** A single compromised audit event row. */
const CompromisedAuditRow: React.FC<{ event: CompromisedAuditEvent }> = ({
  event,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();

  return (
    <Box
      p="m"
      borderRadius="m"
      borderWidth={1}
      borderColor="danger"
      bg="dangerBg"
      gap="xs"
    >
      <Box flexDirection="row" alignItems="center" gap="s">
        <AlertTriangle size={16} color={theme.colors.dangerText} />
        <Text variant="body" fontWeight="bold" color="dangerText">
          {t('auditEventId')}: {event.eventId}
        </Text>
      </Box>
      <Text variant="bodySecondary" fontSize={12}>
        {t('auditEntityType')}: {event.entityType} | {t('auditAction')}:{' '}
        {event.action}
      </Text>
      <Text variant="bodySecondary" fontSize={11}>
        {t('auditCreatedAt')}: {new Date(event.createdAt).toLocaleString()}
      </Text>
    </Box>
  );
};

/**
 * Read-only Leadership Oversight panel listing audit_events that the server
 * flagged COMPROMISED (broken hash chain). Purely presentational: all data
 * access lives in useCompromisedAuditEvents.
 */
export const CompromisedAuditPanel: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();
  const { events, loading, error } = useCompromisedAuditEvents();

  return (
    <Box p="m">
      <Card p="m" bg="cardBackground">
        <Box flexDirection="row" alignItems="center" gap="s" mb="s">
          <ShieldAlert size={20} color={theme.colors.dangerText} />
          <Box flex={1}>
            <Text variant="title">{t('compromisedAuditTitle')}</Text>
            <Text variant="bodySecondary">{t('compromisedAuditDesc')}</Text>
          </Box>
        </Box>

        {loading ? (
          <Box py="xl" justifyContent="center" alignItems="center">
            <ActivityIndicator
              size="small"
              color={theme.colors.primaryButton}
            />
          </Box>
        ) : error ? (
          <Box
            p="m"
            borderRadius="m"
            borderWidth={1}
            borderColor="danger"
            bg="dangerBg"
            flexDirection="row"
            alignItems="center"
            gap="s"
          >
            <AlertTriangle size={16} color={theme.colors.dangerText} />
            <Text variant="body" color="dangerText" fontWeight="bold">
              {t('compromisedAuditLoadError')}
            </Text>
          </Box>
        ) : events.length === 0 ? (
          <Box
            p="xl"
            borderStyle="dashed"
            borderWidth={1.5}
            borderColor="borderColor"
            borderRadius="m"
            justifyContent="center"
            alignItems="center"
          >
            <CheckCircle size={32} color={theme.colors.successText} />
            <Text variant="body" fontWeight="bold" color="successText" mt="s">
              {t('noCompromisedAuditEvents')}
            </Text>
          </Box>
        ) : (
          <Box gap="s">
            {events.map((event) => (
              <CompromisedAuditRow key={event.eventId} event={event} />
            ))}
          </Box>
        )}
      </Card>
    </Box>
  );
};
