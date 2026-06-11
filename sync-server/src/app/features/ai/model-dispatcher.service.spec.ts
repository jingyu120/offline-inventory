import { Logger } from '@nestjs/common';
import axios from 'axios';
import { ModelDispatcherService } from './model-dispatcher.service';
import { AppConfig } from '../../core/config/app-config';

jest.mock('axios');

describe('ModelDispatcherService', () => {
  let logger: Logger;
  let warnSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  const baseConfig = {
    ollamaModel: 'gemma4',
    ollamaTimeoutMs: 5000,
    gemmaApiUrl: 'http://localhost:11434',
    ollamaMaxRetries: 0,
    ollamaBackoffMs: 0,
  };

  function createService(
    overrides: Partial<typeof baseConfig> = {},
  ): ModelDispatcherService {
    const config = { ...baseConfig, ...overrides } as unknown as AppConfig;
    return new ModelDispatcherService(config, logger);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    logger = new Logger('test');
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => undefined);
  });

  it('returns model text on a successful first attempt', async () => {
    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: { response: 'hello' },
    });
    const service = createService();
    const res = await service.dispatchModel('prompt');
    expect(res).toBe('hello');
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  it('appends quantization to a model name without a colon', async () => {
    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: { response: '{}' },
    });
    const service = createService();
    await service.dispatchModel('prompt', ['img'], 'json', 'modelOnly', 'q5');
    expect(axios.post).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ model: 'modelOnly:q5', images: ['img'] }),
      expect.any(Object),
    );
  });

  it('replaces the existing tag when the model name already has a colon', async () => {
    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: { response: '{}' },
    });
    const service = createService();
    await service.dispatchModel(
      'prompt',
      undefined,
      'json',
      'model:latest',
      'q4',
    );
    expect(axios.post).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ model: 'model:q4' }),
      expect.any(Object),
    );
  });

  it('returns null and warns when the response body is empty or malformed', async () => {
    (axios.post as jest.Mock).mockResolvedValueOnce({ data: null });
    const service = createService();
    const res = await service.dispatchModel('prompt');
    expect(res).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      'Ollama response was empty or malformed',
    );
  });

  it('returns null after a single failed attempt when no retries are configured', async () => {
    (axios.post as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const service = createService({ ollamaMaxRetries: 0 });
    const res = await service.dispatchModel('prompt');
    expect(res).toBeNull();
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(debugSpy).toHaveBeenCalledWith(
      expect.stringContaining('Ollama dispatch failed: boom'),
    );
  });

  it('retries on transient failure and succeeds on a later attempt', async () => {
    (axios.post as jest.Mock)
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce({ data: { response: 'recovered' } });
    const service = createService({ ollamaMaxRetries: 2, ollamaBackoffMs: 0 });
    const res = await service.dispatchModel('prompt');
    expect(res).toBe('recovered');
    expect(axios.post).toHaveBeenCalledTimes(2);
  });

  it('returns null after exhausting all retries', async () => {
    (axios.post as jest.Mock).mockRejectedValue(new Error('always fails'));
    const service = createService({ ollamaMaxRetries: 2, ollamaBackoffMs: 0 });
    const res = await service.dispatchModel('prompt');
    expect(res).toBeNull();
    expect(axios.post).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('waits for the configured backoff between retries', async () => {
    jest.useFakeTimers();
    (axios.post as jest.Mock)
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce({ data: { response: 'ok' } });
    const service = createService({
      ollamaMaxRetries: 1,
      ollamaBackoffMs: 100,
    });

    const promise = service.dispatchModel('prompt');
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(100);
    const res = await promise;

    expect(res).toBe('ok');
    jest.useRealTimers();
  });

  it('handles non-Error rejections defensively', async () => {
    (axios.post as jest.Mock).mockRejectedValueOnce('string failure');
    const service = createService({ ollamaMaxRetries: 0 });
    const res = await service.dispatchModel('prompt');
    expect(res).toBeNull();
    expect(debugSpy).toHaveBeenCalledWith(
      expect.stringContaining('string failure'),
    );
  });

  it('treats undefined retry/backoff config as zero retries', async () => {
    (axios.post as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const config = {
      ollamaModel: 'gemma4',
      ollamaTimeoutMs: 5000,
      gemmaApiUrl: 'http://localhost:11434',
    } as unknown as AppConfig;
    const service = new ModelDispatcherService(config, logger);
    const res = await service.dispatchModel('prompt');
    expect(res).toBeNull();
    expect(axios.post).toHaveBeenCalledTimes(1);
  });
});
