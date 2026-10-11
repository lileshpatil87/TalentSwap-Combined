import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private client?: OpenAI;

  constructor(private readonly config: ConfigService) {}

  async embed(text: string): Promise<number[]> {
    const cfg = this.config.get<any>('ai');
    if (!cfg?.apiKey) throw new Error('OPENAI_API_KEY_NOT_CONFIGURED');
    if (!this.client) this.client = new OpenAI({ apiKey: cfg.apiKey, timeout: 15_000, maxRetries: 0 });

    let last: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await this.client.embeddings.create({ model: cfg.embeddingModel, input: text });
        const vector = response.data?.[0]?.embedding;
        if (!Array.isArray(vector) || vector.length === 0) throw new Error('INVALID_EMBEDDING_RESPONSE');
        return vector;
      } catch (error) {
        last = error;
        if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
    throw last instanceof Error ? last : new Error('EMBEDDING_PROVIDER_FAILURE');
  }
}
