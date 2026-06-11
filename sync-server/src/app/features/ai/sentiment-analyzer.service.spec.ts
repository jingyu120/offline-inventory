import { Logger } from '@nestjs/common';
import { SentimentAnalyzerService } from './sentiment-analyzer.service';
import { ModelDispatcherService } from './model-dispatcher.service';

describe('SentimentAnalyzerService', () => {
  let logger: Logger;
  let dispatcher: { dispatchModel: jest.Mock };
  let service: SentimentAnalyzerService;

  beforeEach(() => {
    logger = new Logger('test');
    jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    dispatcher = { dispatchModel: jest.fn() };
    service = new SentimentAnalyzerService(
      dispatcher as unknown as ModelDispatcherService,
      logger,
    );
  });

  it('returns STABLE with the no-notes explanation for an empty list', async () => {
    const res = await service.analyzeSentiment([]);
    expect(res.sentimentTrend).toBe('STABLE');
    expect(res.explanation).toContain('No historical interaction logs');
    expect(dispatcher.dispatchModel).not.toHaveBeenCalled();
  });

  it('uses model output and applies defaults when fields are missing', async () => {
    dispatcher.dispatchModel.mockResolvedValueOnce('{}');
    const res = await service.analyzeSentiment(['some note']);
    expect(res.sentimentTrend).toBe('STABLE');
    expect(res.explanation).toBe('Stable client interactions.');
  });

  it('passes through explicit model sentiment trend and explanation', async () => {
    dispatcher.dispatchModel.mockResolvedValueOnce(
      '{"sentimentTrend":"IMPROVING","explanation":"Great"}',
    );
    const res = await service.analyzeSentiment(['note']);
    expect(res.sentimentTrend).toBe('IMPROVING');
    expect(res.explanation).toBe('Great');
  });

  it('counts a positive signal for happy notes but not when negated by unhappy', async () => {
    dispatcher.dispatchModel.mockResolvedValue(null);
    const positive = await service.analyzeSentiment(['client is happy']);
    expect(positive.sentimentTrend).toBe('IMPROVING');

    const negated = await service.analyzeSentiment(['client is unhappy']);
    expect(negated.sentimentTrend).toBe('DECLINING');
  });

  it('counts satisfied as positive but excludes dissatisfied / unsatisfied', async () => {
    dispatcher.dispatchModel.mockResolvedValue(null);
    const satisfied = await service.analyzeSentiment(['fully satisfied']);
    expect(satisfied.sentimentTrend).toBe('IMPROVING');

    const dissatisfied = await service.analyzeSentiment([
      'client dissatisfied',
    ]);
    expect(dissatisfied.sentimentTrend).toBe('STABLE');

    const unsatisfied = await service.analyzeSentiment(['client unsatisfied']);
    expect(unsatisfied.sentimentTrend).toBe('STABLE');
  });

  it('falls back to heuristics when model output is invalid JSON', async () => {
    dispatcher.dispatchModel.mockResolvedValueOnce('{not-json');
    const res = await service.analyzeSentiment(['balanced operational note']);
    expect(res.sentimentTrend).toBe('STABLE');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Ollama sentiment analysis failed'),
    );
  });
});
