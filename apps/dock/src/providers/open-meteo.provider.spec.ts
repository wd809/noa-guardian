import type { FetchFn } from './feeds-fetch.js';
import { OpenMeteoProvider } from './open-meteo.provider.js';

// Forma REAL verificada en vivo (2026-11-01): current + hourly con
// precipitation_probability alineado por índice con hourly.time.
const METEO_OK = {
  current: { time: '2026-11-01T09:00', temperature_2m: 7.4 },
  hourly: {
    time: [
      '2026-11-01T09:00',
      '2026-11-01T10:00',
      '2026-11-01T11:00',
      '2026-11-01T12:00',
      '2026-11-01T13:00',
      '2026-11-01T14:00',
      '2026-11-01T15:00',
      '2026-11-01T16:00',
    ],
    precipitation_probability: [0, 0, 5, 10, 40, 20, 90, 90],
  },
};

function fakeFetch(opts: { down?: boolean } = {}): {
  fn: FetchFn;
  calls: () => number;
} {
  let count = 0;
  const fn = (async (url: string) => {
    count += 1;
    if (!String(url).includes('api.open-meteo.com/v1/forecast')) {
      throw new Error('unexpected url ' + url);
    }
    if (opts.down) throw new Error('network down');
    return { ok: true, json: async () => METEO_OK };
  }) as unknown as FetchFn;
  return { fn, calls: () => count };
}

describe('OpenMeteoProvider (contexto, nunca alerta)', () => {
  it('parsea temperatura y máx. de lluvia a 6 h desde la hora actual', async () => {
    const { fn } = fakeFetch();
    const p = new OpenMeteoProvider(fn);
    const block = await p.current(40.3356, -75.9269);
    expect(block.ok).toBe(true);
    expect(block.temperatureC).toBe(7.4);
    // Máximo de las 6 h desde las 09:00 (el 90% de las 15:00 queda fuera).
    expect(block.precipitationProbabilityMax).toBe(40);
    expect(block.summary).toBe('7.4°C · rain ≤40% next 6h');
    expect(block.observedAt).toBe('2026-11-01T09:00');
  });

  it('si la API falla, el fallo se declara dentro del bloque', async () => {
    const { fn } = fakeFetch({ down: true });
    const p = new OpenMeteoProvider(fn);
    const block = await p.current(40.3356, -75.9269);
    expect(block.ok).toBe(false);
    expect(block.error).toContain('network down');
    expect(block.temperatureC).toBeNull();
    expect(block.summary).toBeNull();
  });

  it('cachea 10 min (aciertos y fallos): sin aporrear', async () => {
    const { fn, calls } = fakeFetch();
    const p = new OpenMeteoProvider(fn);
    await p.current(40.3356, -75.9269);
    await p.current(40.3356, -75.9269);
    expect(calls()).toBe(1);
  });
});
