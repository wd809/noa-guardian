import { Injectable } from '@nestjs/common';
import type { UsoModelo } from '@noa-guardian/contracts';
import { parseSeeOutput, SeeOutputError } from './see-output.js';

/**
 * Proveedor de visión de Awareness (Etapa D, D6): Muse Spark en la Meta
 * Model API. El prompt del sistema y el esquema JSON de salida los diseñó
 * Spark 1.3 (2026-10-29) con la doctrina de Guardian: peligros primero,
 * personas solo como presencia, jamás identidad, nada de documentos
 * privados, honestidad ante la incertidumbre y cero órdenes de navegación.
 *
 * Sin `META_MODEL_API_KEY` en el entorno, el proveedor queda NO configurado
 * y el controlador lo declara (501) — el mismo patrón honesto que PennDOT.
 * La llave jamás se registra ni se devuelve en ninguna respuesta.
 */
export const SEE_SYSTEM_PROMPT =
  "You are NOA Guardian Awareness. Describe one photo for a blind user who cannot see it. Use plain, calm spoken language. First state setting in one sentence, then obstacles and hazards first with distance in steps or meters when estimable. Then layout and major objects. Quote readable signs/text verbatim. For people, state only presence, count, and position like 'one person 2 meters ahead left.' Never identify, name, or guess identity, relationship, age, gender, or emotion. Do not read private documents, letters, or phone/computer screens in detail; say you see them but won't detail them. If uncertain, say 'I can't make out...' Never invent details. No navigation orders, only description. Reply with ONLY the JSON object: {\"description\": string (max 500 chars), \"peoplePresent\": boolean, \"peopleCount\": integer or null, \"hazards\": string[], \"readableText\": string[], \"confidence\": \"low\"|\"medium\"|\"high\"}.";

const DEFAULT_MODEL = 'muse-spark-1.3';
const DEFAULT_BASE_URL = 'https://api.meta.ai/v1';
// Tarifas Standard publicadas de la Meta Model API (USD por millón).
const USD_PER_M_INPUT = 1.25;
const USD_PER_M_OUTPUT = 4.25;
const REQUEST_TIMEOUT_MS = 20_000;

export class VisionNotConfiguredError extends Error {}
export class VisionUnavailableError extends Error {}

type FetchFn = typeof fetch;

interface ChatCompletionBody {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

@Injectable()
export class MetaVisionProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fetchFn: FetchFn;

  constructor(fetchFn?: FetchFn) {
    this.apiKey = process.env.META_MODEL_API_KEY ?? '';
    this.model = process.env.META_MODEL_ID ?? DEFAULT_MODEL;
    this.baseUrl = (process.env.META_API_BASE_URL ?? DEFAULT_BASE_URL).replace(
      /\/$/,
      '',
    );
    this.fetchFn = fetchFn ?? fetch;
  }

  get configured(): boolean {
    return this.apiKey.length > 0;
  }

  async see(
    imageDataUri: string,
    question: string,
  ): Promise<{ scene: ReturnType<typeof parseSeeOutput>; usage: UsoModelo }> {
    if (!this.configured) {
      throw new VisionNotConfiguredError('META_MODEL_API_KEY is not set');
    }
    let res: Response;
    try {
      res = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          reasoning_effort: 'low',
          max_tokens: 1500,
          messages: [
            { role: 'system', content: SEE_SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                { type: 'text', text: question },
                { type: 'image_url', image_url: { url: imageDataUri } },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new VisionUnavailableError('vision API unreachable');
    }
    if (!res.ok) {
      throw new VisionUnavailableError(`vision API answered ${res.status}`);
    }
    const body = (await res.json()) as ChatCompletionBody;
    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      throw new SeeOutputError('vision model returned no content');
    }
    const scene = parseSeeOutput(content);
    const inputTokens = body.usage?.prompt_tokens ?? 0;
    const outputTokens = body.usage?.completion_tokens ?? 0;
    const usage: UsoModelo = {
      model: this.model,
      inputTokens,
      outputTokens,
      costUsd:
        Math.round(
          ((inputTokens * USD_PER_M_INPUT + outputTokens * USD_PER_M_OUTPUT) /
            1_000_000) *
            1_000_000,
        ) / 1_000_000,
    };
    return { scene, usage };
  }
}
