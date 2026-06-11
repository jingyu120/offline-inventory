import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DrizzleService } from '../../core/drizzle';
import { AppConfig } from '../../core/config/app-config';
import * as fs from 'fs';
import * as path from 'path';
import * as schema from '@burma-inventory/shared-types';
import { eq, and, isNull } from 'drizzle-orm';

import { AiQueueService } from '../../core/queue/ai-queue.service';
import {
  ModelDispatcherService,
  ModelResponseFormat,
} from './model-dispatcher.service';
import {
  SentimentAnalyzerService,
  SentimentResult,
} from './sentiment-analyzer.service';
import {
  EodCompilerService,
  EodCompileResult,
  EodDigest,
} from './eod-compiler.service';
import {
  PaymentOcrService,
  PaymentTransferResult,
  FifoReconciliationResult,
} from './payment-ocr.service';
import {
  ScreenshotVerifierService,
  ViberVerificationResult,
  OcrInvoiceResult,
} from './screenshot-verifier.service';

export interface ParsedInteractionNote {
  commercialStatus: string;
  items: { sku: string; quantity: number }[];
  summary: string;
}

const DEFAULT_PREMIUM_BEER_SKU = 'SKU-PB-640';
const DEFAULT_PREMIUM_BEER_QUANTITY = 5;
const NOTE_SUMMARY_FALLBACK_LENGTH = 50;

/**
 * Facade that orchestrates the AI feature collaborators. Public method
 * signatures are preserved so the controller, tRPC router and queue worker
 * continue to depend on this single entry point. Collaborators are constructed
 * with the shared logger so their diagnostics surface under one namespace.
 */
@Injectable()
export class AiService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiService.name);
  private watcher: fs.FSWatcher | null = null;
  private processingFiles = new Set<string>();

  private readonly dispatcher: ModelDispatcherService;
  private readonly sentimentAnalyzer: SentimentAnalyzerService;
  private readonly eodCompiler: EodCompilerService;
  private readonly paymentOcr: PaymentOcrService;
  private readonly screenshotVerifier: ScreenshotVerifierService;

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly config: AppConfig,
    @Inject(forwardRef(() => AiQueueService))
    private readonly aiQueueService: AiQueueService,
  ) {
    this.dispatcher = new ModelDispatcherService(this.config, this.logger);
    this.sentimentAnalyzer = new SentimentAnalyzerService(
      this.dispatcher,
      this.logger,
    );
    this.eodCompiler = new EodCompilerService(
      this.drizzle,
      this.dispatcher,
      this.logger,
    );
    this.paymentOcr = new PaymentOcrService(
      this.drizzle,
      this.dispatcher,
      this.logger,
    );
    this.screenshotVerifier = new ScreenshotVerifierService(
      this.drizzle,
      this.config,
      this.dispatcher,
      this.logger,
    );
  }

  onModuleInit() {
    this.startUploadsWatcher();
  }

  onModuleDestroy() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  private startUploadsWatcher() {
    const uploadDir = path.join(process.cwd(), this.config.uploadsDir);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    this.logger.log(
      `Starting filesystem watcher for upload directory: ${uploadDir}`,
    );

    try {
      this.watcher = fs.watch(uploadDir, (eventType, filename) => {
        if (eventType === 'rename' && filename) {
          const filePath = path.join(uploadDir, filename);
          setTimeout(() => {
            if (fs.existsSync(filePath)) {
              this.handleNewFileInUploads(filename, filePath).catch((err) => {
                this.logger.error(
                  `Error in uploads directory watcher for ${filename}: ${err.message}`,
                );
              });
            }
          }, this.config.uploadsWatcherDelayMs);
        }
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to start uploads directory watcher: ${message}`,
      );
    }
  }

  private async handleNewFileInUploads(filename: string, filePath: string) {
    if (this.processingFiles.has(filename)) {
      return;
    }
    this.processingFiles.add(filename);

    try {
      const url = `${this.config.uploadsUrlPrefix}${filename}`;
      const logs = await this.drizzle.readDb
        .select()
        .from(schema.pgSchema.interaction_logs)
        .where(
          and(
            eq(schema.pgSchema.interaction_logs.viber_screenshot_url, url),
            isNull(schema.pgSchema.interaction_logs.ai_verification_status),
          ),
        )
        .limit(1);
      const log = logs[0] || null;

      if (log) {
        this.logger.log(
          `Directory watcher matched new file ${filename} to log ${log.id}. Queueing audit...`,
        );
        await this.aiQueueService.addScreenshotJob(log.id, filePath);
      }
    } finally {
      this.processingFiles.delete(filename);
    }
  }

  private async dispatchModel(
    prompt: string,
    images?: string[],
    format?: ModelResponseFormat,
    modelName?: string,
    quantization?: string,
  ): Promise<string | null> {
    return this.dispatcher.dispatchModel(
      prompt,
      images,
      format,
      modelName,
      quantization,
    );
  }

  async parseInteractionNote(
    note: string,
    quantization?: string,
  ): Promise<ParsedInteractionNote> {
    const prompt = `You are a sales assistant parsing notes for Burma Inventory. Parse the following note and return a JSON object with keys:
1. 'commercialStatus': one of 'FOLLOWED_UP', 'INTERESTED', 'ORDER_PLACED', 'NOT_INTERESTED'.
2. 'items': an array of objects with 'sku' (string) and 'quantity' (integer).
3. 'summary': a short summary of the notes (string).

Note: "${note}"

Return ONLY raw JSON. No markdown formatting, no explanation.`;

    const res = await this.dispatchModel(
      prompt,
      undefined,
      'json',
      undefined,
      quantization,
    );
    if (res) {
      try {
        const cleanedText = res.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanedText);
        return {
          commercialStatus: data.commercialStatus || 'FOLLOWED_UP',
          items: data.items || [],
          summary:
            data.summary || note.substring(0, NOTE_SUMMARY_FALLBACK_LENGTH),
        };
      } catch (err) {
        this.logger.warn(
          `Failed to parse note JSON: ${err}. Falling back to heuristics.`,
        );
      }
    }

    const lowerNote = note.toLowerCase();

    let commercialStatus = 'FOLLOWED_UP';
    if (lowerNote.includes('order') || lowerNote.includes('bought')) {
      commercialStatus = 'ORDER_PLACED';
    } else if (
      lowerNote.includes('not interest') ||
      lowerNote.includes('reject')
    ) {
      commercialStatus = 'NOT_INTERESTED';
    } else if (lowerNote.includes('interest')) {
      commercialStatus = 'INTERESTED';
    }

    const items: { sku: string; quantity: number }[] = [];
    if (lowerNote.includes('premium beer')) {
      items.push({
        sku: DEFAULT_PREMIUM_BEER_SKU,
        quantity: DEFAULT_PREMIUM_BEER_QUANTITY,
      });
    }

    return {
      commercialStatus,
      items,
      summary: note,
    };
  }

  async verifyViberScreenshot(
    base64Image: string,
    quantization?: string,
  ): Promise<ViberVerificationResult> {
    return this.screenshotVerifier.verifyViberScreenshot(
      base64Image,
      quantization,
    );
  }

  async ocrInvoice(
    base64Image: string,
    quantization?: string,
  ): Promise<OcrInvoiceResult> {
    return this.screenshotVerifier.ocrInvoice(base64Image, quantization);
  }

  async analyzeSentiment(notes: string[]): Promise<SentimentResult> {
    return this.sentimentAnalyzer.analyzeSentiment(notes);
  }

  async compileEod(date: string): Promise<EodCompileResult> {
    return this.eodCompiler.compileEod(date);
  }

  async generateEodDigest(dateStr: string): Promise<EodDigest> {
    return this.eodCompiler.generateEodDigest(dateStr);
  }

  async processScreenshot(
    logId: string,
    filePath?: string,
    traceId?: string,
    actorId?: string,
    quantization?: string,
  ): Promise<void> {
    return this.screenshotVerifier.processScreenshot(
      logId,
      filePath,
      traceId,
      actorId,
      quantization,
    );
  }

  async getDynamicQuotaOptimizations(): Promise<
    {
      region: string;
      currentQuota: number;
      suggestedQuota: number;
      reason: string;
    }[]
  > {
    const prompt = `Suggest regional sales visit quota optimizations for Burma Inventory based on monsoonal road conditions and sales responses. Return a JSON array of objects with keys:
- 'region': division/state name
- 'currentQuota': integer
- 'suggestedQuota': integer
- 'reason': justification string

Return ONLY raw JSON.`;

    const res = await this.dispatchModel(prompt, undefined, 'json');
    if (res) {
      try {
        const cleanedText = res.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanedText);
        if (Array.isArray(data)) {
          return data;
        }
      } catch (err) {
        this.logger.warn(`Failed to parse quota optimizations JSON: ${err}`);
      }
    }

    return [
      {
        region: 'Shan State',
        currentQuota: 5,
        suggestedQuota: 8,
        reason:
          'High response rate and increasing Premium Cider interest in Taunggyi. Competitor presence is minimal.',
      },
      {
        region: 'Yangon Division',
        currentQuota: 10,
        suggestedQuota: 6,
        reason:
          'Heavy monsoonal rains reported in Hledan. Adjusting visit targets down to mitigate logistics safety hazards.',
      },
    ];
  }

  async parsePaymentTransfer(
    base64Image: string,
  ): Promise<PaymentTransferResult> {
    return this.paymentOcr.parsePaymentTransfer(base64Image);
  }

  async reconcilePaymentFifo(
    shopId: string,
    paymentAmount: number,
    transactionRef: string | null,
    screenshotUrl: string | null,
    actorId: string,
  ): Promise<FifoReconciliationResult> {
    return this.paymentOcr.reconcilePaymentFifo(
      shopId,
      paymentAmount,
      transactionRef,
      screenshotUrl,
      actorId,
    );
  }
}
