import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import {
  Box,
  Text,
  Card,
  Button,
  Theme,
  ThemedTextInput,
} from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { trpcClient } from '../../../core/trpc/trpcClient';
import {
  AlertCircle,
  Trash2,
  RefreshCw,
  Edit3,
  X,
  CheckCircle,
  Terminal,
} from 'lucide-react-native';
import { useTranslation } from '../../../core/i18n/i18n';

const PLATFORM_IOS = 'ios';

export const DlqDashboard: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [jobs, setJobs] = useState<$Any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<$Any | null>(null);

  // JSON Editor state
  const [payloadText, setPayloadText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    setSuccessMessage(null);
    try {
      const data = await trpcClient.getFailedJobs.query();
      setJobs(data || []);
    } catch (e) {
      console.error('[DLQ] Failed to load failed jobs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleSelectJob = (job: $Any) => {
    setSelectedJob(job);
    setPayloadText(JSON.stringify(job.data, null, 2));
    setJsonError(null);
    setSuccessMessage(null);
  };

  const handlePayloadChange = (text: string) => {
    setPayloadText(text);
    try {
      JSON.parse(text);
      setJsonError(null);
    } catch (e: $Any) {
      setJsonError(`Invalid JSON: ${e.message}`);
    }
  };

  const handleUpdateJobData = async () => {
    if (!selectedJob) return;
    if (jsonError) {
      alert(t('fixJsonErrors'));
      return;
    }

    setActionLoading(true);
    try {
      const parsedData = JSON.parse(payloadText);
      await trpcClient.updateJobData.mutate({
        jobId: selectedJob.id,
        data: parsedData,
      });

      // Update local state
      const updatedJobs = jobs.map((j) => {
        if (j.id === selectedJob.id) {
          return { ...j, data: parsedData };
        }
        return j;
      });
      setJobs(updatedJobs);
      setSelectedJob({ ...selectedJob, data: parsedData });

      setSuccessMessage(t('jobPayloadUpdated'));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e: $Any) {
      console.error('[DLQ] Failed to update job data:', e);
      alert(t('failedUpdateJob', { error: e.message || e }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    setActionLoading(true);
    try {
      await trpcClient.retryJob.mutate({ jobId });
      setSelectedJob(null);
      await fetchJobs();
      setSuccessMessage(t('jobRequeuedSuccess'));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e: $Any) {
      console.error('[DLQ] Failed to retry job:', e);
      alert(t('failedRetryJob', { error: e.message || e }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveJob = async (jobId: string) => {
    if (!confirm(t('deleteJobConfirm'))) return;

    setActionLoading(true);
    try {
      await trpcClient.removeJob.mutate({ jobId });
      setSelectedJob(null);
      await fetchJobs();
      setSuccessMessage(t('jobDeletedSuccess'));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e: $Any) {
      console.error('[DLQ] Failed to remove job:', e);
      alert(t('failedDeleteJob', { error: e.message || e }));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Box p="m">
      <Card p="m" bg="cardBackground">
        <Box
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          mb="m"
        >
          <Box flex={1} mr="s">
            <Text variant="title">{t('dlqTitle')}</Text>
            <Text variant="bodySecondary">{t('dlqDesc')}</Text>
          </Box>
          <Button
            title={loading ? t('refreshing') : t('refresh')}
            onPress={fetchJobs}
            variant="outline"
            size="small"
            disabled={loading || actionLoading}
          />
        </Box>

        {successMessage && (
          <Box
            bg="successBg"
            p="s"
            borderRadius="s"
            mb="m"
            flexDirection="row"
            alignItems="center"
            gap="s"
          >
            <CheckCircle size={16} color={theme.colors.successText} />
            <Text variant="body" color="successText" fontWeight="bold">
              {successMessage}
            </Text>
          </Box>
        )}

        {selectedJob ? (
          <Box gap="m">
            {/* Header for details view */}
            <Box
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Box>
                <Text variant="body" fontWeight="bold">
                  {t('jobId', { id: selectedJob.id })}
                </Text>
                <Text variant="bodySecondary">
                  {t('jobNameFailed', {
                    name: selectedJob.name,
                    date: new Date(selectedJob.timestamp).toLocaleString(),
                  })}
                </Text>
              </Box>
              <TouchableOpacity onPress={() => setSelectedJob(null)}>
                <X size={20} color={theme.colors.primaryText} />
              </TouchableOpacity>
            </Box>

            <Box flexDirection={isDesktop ? 'row' : 'column'} gap="m">
              {/* Left Column: Stacktrace & Reason */}
              <Box
                flex={1}
                style={{ backgroundColor: '#0f172a' }}
                p="m"
                borderRadius="m"
                minHeight={350}
              >
                <Box flexDirection="row" alignItems="center" gap="s" mb="s">
                  <Terminal size={16} color="#34d399" />
                  <Text
                    variant="body"
                    style={{
                      color: '#34d399',
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                    }}
                  >
                    {t('traceOutput')}
                  </Text>
                </Box>

                <Text
                  variant="body"
                  style={{
                    color: '#f87171',
                    fontFamily: 'monospace',
                    fontSize: 13,
                    marginBottom: 12,
                  }}
                >
                  {t('reason', { reason: selectedJob.failedReason })}
                </Text>

                <ScrollView style={{ flex: 1, maxHeight: 300 }}>
                  <Text
                    variant="body"
                    style={{
                      color: '#cbd5e1',
                      fontFamily: 'monospace',
                      fontSize: 11,
                      lineHeight: 16,
                    }}
                  >
                    {Array.isArray(selectedJob.stacktrace) &&
                    selectedJob.stacktrace.length > 0
                      ? selectedJob.stacktrace.join('\n')
                      : selectedJob.stacktrace || t('noStacktrace')}
                  </Text>
                </ScrollView>
              </Box>

              {/* Right Column: Payload JSON Editor */}
              <Box
                flex={1}
                bg="mainBackground"
                p="m"
                borderRadius="m"
                borderWidth={1}
                borderColor="borderColor"
              >
                <Box
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                  mb="s"
                >
                  <Text variant="body" fontWeight="bold">
                    {t('payloadParamsJson')}
                  </Text>
                  {jsonError && (
                    <Text
                      variant="body"
                      color="errorText"
                      style={{ fontSize: 11, fontWeight: 'bold' }}
                    >
                      {jsonError}
                    </Text>
                  )}
                </Box>

                <ThemedTextInput
                  multiline
                  value={payloadText}
                  onChangeText={handlePayloadChange}
                  p="s"
                  borderColor={jsonError ? 'errorText' : 'slate300'}
                  borderWidth={1}
                  borderRadius="s"
                  bg="cardBackground"
                  minHeight={250}
                  style={{
                    fontFamily:
                      Platform.OS === PLATFORM_IOS ? 'Courier' : 'monospace',
                    fontSize: 12,
                    textAlignVertical: 'top',
                    color: theme.colors.primaryText,
                  }}
                />

                <Box mt="m" flexDirection="row" gap="s">
                  <Box flex={1}>
                    <Button
                      title={t('updatePayload')}
                      onPress={handleUpdateJobData}
                      variant="outline"
                      disabled={actionLoading || !!jsonError}
                      size="small"
                    />
                  </Box>
                  <Box flex={1}>
                    <Button
                      title={t('retryJobNow')}
                      onPress={() => handleRetryJob(selectedJob.id)}
                      variant="primary"
                      disabled={actionLoading}
                      size="small"
                    />
                  </Box>
                  <Box flex={0.8}>
                    <Button
                      title={t('deleteJob')}
                      onPress={() => handleRemoveJob(selectedJob.id)}
                      variant="outline"
                      disabled={actionLoading}
                      size="small"
                    />
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        ) : (
          /* List of failed jobs */
          <Box>
            {loading ? (
              <Box py="xl" justifyContent="center" alignItems="center">
                <ActivityIndicator
                  size="small"
                  color={theme.colors.primaryButton}
                />
              </Box>
            ) : jobs.length === 0 ? (
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
                <Text
                  variant="body"
                  fontWeight="bold"
                  color="successText"
                  mt="s"
                  mb="xs"
                >
                  {t('queueHealthy')}
                </Text>
                <Text variant="bodySecondary">{t('noFailedJobs')}</Text>
              </Box>
            ) : (
              <ScrollView style={{ maxHeight: 600 }}>
                <Box gap="s">
                  {jobs.map((job) => (
                    <Box
                      key={job.id}
                      p="m"
                      borderRadius="m"
                      borderWidth={1}
                      borderColor="borderColor"
                      bg="mainBackground"
                      flexDirection={isDesktop ? 'row' : 'column'}
                      justifyContent="space-between"
                      alignItems={isDesktop ? 'center' : 'stretch'}
                      gap="m"
                    >
                      <Box flex={1}>
                        <Box
                          flexDirection="row"
                          alignItems="center"
                          gap="s"
                          mb="xs"
                        >
                          <Box
                            bg="errorBackground"
                            px="s"
                            py="xs"
                            borderRadius="s"
                            flexDirection="row"
                            alignItems="center"
                            gap="xs"
                          >
                            <AlertCircle
                              size={12}
                              color={theme.colors.errorText}
                            />
                            <Text
                              variant="body"
                              fontWeight="bold"
                              color="errorText"
                              style={{ fontSize: 11 }}
                            >
                              {t('failed')}
                            </Text>
                          </Box>
                          <Text variant="body" fontWeight="bold">
                            {job.name}
                          </Text>
                        </Box>
                        <Text
                          variant="body"
                          style={{
                            color: theme.colors.errorText,
                            fontSize: 13,
                            marginBottom: 4,
                          }}
                        >
                          {t('reason', { reason: job.failedReason })}
                        </Text>
                        <Text variant="bodySecondary" style={{ fontSize: 12 }}>
                          {t('jobIdFailedAt', {
                            id: job.id,
                            date: new Date(job.timestamp).toLocaleString(),
                          })}
                        </Text>
                      </Box>

                      <Box
                        flexDirection="row"
                        gap="s"
                        alignSelf={isDesktop ? 'center' : 'flex-end'}
                      >
                        <Button
                          title={t('inspectEdit')}
                          onPress={() => handleSelectJob(job)}
                          variant="primary"
                          size="small"
                        />
                        <Button
                          title={t('retry')}
                          onPress={() => handleRetryJob(job.id)}
                          variant="outline"
                          size="small"
                          disabled={actionLoading}
                        />
                        <TouchableOpacity
                          style={{
                            justifyContent: 'center',
                            alignItems: 'center',
                            width: 32,
                            height: 32,
                            borderRadius: 4,
                            borderWidth: 1,
                            borderColor: theme.colors.borderColor,
                            backgroundColor: theme.colors.mainBackground,
                          }}
                          onPress={() => handleRemoveJob(job.id)}
                        >
                          <Trash2 size={16} color={theme.colors.errorText} />
                        </TouchableOpacity>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </ScrollView>
            )}
          </Box>
        )}
      </Card>
    </Box>
  );
};
