import { Inject, Injectable, Optional } from '@nestjs/common';
import type {
  AlertasRespuesta,
  FuenteAlerta,
  FuenteEstado,
  FuentesSaludRespuesta,
  OfficialAlert,
} from '@noa-guardian/contracts';
import {
  CircuitBreakerRegistry,
  type SourceName,
} from './circuit-breaker.js';

export const FEEDS_FETCH = Symbol('FEEDS_FETCH');
export type FetchFn = typeof fetch;

/**
 * Fuentes oficiales de alertas (porte fiel de dock/gateway/src/feeds.js,
 * contrato §2 ampliado): NWS (api.weather.gov), USGS (earthquake.usgs.gov)
 * y NASA EONET — gratuitas, sin llave.
 *
 * Reglas: cada alerta lleva fuente y enlace oficial; si una fuente cae,
 * las demás responden y el fallo se DECLARA en `sources` (jamás se inventa
 * una alerta). Caché corta en memoria: 120 s por punto redondeado. No se
 * persiste nada.
 */
const UA =
  'NOA-Guardian-Dock/1.0 (Meta AI Hackathon 2026 prototype; contact: repo local)';
const CACHE_TTL_MS = 120_000;
const FETCH_TIMEOUT_MS = 6_000;

export const DEFAULT_POINT = {
  lat: 40.3356,
  lon: -75.9269,
  label: 'Reading, PA (punto por defecto)',
};

interface GeoFeature {
  id?: unknown;
  properties?: Record<string, unknown>;
  geometry?: Array<{ coordinates?: unknown; date?: string }>;
}

@Injectable()
export class OfficialFeedsProvider {
  private readonly cache = new Map<
    string,
    { at: number; payload: AlertasRespuesta }
  >();
  /** Etapa D (D2): circuit breaker por fuente — 3 fallos abren 5 min. */
  private readonly breakers = new CircuitBreakerRegistry();
  private readonly fetchFn: FetchFn;

  constructor(@Optional() @Inject(FEEDS_FETCH) fetchFn?: FetchFn) {
    this.fetchFn = fetchFn ?? globalThis.fetch;
  }

  private async fetchJson(
    url: string,
    headers: Record<string, string> = {},
  ): Promise<Record<string, unknown>> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await this.fetchFn(url, {
        headers: { 'User-Agent': UA, ...headers },
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as Record<string, unknown>;
    } finally {
      clearTimeout(t);
    }
  }

  private async fromNWS(lat: number, lon: number): Promise<OfficialAlert[]> {
    const data = await this.fetchJson(
      `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`,
      { Accept: 'application/geo+json' },
    );
    const features = (data.features ?? []) as GeoFeature[];
    return features.map((f) => {
      const p = f.properties ?? {};
      const str = (v: unknown, fallback = '') =>
        typeof v === 'string' ? v : fallback;
      return {
        event: str(p.event, 'Alerta meteorológica'),
        severity: str(p.severity, 'Unknown'),
        headline:
          str(p.headline) || str(p.description).slice(0, 200) || '',
        area: str(p.areaDesc),
        starts:
          (typeof p.onset === 'string' ? p.onset : null) ??
          (typeof p.effective === 'string' ? p.effective : null),
        ends:
          (typeof p.ends === 'string' ? p.ends : null) ??
          (typeof p.expires === 'string' ? p.expires : null),
        source: 'NWS' as FuenteAlerta,
        // En el GeoJSON de NWS, `id` ya es la URL canónica de la alerta.
        url:
          typeof f.id === 'string' && f.id.startsWith('http')
            ? f.id
            : 'https://www.weather.gov/',
      };
    });
  }

  private async fromUSGS(lat: number, lon: number): Promise<OfficialAlert[]> {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);
    const data = await this.fetchJson(
      'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&orderby=time&limit=10' +
        `&starttime=${since}&latitude=${lat}&longitude=${lon}&maxradiuskm=300&minmagnitude=2.0`,
    );
    const features = (data.features ?? []) as GeoFeature[];
    return features.map((f) => {
      const p = f.properties ?? {};
      const mag = typeof p.mag === 'number' ? p.mag : null;
      return {
        event: `Sismo M${mag ?? '?'}`,
        severity:
          mag !== null && mag >= 4.5
            ? 'Severe'
            : mag !== null && mag >= 3.5
              ? 'Moderate'
              : 'Minor',
        headline: typeof p.title === 'string' ? p.title : '',
        area: typeof p.place === 'string' ? p.place : '',
        starts:
          typeof p.time === 'number'
            ? new Date(p.time).toISOString()
            : null,
        ends: null,
        source: 'USGS' as FuenteAlerta,
        url:
          typeof p.url === 'string'
            ? p.url
            : 'https://earthquake.usgs.gov/earthquakes/map/',
      };
    });
  }

  private async fromEONET(lat: number, lon: number): Promise<OfficialAlert[]> {
    const data = await this.fetchJson(
      'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&limit=50',
    );
    const events = (data.events ?? []) as Array<{
      id: string;
      title?: string;
      link?: string;
      categories?: Array<{ title?: string }>;
      geometry?: Array<{ coordinates?: unknown; date?: string }>;
    }>;
    const near = events.filter((e) => {
      const g = (e.geometry ?? [])[0];
      if (!g || !Array.isArray(g.coordinates)) return false;
      const [elon, elat] = g.coordinates as number[];
      return Math.abs(elat - lat) <= 6 && Math.abs(elon - lon) <= 6;
    });
    return near.map((e) => {
      const g = (e.geometry ?? [])[0] ?? {};
      const cat = (e.categories ?? [])[0]?.title || 'Evento natural';
      const coords = Array.isArray(g.coordinates)
        ? (g.coordinates as number[])
        : null;
      return {
        event: e.title || cat,
        severity: 'Unknown',
        headline: `${cat} — evento abierto reportado por NASA EONET (reportado, no verificado en campo).`,
        area: coords ? `lon ${coords[0]}, lat ${coords[1]}` : '',
        starts: g.date ?? null,
        ends: null,
        source: 'NASA EONET' as FuenteAlerta,
        url: e.link || `https://eonet.gsfc.nasa.gov/api/v3/events/${e.id}`,
      };
    });
  }

  private readonly sourcesList: Array<
    [FuenteAlerta, (lat: number, lon: number) => Promise<OfficialAlert[]>]
  > = [
    ['NWS', (lat, lon) => this.fromNWS(lat, lon)],
    ['USGS', (lat, lon) => this.fromUSGS(lat, lon)],
    ['NASA EONET', (lat, lon) => this.fromEONET(lat, lon)],
  ];

  async getAlerts(lat: number, lon: number): Promise<AlertasRespuesta> {
    const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return {
        ...hit.payload,
        cache: { hit: true, ttlSeconds: CACHE_TTL_MS / 1000 },
      };
    }
    // Con el circuito abierto ni se llama a la fuente: el hueco se
    // declara igual que un fallo, con su marca de circuito (contrato §2).
    const settled = await Promise.allSettled(
      this.sourcesList.map(([name, fn]) =>
        this.breakers.isOpen(name as SourceName)
          ? Promise.reject(new Error('__circuit_open__'))
          : fn(lat, lon),
      ),
    );
    const alerts: OfficialAlert[] = [];
    const sources: Record<string, FuenteEstado> = {};
    settled.forEach((r, i) => {
      const name = this.sourcesList[i][0];
      if (r.status === 'fulfilled') {
        this.breakers.recordSuccess(name as SourceName);
        sources[name] = { ok: true, count: r.value.length };
        alerts.push(...r.value);
      } else {
        // Fallo declarado, nunca rellenado (contrato §2).
        const reason: unknown = r.reason;
        const msg = reason instanceof Error ? reason.message : String(reason);
        if (msg === '__circuit_open__') {
          sources[name] = {
            ok: false,
            count: 0,
            error:
              'Circuito abierto por fallos consecutivos: la fuente no se ' +
              'consultó en esta ronda (reintento automático en minutos).',
            circuitOpen: true,
            minutesSinceOk: this.breakers.minutesSinceLastOk(
              name as SourceName,
            ),
          };
        } else {
          this.breakers.recordFailure(name as SourceName, msg);
          const estado: FuenteEstado = { ok: false, count: 0, error: msg };
          if (this.breakers.isOpen(name as SourceName)) {
            estado.circuitOpen = true;
            estado.minutesSinceOk = this.breakers.minutesSinceLastOk(
              name as SourceName,
            );
          }
          sources[name] = estado;
        }
      }
    });
    const payload: AlertasRespuesta = {
      alerts,
      sources,
      point: { lat, lon },
      generatedAt: new Date().toISOString(),
      cache: { hit: false, ttlSeconds: CACHE_TTL_MS / 1000 },
    };
    this.cache.set(key, { at: Date.now(), payload });
    return payload;
  }

  /** Salud viva de las fuentes (GET /health/sources): sin caché de por medio. */
  sourcesHealth(): FuentesSaludRespuesta['sources'] {
    return this.breakers.snapshot();
  }

  feedsStatus(): {
    configured: string[];
    cacheEntries: number;
    cacheTtlSeconds: number;
  } {
    return {
      configured: this.sourcesList.map(([name]) => name),
      cacheEntries: this.cache.size,
      cacheTtlSeconds: CACHE_TTL_MS / 1000,
    };
  }
}
