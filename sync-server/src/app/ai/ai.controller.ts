import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('api/ai')
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
}
