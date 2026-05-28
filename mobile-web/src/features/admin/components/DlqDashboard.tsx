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

export const DlqDashboard: React.FC = () => {
  const theme = useTheme<Theme>();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

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

  const handleSelectJob = (job: any) => {
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
    } catch (e: any) {
      setJsonError(`Invalid JSON: ${e.message}`);
    }
  };

  const handleUpdateJobData = async () => {
    if (!selectedJob) return;
    if (jsonError) {
      alert('Please fix the JSON errors before updating.');
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

      setSuccessMessage('Job payload updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e: any) {
      console.error('[DLQ] Failed to update job data:', e);
      alert(`Failed to update job: ${e.message || e}`);
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
      setSuccessMessage('Job successfully re-queued for execution!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e: any) {
      console.error('[DLQ] Failed to retry job:', e);
      alert(`Failed to retry job: ${e.message || e}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job from the queue?'))
      return;

    setActionLoading(true);
    try {
      await trpcClient.removeJob.mutate({ jobId });
      setSelectedJob(null);
      await fetchJobs();
      setSuccessMessage('Job removed from the queue.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e: any) {
      console.error('[DLQ] Failed to remove job:', e);
      alert(`Failed to delete job: ${e.message || e}`);
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
            <Text variant="title">Dead Letter Queue (DLQ) Manager</Text>
            <Text variant="bodySecondary">
              Monitor, debug, edit, and retry failed background asynchronous
              task queue jobs.
            </Text>
          </Box>
          <Button
            title={loading ? 'Refreshing...' : 'Refresh'}
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
                  Job ID: {selectedJob.id}
                </Text>
                <Text variant="bodySecondary">
                  Name: {selectedJob.name} | Failed:{' '}
                  {new Date(selectedJob.timestamp).toLocaleString()}
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
                    Trace Output
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
                  Reason: {selectedJob.failedReason}
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
                      : selectedJob.stacktrace || 'No stack trace available.'}
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
                    Payload Parameters (JSON)
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
                    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                    fontSize: 12,
                    textAlignVertical: 'top',
                    color: theme.colors.primaryText,
                  }}
                />

                <Box mt="m" flexDirection="row" gap="s">
                  <Box flex={1}>
                    <Button
                      title="Update Payload"
                      onPress={handleUpdateJobData}
                      variant="outline"
                      disabled={actionLoading || !!jsonError}
                      size="small"
                    />
                  </Box>
                  <Box flex={1}>
                    <Button
                      title="Retry Job Now"
                      onPress={() => handleRetryJob(selectedJob.id)}
                      variant="primary"
                      disabled={actionLoading}
                      size="small"
                    />
                  </Box>
                  <Box flex={0.8}>
                    <Button
                      title="Delete Job"
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
                  Queue is Healthy!
                </Text>
                <Text variant="bodySecondary">
                  No failed background jobs found in the DLQ.
                </Text>
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
                              FAILED
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
                          Reason: {job.failedReason}
                        </Text>
                        <Text variant="bodySecondary" style={{ fontSize: 12 }}>
                          Job ID: {job.id} | Failed at:{' '}
                          {new Date(job.timestamp).toLocaleString()}
                        </Text>
                      </Box>

                      <Box
                        flexDirection="row"
                        gap="s"
                        alignSelf={isDesktop ? 'center' : 'flex-end'}
                      >
                        <Button
                          title="Inspect & Edit"
                          onPress={() => handleSelectJob(job)}
                          variant="primary"
                          size="small"
                        />
                        <Button
                          title="Retry"
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
