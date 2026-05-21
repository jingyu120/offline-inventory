import { Controller, Post, Body, Get } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

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
  async eodDigest(@Body() body: { date?: string }) {
    // Default to today if date is not specified
    const dateStr = body.date || new Date().toISOString().split('T')[0];
    return this.aiService.generateEodDigest(dateStr);
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
