import { Logger } from '@nestjs/common';
import axios from 'axios';
import { guardAsync } from '@burma-inventory/shared-types';
import { AppConfig } from '../../core/config/app-config';

/** Optional JSON response format flag understood by the Ollama generate API. */
export type ModelResponseFormat = 'json';

interface OllamaGeneratePayload {
  model: string;
  prompt: string;
  stream: false;
  images?: string[];
  format?: ModelResponseFormat;
}

interface OllamaGenerateResponse {
  response?: string;
}

/**
 * Single place that talks to the local LLM (Ollama). Encapsulates payload
 * construction, quantization tagging, the request timeout and a bounded
 * retry/backoff around transient HTTP failures.
 *
 * Preserves the original contract exactly: on a successful first attempt it
 * returns the model text; on a malformed/empty body or after exhausting retries
 * it returns null so callers can fall back to their heuristics.
 */
export class ModelDispatcherService {
  constructor(
    private readonly config: AppConfig,
    private readonly logger: Logger,
  ) {}

  private resolveModelName(modelName?: string, quantization?: string): string {
    let targetModelName = modelName || this.config.ollamaModel;
    if (quantization) {
      if (targetModelName.includes(':')) {
        const parts = targetModelName.split(':');
        targetModelName = `${parts[0]}:${quantization}`;
      } else {
        targetModelName = `${targetModelName}:${quantization}`;
      }
    }
    return targetModelName;
  }

  private buildPayload(
    targetModelName: string,
    prompt: string,
    images?: string[],
    format?: ModelResponseFormat,
  ): OllamaGeneratePayload {
    const payload: OllamaGeneratePayload = {
      model: targetModelName,
      prompt,
      stream: false,
    };
    if (images && images.length > 0) {
      payload.images = images;
    }
    if (format) {
      payload.format = format;
    }
    return payload;
  }

  private async delay(ms: number): Promise<void> {
    if (ms <= 0) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  async dispatchModel(
    prompt: string,
    images?: string[],
    format?: ModelResponseFormat,
    modelName?: string,
    quantization?: string,
  ): Promise<string | null> {
    const targetModelName = this.resolveModelName(modelName, quantization);
    const payload = this.buildPayload(targetModelName, prompt, images, format);

    const maxRetries = this.config.ollamaMaxRetries ?? 0;
    const backoffMs = this.config.ollamaBackoffMs ?? 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const requestPromise = axios.post<OllamaGenerateResponse>(
        `${this.config.gemmaApiUrl}/api/generate`,
        payload,
        { timeout: this.config.ollamaTimeoutMs },
      );

      const [response, err] = await guardAsync(requestPromise);
      if (err) {
        if (attempt < maxRetries) {
          await this.delay(backoffMs * (attempt + 1));
          continue;
        }
        return null;
      }

      if (!response || !response.data || !response.data.response) {
        this.logger.warn(`Ollama response was empty or malformed`);
        return null;
      }

      return response.data.response;
    }

    return null;
  }
}
