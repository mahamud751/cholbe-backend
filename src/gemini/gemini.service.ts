import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GenerateGeminiJsonDto } from './dto/gemini.dto';

const MODEL = 'gemini-3.6-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
};

@Injectable()
export class GeminiService {
  constructor(private config: ConfigService) {}

  private apiKey() {
    const key = this.config.get<string>('GEMINI_API_KEY');
    if (!key || key === 'your_gemini_api_key_here') {
      throw new ServiceUnavailableException(
        'Gemini is not configured on the server',
      );
    }
    return key;
  }

  async generateJson<T>(dto: GenerateGeminiJsonDto): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${ENDPOINT}?key=${this.apiKey()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: dto.systemInstruction }] },
          contents: [{ role: 'user', parts: dto.parts }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: dto.responseSchema,
          },
        }),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Could not reach Gemini. Check your internet connection.',
      );
    }

    const body = await response.text();
    let payload: GeminiResponse;
    try {
      payload = JSON.parse(body) as GeminiResponse;
    } catch {
      throw new BadRequestException(
        `Unexpected response from Gemini (${response.status}).`,
      );
    }

    if (!response.ok) {
      throw new BadRequestException(
        payload.error?.message ?? `Gemini request failed (${response.status}).`,
      );
    }

    if (payload.promptFeedback?.blockReason) {
      throw new BadRequestException(
        `Gemini declined that request (${payload.promptFeedback.blockReason}).`,
      );
    }

    const candidate = payload.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
      throw new BadRequestException(
        `Gemini stopped early (${candidate.finishReason}).`,
      );
    }

    const jsonText = (candidate?.content?.parts ?? [])
      .filter(part => part.text && !part.thought)
      .map(part => part.text)
      .join('');

    if (!jsonText) {
      throw new BadRequestException('Gemini returned an empty result.');
    }

    try {
      return JSON.parse(jsonText) as T;
    } catch {
      throw new BadRequestException('Gemini returned a malformed result.');
    }
  }
}
