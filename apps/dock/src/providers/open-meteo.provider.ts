import { Inject, Injectable, Optional } from '@nestjs/common';
import type { ContextoAmbiental } from '@noa-guardian/contracts';
import { FEEDS_FETCH, type FetchFn } from './feeds-fetch.js';

/**
 * Open-Meteo — contexto ambiental (NO es fuente de alertas). Sin llave.
 * Aporta temperatura actual y probabilidad de lluvia a 6 h para el punto
 * consultado. Su fallo se declara en el propio bloque de contexto; jamás
 * toca el orbe ni el «All clear — verified», que solo responden a las
 * fuentes oficiales de `sources`.
 *
 * Caché: 10 min por punto redondeado (aciertos y fallos: sin aporrear).
 */
const FETCH_TIMEOUT_MS = 6_000;
const CACHE_TTL_MS = 600_000;
const UA =
  'NOA-Guardian-Dock/1.0 (Meta AI Hackathon 2026 prototype; contact: repo local)';

type OpenMeteoBlock = ContextoAmbiental['openMeteo'];

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function fail(error: string): OpenMeteoBlock {
  return {
    ok: false,
    temperatureC: null,
    precipitationProbabilityMax: null,
    summary: null,
    observedAt: null,
    error,
  };
}

@Injectable()
export class OpenMeteoProvider {
  private readonly fetchFn: FetchFn;
  private readonly cache = new Map<string, { at: number; block: OpenMeteoBlock }>();

  constructor(@Optional() @Inject(FEEDS_FETCH) fetchFn?: FetchFn) {
    this.fetchFn = fetchFn ?? globalThis.fetch;
  }

  async current(lat: number, lon: number): Promise<OpenMeteoBlock> {
    const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.block;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await this.fetchFn(
        'https://api.open-meteo.com/v1/forecast' +
          `?latitude=${lat}&longitude=${lon}` +
          '&current=temperature_2m,precipitation,weather_code' +
          '&hourly=precipitation_probability&forecast_days=2&timezone=auto',
        { headers: { 'User-Agent': UA }, signal: ctrl.signal },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        current?: { time?: unknown; temperature_2m?: unknown };
        hourly?: { time?: unknown; precipitation_probability?: unknown };
      };
      const temperatureC = num(data.current?.temperature_2m);
      const observedAt =
        typeof data.current?.time === 'string' ? data.current.time : null;
      let precipitationProbabilityMax: number | null = null;
      const times = Array.isArray(data.hourly?.time) ? data.hourly.time : [];
      const probs = Array.isArray(data.hourly?.precipitation_probability)
        ? data.hourly.precipitation_probability
        : [];
      if (observedAt && times.length > 0 && probs.length === times.length) {
        const start = times.findIndex(
          (x) => typeof x === 'string' && x >= observedAt,
        );
        if (start >= 0) {
          for (const p of probs.slice(start, start + 6)) {
            const n = num(p);
            if (n !== null) {
              precipitationProbabilityMax = Math.max(
                precipitationProbabilityMax ?? 0,
                Math.min(100, Math.max(0, Math.round(n))),
              );
            }
          }
        }
      }
      const parts: string[] = [];
      if (temperatureC !== null) parts.push(`${temperatureC}°C`);
      if (precipitationProbabilityMax !== null) {
        parts.push(`rain ≤${precipitationProbabilityMax}% next 6h`);
      }
      const block: OpenMeteoBlock = {
        ok: true,
        temperatureC,
        precipitationProbabilityMax,
        summary: parts.length > 0 ? parts.join(' · ') : null,
        observedAt,
      };
      this.cache.set(key, { at: Date.now(), block });
      return block;
    } catch (err) {
      const block = fail(err instanceof Error ? err.message : String(err));
      this.cache.set(key, { at: Date.now(), block });
      return block;
    } finally {
      clearTimeout(t);
    }
  }
}
