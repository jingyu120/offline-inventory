import { Controller, Post, Body, Get } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('parse-note')
  async parseNote(@Body() body: { note: string; quantization?: string }) {
    return this.aiService.parseInteractionNote(body.note, body.quantization);
  }

  @Post('verify-screenshot')
  async verifyScreenshot(
    @Body() body: { image: string; quantization?: string },
  ) {
    return this.aiService.verifyViberScreenshot(body.image, body.quantization);
  }

  @Post('analyze-sentiment')
  async analyzeSentiment(@Body() body: { notes: string[] }) {
    return this.aiService.analyzeSentiment(body.notes);
  }

  @Post('eod-digest')
  async eodDigest(@Body() body?: { date?: string }) {
    // Default to today if date is not specified
    const dateStr = body?.date || new Date().toISOString().split('T')[0];
    // Run synchronously so the client receives the full digest result directly.
    // (The queue-based approach returned only a 202 queued-ack, leaving the
    // frontend with no way to retrieve the actual computed digest.)
    return this.aiService.generateEodDigest(dateStr);
  }

  @Post('ocr-invoice')
  async ocrInvoice(@Body() body: { image: string; quantization?: string }) {
    return this.aiService.ocrInvoice(body.image, body.quantization);
  }

  @Get('quota-optimizations')
  async quotaOptimizations() {
    return this.aiService.getDynamicQuotaOptimizations();
  }
}
