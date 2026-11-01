import { Inject, Injectable, Optional } from '@nestjs/common';
import type { OfficialAlert } from '@noa-guardian/contracts';
import { FEEDS_FETCH, type FetchFn } from './feeds-fetch.js';

/**
 * AirNow (US EPA) — calidad del aire oficial: observación actual y
 * pronóstico por lat/lon (docs.airnowapi.org, "Current Observations by Zip
 * Code or Lat/Long" + "Current Forecasts"). Fuente OFICIAL: sus avisos de
 * AQI alto cuentan como alerta y el orbe la verifica como a las demás.
 *
 * Acceso: apiKey gratuita que el propietario pide en el sitio de AirNow
 * (Log In → nueva cuenta). La llave viaja en la query (`API_KEY=...`,
 * diseño de la propia API) siempre sobre HTTPS, y solo vive en el entorno
 * (AIRNOW_API_KEY); nunca en el repo. Sin llave, la fuente queda en modo
 * «no configurada» declarado (igual que PennDOT), jamás un fallo.
 *
 * Mapeo a OfficialAlert (decisiones documentadas):
 *  - Radio: 25 millas del punto (parámetro `distance` de la API).
 *  - Umbral de alerta: AQI > 100 (por encima de "Moderate").
 *  - Severidad por categoría EPA: USG (101-150) → Moderate;
 *    Unhealthy/Very Unhealthy (151-300) → Severe; Hazardous (301+) → Extreme.
 *  - Observación y pronóstico generan alertas por separado; el pronóstico
 *    lleva su fecha en el titular (su `ends` queda null: la API no publica
 *    hora de fin, y no la inventamos).
 *  - `url` pública de la fuente: airnow.gov.
 */
export const AIRNOW_NOT_CONFIGURED = '__airnow_not_configured__';
const OBS_URL = 'https://www.airnowapi.org/aq/observation/latLong/current/';
const FORECAST_URL = 'https://www.airnowapi.org/aq/forecast/latLong/';
const FETCH_TIMEOUT_MS = 6_000;
const RADIUS_MILES = 25;
const UA =
  'NOA-Guardian-Dock/1.0 (Meta AI Hackathon 2026 prototype; contact: repo local)';

interface AirNowRecord {
  DateObserved?: unknown;
  HourObserved?: unknown;
  DateForecast?: unknown;
  LocalTimeZone?: unknown;
  ReportingArea?: unknown;
  StateCode?: unknown;
  ParameterName?: unknown;
  AQI?: unknown;
  Category?: { Number?: unknown; Name?: unknown };
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function severityForAqi(aqi: number): string {
  if (aqi >= 301) return 'Extreme';
  if (aqi >= 151) return 'Severe';
  if (aqi >= 101) return 'Moderate';
  return 'Minor';
}

@Injectable()
export class AirNowFeedsProvider {
  private readonly fetchFn: FetchFn;
  private readonly apiKey: string;
  private lastSummaryValue: string | null = null;

  constructor(
    @Optional() @Inject(FEEDS_FETCH) fetchFn?: FetchFn,
    @Optional()
    @Inject('AIRNOW_CREDS')
    creds?: { apiKey: string },
  ) {
    this.fetchFn = fetchFn ?? globalThis.fetch;
    this.apiKey = creds?.apiKey ?? process.env.AIRNOW_API_KEY ?? '';
  }

  get configured(): boolean {
    return this.apiKey.length > 0;
  }

  /** Última lectura verificada en una línea, o null si aún no hay ninguna. */
  lastSummary(): string | null {
    return this.lastSummaryValue;
  }

  private async fetchRecords(url: string): Promise<AirNowRecord[]> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await this.fetchFn(url, {
        headers: { 'User-Agent': UA },
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as unknown;
      return Array.isArray(data) ? (data as AirNowRecord[]) : [];
    } finally {
      clearTimeout(t);
    }
  }

  private toAlert(r: AirNowRecord, forecast: boolean): OfficialAlert | null {
    const aqi = num(r.AQI);
    if (aqi === null || aqi <= 100) return null;
    const category = str(r.Category?.Name, 'Unhealthy for Sensitive Groups');
    const param = str(r.ParameterName, 'air quality');
    const area = `${str(r.ReportingArea, 'Reporting area')}${str(r.StateCode) ? `, ${str(r.StateCode)}` : ''}`;
    const when = forecast ? `Forecast ${str(r.DateForecast, 'unknown date')}: ` : '';
    return {
      event: `Air quality ${category} (AQI ${aqi})`,
      severity: severityForAqi(aqi),
      headline: `${when}AirNow reports AQI ${aqi} (${category}) for ${param} in ${area}.`,
      area,
      starts: null,
      ends: null,
      source: 'AirNow',
      url: 'https://www.airnow.gov/',
    };
  }

  async liveEvents(lat: number, lon: number): Promise<OfficialAlert[]> {
    if (!this.configured) throw new Error(AIRNOW_NOT_CONFIGURED);
    const qs =
      `?format=application/json&latitude=${lat}&longitude=${lon}` +
      `&distance=${RADIUS_MILES}&API_KEY=${encodeURIComponent(this.apiKey)}`;
    const [obs, forecast] = await Promise.all([
      this.fetchRecords(`${OBS_URL}${qs}`),
      this.fetchRecords(`${FORECAST_URL}${qs}`),
    ]);
    const out: OfficialAlert[] = [];
    let best: { aqi: number; category: string } | null = null;
    for (const r of obs) {
      const aqi = num(r.AQI);
      if (aqi !== null && (!best || aqi > best.aqi)) {
        best = { aqi, category: str(r.Category?.Name, '') };
      }
      const alert = this.toAlert(r, false);
      if (alert) out.push(alert);
    }
    for (const r of forecast) {
      const alert = this.toAlert(r, true);
      if (alert) out.push(alert);
    }
    this.lastSummaryValue = best
      ? `AQI ${best.aqi}${best.category ? ` (${best.category})` : ''}`
      : 'no stations reporting nearby';
    return out;
  }
}
