import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { AiQueueService } from '../../core/queue/ai-queue.service';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiQueueService: AiQueueService,
  ) {}

  @Post('parse-note')
  async parseNote(@Body() body: { note: string }) {
    return this.aiService.parseInteractionNote(body.note);
  }

  @Post('verify-screenshot')
  async verifyScreenshot(@Body() body: { image: string }) {
    return this.aiService.verifyViberScreenshot(body.image);
  }

  @Post('analyze-sentiment')
  async analyzeSentiment(@Body() body: { notes: string[] }) {
    return this.aiService.analyzeSentiment(body.notes);
  }

  @Post('eod-digest')
  @HttpCode(HttpStatus.ACCEPTED)
  async eodDigest(@Body() body?: { date?: string }) {
    // Default to today if date is not specified
    const dateStr = body?.date || new Date().toISOString().split('T')[0];
    await this.aiQueueService.addEodJob(dateStr);
    return { success: true, message: 'EOD digest compiling queued' };
  }

  @Post('ocr-invoice')
  async ocrInvoice(@Body() body: { image: string }) {
    return this.aiService.ocrInvoice(body.image);
  }

  @Get('quota-optimizations')
  async quotaOptimizations() {
    return this.aiService.getDynamicQuotaOptimizations();
  }
}
