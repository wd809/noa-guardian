import { beforeEach, expect, vi } from 'vitest';
import {
  describeDockError,
  DockClientService,
  DockError,
  tokenFingerprint,
} from './dock-client.service';

function okJson(payload: unknown) {
  return { ok: true, json: async () => payload };
}

function errJson(status: number, payload: unknown) {
  return {
    ok: false,
    status,
    clone: () => ({ json: async () => payload }),
  };
}

describe('DockClientService', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    try {
      globalThis.localStorage?.clear();
    } catch {
      /* Sin almacenamiento: cada test parte de los valores por defecto. */
    }
  });

  it('see() envía el data URI a /see con el token de emparejamiento', async () => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) =>
      okJson({ description: 'ok' }),
    );
    vi.stubGlobal('fetch', fetch);
    const dock = new DockClientService();
    dock.setToken('secreto');
    const res = await dock.see({ image: 'data:image/jpeg;base64,/9j/' });
    expect(res).toEqual({ description: 'ok' });
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('http://localhost:3000/see');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(
      JSON.stringify({ image: 'data:image/jpeg;base64,/9j/' }),
    );
    expect(
      (init?.headers as Record<string, string> | undefined)?.['x-dock-token'],
    ).toBe('secreto');
  });

  it('propaga el estado y código declarados del Dock (401 unauthorized)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => errJson(401, { error: 'unauthorized' })),
    );
    const dock = new DockClientService();
    const err = await dock
      .see({ image: 'data:image/jpeg;base64,/9j/' })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(DockError);
    expect((err as DockError).status).toBe(401);
    expect((err as DockError).code).toBe('unauthorized');
  });

  it('el timeout de /see es de 60 s; el del resto sigue en 10 s', async () => {
    // Así lo lanza el navegador cuando AbortSignal.timeout() dispara.
    const timeout = Object.assign(new Error('timed out'), {
      name: 'TimeoutError',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw timeout;
      }),
    );
    const dock = new DockClientService();
    const seeErr = await dock
      .see({ image: 'data:image/jpeg;base64,/9j/' })
      .catch((e: unknown) => e);
    expect((seeErr as DockError).message).toContain('within 60 s');
    const askErr = await dock
      .ask({ mode: 'citizen', text: 'hola' })
      .catch((e: unknown) => e);
    expect((askErr as DockError).message).toContain('within 10 s');
  });
});

describe('checkAuth', () => {
  it('200 en endpoint protegido → true; 401 → false', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okJson({ devices: [] })));
    const dock = new DockClientService();
    await expect(dock.checkAuth()).resolves.toBe(true);
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) =>
      errJson(401, { error: 'unauthorized' }),
    );
    vi.stubGlobal('fetch', fetch);
    await expect(dock.checkAuth()).resolves.toBe(false);
    const [url] = fetch.mock.calls[0];
    expect(url).toBe('http://localhost:3000/bridge/devices');
  });

  it('otros fallos se relanzan, sin inventar veredicto', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network down');
      }),
    );
    const dock = new DockClientService();
    const err = await dock.checkAuth().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(DockError);
    expect((err as DockError).status).toBeNull();
  });
});

describe('tokenFingerprint', () => {
  it('vector compartido con el Dock: mismo algoritmo, mismo valor', () => {
    expect(tokenFingerprint('WD-pairing-vector-7')).toBe('0756984d');
  });
});

describe('describeDockError', () => {
  it('sin respuesta: mensaje claro como Session', () => {
    expect(describeDockError(new DockError('x', null, null))).toBe(
      'The Dock did not answer. Check that it is on and paired in Session.',
    );
  });

  it('con respuesta: estado y código declarados; 401 sugiere revisar el pareo', () => {
    expect(describeDockError(new DockError('x', 501, 'not_configured'))).toBe(
      'The Dock answered 501 (not_configured).',
    );
    expect(describeDockError(new DockError('x', 401, 'unauthorized'))).toContain(
      'Check pairing in Session.',
    );
  });

  it('errores no-Dock: mensaje tal cual, sin inventar', () => {
    expect(describeDockError(new Error('Could not read the image file.'))).toBe(
      'Could not read the image file.',
    );
    expect(describeDockError(42)).toBe('Unexpected error.');
  });
});
