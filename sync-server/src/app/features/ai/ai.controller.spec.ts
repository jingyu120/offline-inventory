import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

describe('AiController', () => {
  let controller: AiController;
  let service: AiService;

  const mockAiService = {
    parseInteractionNote: jest.fn().mockResolvedValue({ summary: 'parsed' }),
    verifyViberScreenshot: jest.fn().mockResolvedValue({ verified: true }),
    analyzeSentiment: jest.fn().mockResolvedValue({ sentimentTrend: 'STABLE' }),
    generateEodDigest: jest
      .fn()
      .mockResolvedValue({ topPerformingRep: 'rep-1' }),
    ocrInvoice: jest.fn().mockResolvedValue({ success: true }),
    getDynamicQuotaOptimizations: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [{ provide: AiService, useValue: mockAiService }],
    }).compile();

    controller = module.get<AiController>(AiController);
    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('calls parseNote', async () => {
    const res = await controller.parseNote({
      note: 'test',
      quantization: 'q4',
    });
    expect(service.parseInteractionNote).toHaveBeenCalledWith('test', 'q4');
    expect(res).toEqual({ summary: 'parsed' });
  });

  it('calls verifyScreenshot', async () => {
    const res = await controller.verifyScreenshot({
      image: 'img',
      quantization: 'q4',
    });
    expect(service.verifyViberScreenshot).toHaveBeenCalledWith('img', 'q4');
    expect(res).toEqual({ verified: true });
  });

  it('calls analyzeSentiment', async () => {
    const res = await controller.analyzeSentiment({ notes: ['n1'] });
    expect(service.analyzeSentiment).toHaveBeenCalledWith(['n1']);
    expect(res).toEqual({ sentimentTrend: 'STABLE' });
  });

  it('calls eodDigest with custom date', async () => {
    const res = await controller.eodDigest({ date: '2026-06-04' });
    expect(service.generateEodDigest).toHaveBeenCalledWith('2026-06-04');
    expect(res).toEqual({ topPerformingRep: 'rep-1' });
  });

  it('calls eodDigest with default date when body is absent', async () => {
    await controller.eodDigest();
    expect(service.generateEodDigest).toHaveBeenCalledWith(expect.any(String));
  });

  it('calls ocrInvoice', async () => {
    const res = await controller.ocrInvoice({
      image: 'img',
      quantization: 'q4',
    });
    expect(service.ocrInvoice).toHaveBeenCalledWith('img', 'q4');
    expect(res).toEqual({ success: true });
  });

  it('calls quotaOptimizations', async () => {
    const res = await controller.quotaOptimizations();
    expect(service.getDynamicQuotaOptimizations).toHaveBeenCalled();
    expect(res).toEqual([]);
  });
});
