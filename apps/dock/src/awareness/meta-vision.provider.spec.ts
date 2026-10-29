import { afterEach, describe, expect, it } from 'vitest';
import {
  MetaVisionProvider,
  SEE_SYSTEM_PROMPT,
  VisionNotConfiguredError,
  VisionUnavailableError,
} from './meta-vision.provider.js';
import { SeeOutputError } from './see-output.js';

const SCENE = JSON.stringify({
  description: 'A hallway. One person 2 meters ahead left.',
  peoplePresent: true,
  peopleCount: 1,
  hazards: [],
  readableText: [],
  confidence: 'medium',
});

function fakeFetch(status: number, body: unknown): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch;
}

function completion(content: string | null): unknown {
  return {
    choices: [{ message: { content } }],
    usage: { prompt_tokens: 1_000_000, completion_tokens: 1_000_000 },
  };
}

describe('MetaVisionProvider (Etapa D, D6)', () => {
  afterEach(() => {
    delete process.env.META_MODEL_API_KEY;
  });

  it('sin llave queda no configurado y ni siquiera llama', async () => {
    delete process.env.META_MODEL_API_KEY;
    const provider = new MetaVisionProvider(fakeFetch(200, completion(SCENE)));
    expect(provider.configured).toBe(false);
    await expect(
      provider.see('data:image/jpeg;base64,AAAA', 'Describe'),
    ).rejects.toBeInstanceOf(VisionNotConfiguredError);
  });

  it('con llave: manda el prompt de Spark y la imagen; mapea uso y costo', async () => {
    process.env.META_MODEL_API_KEY = 'test-key-not-real';
    let sentBody: Record<string, unknown> | null = null;
    let sentAuth = '';
    const fetchFn = (async (url: string, init: RequestInit) => {
      sentBody = JSON.parse(String(init.body)) as Record<string, unknown>;
      sentAuth = String(
        (init.headers as Record<string, string>)['authorization'] ?? '',
      );
      return new Response(JSON.stringify(completion(SCENE)), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;
    const provider = new MetaVisionProvider(fetchFn);
    const { scene, usage } = await provider.see(
      'data:image/png;base64,AAAA',
      'Describe what is in front of me.',
    );
    expect(scene.peoplePresent).toBe(true);
    expect(usage).toEqual({
      model: 'muse-spark-1.3',
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      costUsd: 5.5, // 1M in × $1.25 + 1M out × $4.25
    });
    const messages = sentBody!['messages'] as Array<Record<string, unknown>>;
    expect(messages[0]['content']).toBe(SEE_SYSTEM_PROMPT);
    const parts = messages[1]['content'] as Array<Record<string, unknown>>;
    expect(parts[1]['type']).toBe('image_url');
    expect(sentAuth).toBe('Bearer test-key-not-real');
  });

  it('un error de la API se declara vision_unavailable, sin inventar', async () => {
    process.env.META_MODEL_API_KEY = 'test-key-not-real';
    const provider = new MetaVisionProvider(fakeFetch(500, { error: 'boom' }));
    await expect(
      provider.see('data:image/jpeg;base64,AAAA', 'Describe'),
    ).rejects.toBeInstanceOf(VisionUnavailableError);
  });

  it('contenido vacío del modelo → SeeOutputError (nada se habla)', async () => {
    process.env.META_MODEL_API_KEY = 'test-key-not-real';
    const provider = new MetaVisionProvider(fakeFetch(200, completion(null)));
    await expect(
      provider.see('data:image/jpeg;base64,AAAA', 'Describe'),
    ).rejects.toBeInstanceOf(SeeOutputError);
  });
});
