import { Logger } from '@nestjs/common';
import { PaymentOcrService } from './payment-ocr.service';
import { ModelDispatcherService } from './model-dispatcher.service';
import { DrizzleService } from '../../core/drizzle';

describe('PaymentOcrService', () => {
  let logger: Logger;
  let dispatcher: { dispatchModel: jest.Mock };
  let service: PaymentOcrService;

  beforeEach(() => {
    logger = new Logger('test');
    jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    dispatcher = { dispatchModel: jest.fn() };
    service = new PaymentOcrService(
      {} as DrizzleService,
      dispatcher as unknown as ModelDispatcherService,
      logger,
    );
  });

  it('parses a string amount with separators and reports HIGH confidence', async () => {
    dispatcher.dispatchModel.mockResolvedValueOnce(
      JSON.stringify({
        transactionId: 'TXN-1',
        amount: '150,000 Ks',
        timestamp: null,
        senderName: null,
        rawText: 'raw',
      }),
    );
    const res = await service.parsePaymentTransfer('img');
    expect(res.amount).toBe(150000);
    expect(res.confidence).toBe('HIGH');
  });

  it('reports LOW confidence when neither amount nor transaction id is present', async () => {
    dispatcher.dispatchModel.mockResolvedValueOnce(
      JSON.stringify({
        transactionId: null,
        amount: null,
        timestamp: '2026-06-08',
        senderName: 'U Aung',
        rawText: 'partial',
      }),
    );
    const res = await service.parsePaymentTransfer('img');
    expect(res.amount).toBeNull();
    expect(res.confidence).toBe('LOW');
  });

  it('returns FAILED when the dispatcher yields no response', async () => {
    dispatcher.dispatchModel.mockResolvedValueOnce(null);
    const res = await service.parsePaymentTransfer('img');
    expect(res.confidence).toBe('FAILED');
  });
});
